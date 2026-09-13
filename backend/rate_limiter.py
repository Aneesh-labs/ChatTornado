# 📁 rate_limiter.py
# Complete rate limiting system for ChatTornado
# Supports in-memory, Redis, and hybrid approaches

import time
import asyncio
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple, Any, Callable, Union
from collections import defaultdict, deque
from enum import Enum

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

logger = logging.getLogger(__name__)


# ============================================================================
# Enums & Constants
# ============================================================================

class RateLimitType(str, Enum):
    """Types of rate limits"""
    MESSAGE = "message"
    LOGIN = "login"
    SIGNUP = "signup"
    FILE_UPLOAD = "file_upload"
    WEBSOCKET = "websocket"
    API = "api"
    VERIFICATION = "verification"
    PASSWORD_RESET = "password_reset"


class RateLimitStrategy(str, Enum):
    """Rate limiting strategies"""
    FIXED_WINDOW = "fixed_window"
    SLIDING_WINDOW = "sliding_window"
    TOKEN_BUCKET = "token_bucket"
    LEAKY_BUCKET = "leaky_bucket"


# ============================================================================
# Base Rate Limiter
# ============================================================================

class BaseRateLimiter:
    """Base class for all rate limiters"""
    
    def __init__(self, max_requests: int, window_seconds: int, strategy: RateLimitStrategy = RateLimitStrategy.SLIDING_WINDOW):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.strategy = strategy
        
    def allow_request(self, key: str) -> bool:
        """Check if request is allowed - to be overridden"""
        raise NotImplementedError
    
    def get_remaining(self, key: str) -> int:
        """Get remaining requests for key - to be overridden"""
        raise NotImplementedError
    
    def get_reset_time(self, key: str) -> Optional[datetime]:
        """Get time when limit resets - to be overridden"""
        raise NotImplementedError
    
    def get_stats(self, key: str) -> Dict[str, Any]:
        """Get statistics for a key - to be overridden"""
        raise NotImplementedError
    
    def reset_key(self, key: str) -> None:
        """Reset rate limit for a specific key - to be overridden"""
        raise NotImplementedError
    
    def reset_all(self) -> None:
        """Reset all rate limits - to be overridden"""
        raise NotImplementedError


# ============================================================================
# In-Memory Rate Limiter (Sliding Window)
# ============================================================================

class InMemoryRateLimiter(BaseRateLimiter):
    """
    In-memory rate limiter using sliding window algorithm.
    Thread-safe with asyncio lock.
    """
    
    def __init__(self, max_requests: int, window_seconds: int):
        super().__init__(max_requests, window_seconds)
        self._requests: Dict[str, deque] = defaultdict(deque)
        self._lock = asyncio.Lock()
        self._cleanup_task: Optional[asyncio.Task] = None
        self._running = False
        
    async def _cleanup(self):
        """Periodically clean expired entries"""
        self._running = True
        while self._running:
            try:
                await asyncio.sleep(60)  # Clean every minute
                async with self._lock:
                    now = time.time()
                    cutoff = now - self.window_seconds
                    
                    for key in list(self._requests.keys()):
                        # Remove expired timestamps
                        while self._requests[key] and self._requests[key][0] < cutoff:
                            self._requests[key].popleft()
                        
                        # Remove empty keys
                        if not self._requests[key]:
                            del self._requests[key]
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Rate limiter cleanup error: {e}")
    
    def start_cleanup(self):
        """Start the cleanup task if an event loop is running."""
        if self._cleanup_task is not None and not self._cleanup_task.done():
            return
            
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            # No running event loop yet - we'll start later
            # Create a new event loop for the cleanup task
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                self._cleanup_task = loop.create_task(self._cleanup())
                logger.info("Started rate limiter cleanup task in new event loop")
            except Exception as e:
                logger.warning(f"Could not start cleanup task: {e}")
            return
        
        self._cleanup_task = loop.create_task(self._cleanup())
        logger.info("Started rate limiter cleanup task")
    
    def stop_cleanup(self):
        """Stop background cleanup task"""
        self._running = False
        if self._cleanup_task:
            self._cleanup_task.cancel()
            self._cleanup_task = None
            logger.info("Stopped rate limiter cleanup task")
    
    async def allow_request_async(self, key: str) -> bool:
        """Async version of allow_request"""
        async with self._lock:
            return self._allow_request_sync(key)
    
    def _allow_request_sync(self, key: str) -> bool:
        """Sync version of allow_request (for internal use)"""
        now = time.time()
        cutoff = now - self.window_seconds
        
        # Clean old requests for this key
        if key in self._requests:
            while self._requests[key] and self._requests[key][0] < cutoff:
                self._requests[key].popleft()
        else:
            self._requests[key] = deque()
        
        # Check limit
        if len(self._requests[key]) >= self.max_requests:
            return False
        
        # Add current request
        self._requests[key].append(now)
        return True
    
    def allow_request(self, key: str) -> bool:
        """Synchronous allow_request (for non-async contexts)"""
        return self._allow_request_sync(key)
    
    def get_remaining(self, key: str) -> int:
        """Get remaining requests for key"""
        now = time.time()
        cutoff = now - self.window_seconds
        
        if key not in self._requests:
            return self.max_requests
        
        # Count valid requests
        count = sum(1 for t in self._requests[key] if t >= cutoff)
        return max(0, self.max_requests - count)
    
    def get_reset_time(self, key: str) -> Optional[datetime]:
        """Get time when the oldest request expires"""
        if key not in self._requests or not self._requests[key]:
            return datetime.now(timezone.utc) + timedelta(seconds=self.window_seconds)
        
        oldest = self._requests[key][0]
        reset_timestamp = oldest + self.window_seconds
        return datetime.fromtimestamp(reset_timestamp, tz=timezone.utc)
    
    def get_stats(self, key: str) -> Dict[str, Any]:
        """Get statistics for a key"""
        now = time.time()
        cutoff = now - self.window_seconds
        
        if key not in self._requests:
            return {
                "key": key,
                "total_requests": 0,
                "remaining": self.max_requests,
                "window_seconds": self.window_seconds,
                "reset_at": datetime.now(timezone.utc) + timedelta(seconds=self.window_seconds),
                "strategy": self.strategy.value
            }
        
        valid_requests = [t for t in self._requests[key] if t >= cutoff]
        total = len(valid_requests)
        
        return {
            "key": key,
            "total_requests": total,
            "remaining": max(0, self.max_requests - total),
            "window_seconds": self.window_seconds,
            "reset_at": self.get_reset_time(key),
            "oldest_request": datetime.fromtimestamp(valid_requests[0], tz=timezone.utc) if valid_requests else None,
            "strategy": self.strategy.value
        }
    
    def reset_key(self, key: str) -> None:
        """Reset rate limit for a specific key"""
        if key in self._requests:
            del self._requests[key]
    
    def reset_all(self) -> None:
        """Reset all rate limits"""
        self._requests.clear()
        logger.info("Reset all in-memory rate limits")


# ============================================================================
# Redis Rate Limiter (Production)
# ============================================================================

class RedisRateLimiter(BaseRateLimiter):
    """
    Redis-backed rate limiter for distributed systems.
    Uses Lua scripts for atomic operations.
    """
    
    LUA_SCRIPT = """
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local max_requests = tonumber(ARGV[3])
        local cutoff = now - window
        
        -- Remove old entries
        redis.call('ZREMRANGEBYSCORE', key, 0, cutoff)
        
        -- Get current count
        local count = redis.call('ZCARD', key)
        
        -- Check if allowed
        if count < max_requests then
            -- Add current request
            redis.call('ZADD', key, now, now .. ':' .. math.random())
            redis.call('EXPIRE', key, window)
            return {1, count + 1, max_requests - (count + 1)}
        else
            return {0, count, max_requests - count}
        end
    """
    
    def __init__(
        self,
        max_requests: int,
        window_seconds: int,
        redis_client: Optional['redis.Redis'] = None,
        redis_url: Optional[str] = None,
        prefix: str = "ratelimit:"
    ):
        super().__init__(max_requests, window_seconds)
        
        if not REDIS_AVAILABLE:
            raise ImportError("redis package is not installed. Install with: pip install redis")
        
        self.prefix = prefix
        
        # Connect to Redis
        if redis_client:
            self.redis = redis_client
        elif redis_url:
            self.redis = redis.from_url(redis_url, decode_responses=True)
        else:
            raise ValueError("Either redis_client or redis_url must be provided")
        
        # Load Lua script
        self.lua_script = self.redis.register_script(self.LUA_SCRIPT)
    
    def _get_key(self, key: str) -> str:
        """Generate Redis key with prefix"""
        # Hash the key to prevent very long keys
        key_hash = hashlib.sha256(key.encode()).hexdigest()[:16]
        return f"{self.prefix}{key_hash}"
    
    def allow_request(self, key: str) -> bool:
        """Check if request is allowed using Redis"""
        try:
            redis_key = self._get_key(key)
            now = time.time()
            
            # Execute Lua script atomically
            result = self.lua_script(
                keys=[redis_key],
                args=[now, self.window_seconds, self.max_requests]
            )
            
            # result = [allowed, current_count, remaining]
            if result and len(result) == 3:
                allowed = result[0] == 1
                return allowed
            
            return False
            
        except Exception as e:
            logger.error(f"Redis rate limiter error: {e}")
            # Fail open (allow request) to avoid blocking users during Redis issues
            # For security-critical endpoints, fail closed
            return True
    
    def get_remaining(self, key: str) -> int:
        """Get remaining requests for key"""
        try:
            redis_key = self._get_key(key)
            now = time.time()
            cutoff = now - self.window_seconds
            
            # Remove old entries
            self.redis.zremrangebyscore(redis_key, 0, cutoff)
            
            # Get current count
            count = self.redis.zcard(redis_key)
            return max(0, self.max_requests - count)
            
        except Exception as e:
            logger.error(f"Redis get_remaining error: {e}")
            return self.max_requests
    
    def get_reset_time(self, key: str) -> Optional[datetime]:
        """Get time when limit resets"""
        try:
            redis_key = self._get_key(key)
            
            # Get oldest timestamp
            oldest = self.redis.zrange(redis_key, 0, 0, withscores=True)
            if oldest:
                timestamp = float(oldest[0][1])
                reset_timestamp = timestamp + self.window_seconds
                return datetime.fromtimestamp(reset_timestamp, tz=timezone.utc)
            
            return datetime.now(timezone.utc) + timedelta(seconds=self.window_seconds)
            
        except Exception as e:
            logger.error(f"Redis get_reset_time error: {e}")
            return None
    
    def get_stats(self, key: str) -> Dict[str, Any]:
        """Get statistics for a key"""
        try:
            redis_key = self._get_key(key)
            now = time.time()
            cutoff = now - self.window_seconds
            
            # Remove old entries
            self.redis.zremrangebyscore(redis_key, 0, cutoff)
            
            # Get count
            count = self.redis.zcard(redis_key)
            
            # Get oldest timestamp
            oldest = self.redis.zrange(redis_key, 0, 0, withscores=True)
            oldest_time = oldest[0][1] if oldest else None
            
            return {
                "key": key,
                "total_requests": count,
                "remaining": max(0, self.max_requests - count),
                "window_seconds": self.window_seconds,
                "reset_at": self.get_reset_time(key),
                "oldest_request": datetime.fromtimestamp(float(oldest_time), tz=timezone.utc) if oldest_time else None,
                "strategy": self.strategy.value,
                "backend": "redis"
            }
            
        except Exception as e:
            logger.error(f"Redis get_stats error: {e}")
            return {"key": key, "error": str(e)}
    
    def reset_key(self, key: str) -> None:
        """Reset rate limit for a specific key"""
        try:
            redis_key = self._get_key(key)
            self.redis.delete(redis_key)
        except Exception as e:
            logger.error(f"Redis reset_key error: {e}")
    
    def reset_all(self) -> None:
        """Reset all rate limits (dangerous - use with caution)"""
        try:
            pattern = f"{self.prefix}*"
            keys = self.redis.keys(pattern)
            if keys:
                self.redis.delete(*keys)
                logger.info(f"Reset {len(keys)} Redis rate limit keys")
        except Exception as e:
            logger.error(f"Redis reset_all error: {e}")


# ============================================================================
# WebSocket Rate Limiter (Specialized)
# ============================================================================

class WebSocketRateLimiter:
    """
    Specialized rate limiter for WebSocket connections.
    Tracks messages per user and provides real-time feedback.
    """
    
    def __init__(
        self,
        max_messages: int = 30,
        window_seconds: int = 60,
        use_redis: bool = False,
        redis_url: Optional[str] = None,
        redis_client: Optional['redis.Redis'] = None
    ):
        self.max_messages = max_messages
        self.window_seconds = window_seconds
        self.use_redis = use_redis and REDIS_AVAILABLE
        
        # Initialize appropriate backend
        if self.use_redis:
            try:
                self.backend = RedisRateLimiter(
                    max_requests=max_messages,
                    window_seconds=window_seconds,
                    redis_client=redis_client,
                    redis_url=redis_url,
                    prefix="ws_ratelimit:"
                )
                logger.info("WebSocketRateLimiter using Redis backend")
            except Exception as e:
                logger.warning(f"Failed to initialize Redis rate limiter: {e}. Falling back to in-memory.")
                self.backend = InMemoryRateLimiter(max_messages, window_seconds)
                self.use_redis = False
        else:
            self.backend = InMemoryRateLimiter(max_messages, window_seconds)
            logger.info("WebSocketRateLimiter using in-memory backend")
    
    def start_cleanup(self):
        """Start the cleanup task for in-memory backend"""
        if isinstance(self.backend, InMemoryRateLimiter):
            self.backend.start_cleanup()
    
    def stop_cleanup(self):
        """Stop the cleanup task for in-memory backend"""
        if isinstance(self.backend, InMemoryRateLimiter):
            self.backend.stop_cleanup()
    
    def allow_message(self, key: Union[str, int]) -> bool:
        """Check if a user can send a message"""
        if isinstance(key, int):
            key = f"user:{key}"
        return self.backend.allow_request(key)
    
    def get_remaining(self, key: Union[str, int]) -> int:
        """Get remaining messages for a user"""
        if isinstance(key, int):
            key = f"user:{key}"
        return self.backend.get_remaining(key)
    
    def get_reset_time(self, key: Union[str, int]) -> Optional[datetime]:
        """Get time when limit resets for a user"""
        if isinstance(key, int):
            key = f"user:{key}"
        return self.backend.get_reset_time(key)
    
    def get_stats(self, key: Union[str, int]) -> Dict[str, Any]:
        """Get rate limit statistics for a user"""
        if isinstance(key, int):
            key = f"user:{key}"
        stats = self.backend.get_stats(key)
        # Extract user_id from key
        if isinstance(key, str) and ":" in key:
            user_id = key.split(":")[1]
            stats["user_id"] = user_id
        stats["max_messages"] = self.max_messages
        stats["window_seconds"] = self.window_seconds
        stats["backend"] = "redis" if self.use_redis else "memory"
        return stats
    
    def reset_user(self, key: Union[str, int]) -> None:
        """Reset rate limit for a specific user"""
        if isinstance(key, int):
            key = f"user:{key}"
        self.backend.reset_key(key)
    
    def reset_all(self) -> None:
        """Reset all rate limits"""
        self.backend.reset_all()


# ============================================================================
# Multi-Tier Rate Limiter
# ============================================================================

class MultiTierRateLimiter:
    """
    Rate limiter with multiple tiers (user-level, IP-level, global).
    Applies the most restrictive limit.
    """
    
    def __init__(
        self,
        user_limit: int = 30,
        ip_limit: int = 100,
        global_limit: int = 1000,
        window_seconds: int = 60,
        use_redis: bool = False,
        redis_url: Optional[str] = None,
        redis_client: Optional['redis.Redis'] = None
    ):
        self.window_seconds = window_seconds
        self.user_limit = user_limit
        self.ip_limit = ip_limit
        self.global_limit = global_limit
        
        # Create limiters for each tier
        limiter_kwargs = {
            "max_messages": user_limit,
            "window_seconds": window_seconds,
            "use_redis": use_redis,
            "redis_url": redis_url,
            "redis_client": redis_client
        }
        
        self.user_limiter = WebSocketRateLimiter(**limiter_kwargs)
        
        limiter_kwargs["max_messages"] = ip_limit
        self.ip_limiter = WebSocketRateLimiter(**limiter_kwargs)
        
        # Track global count manually for efficiency
        self._global_count = 0
        self._global_reset = time.time() + window_seconds
        self._lock = asyncio.Lock()
    
    def start_cleanup(self):
        """Start cleanup tasks for all limiters"""
        self.user_limiter.start_cleanup()
        self.ip_limiter.start_cleanup()
    
    def stop_cleanup(self):
        """Stop cleanup tasks for all limiters"""
        self.user_limiter.stop_cleanup()
        self.ip_limiter.stop_cleanup()
    
    async def allow_request(self, user_id: int, ip_address: str) -> Tuple[bool, Dict[str, int]]:
        """
        Check if request is allowed across all tiers.
        Returns (allowed, {remaining_user, remaining_ip, remaining_global})
        """
        async with self._lock:
            # Check all tiers
            user_allowed = self.user_limiter.allow_message(user_id)
            ip_allowed = self.ip_limiter.allow_message(ip_address)
            
            # Global check
            now = time.time()
            if now >= self._global_reset:
                self._global_count = 0
                self._global_reset = now + self.window_seconds
            
            global_allowed = self._global_count < self.global_limit
            
            allowed = user_allowed and ip_allowed and global_allowed
            
            # Calculate remaining
            remaining = {
                "user": self.user_limiter.get_remaining(user_id) if user_allowed else 0,
                "ip": self.ip_limiter.get_remaining(ip_address) if ip_allowed else 0,
                "global": self.global_limit - self._global_count if global_allowed else 0
            }
            
            if allowed:
                self._global_count += 1
            
            return allowed, remaining
    
    def get_stats(self, user_id: int, ip_address: str) -> Dict[str, Any]:
        """Get statistics for all tiers"""
        return {
            "user": self.user_limiter.get_stats(user_id),
            "ip": self.ip_limiter.get_stats(ip_address),
            "global": {
                "total_requests": self._global_count,
                "remaining": max(0, self.global_limit - self._global_count),
                "window_seconds": self.window_seconds,
                "reset_at": datetime.fromtimestamp(self._global_reset, tz=timezone.utc),
                "limit": self.global_limit
            }
        }
    
    def reset_user(self, user_id: int) -> None:
        """Reset rate limit for a specific user"""
        self.user_limiter.reset_user(user_id)
    
    def reset_ip(self, ip_address: str) -> None:
        """Reset rate limit for a specific IP"""
        self.ip_limiter.reset_user(ip_address)
    
    def reset_all(self) -> None:
        """Reset all rate limits"""
        self.user_limiter.reset_all()
        self.ip_limiter.reset_all()
        self._global_count = 0
        self._global_reset = time.time() + self.window_seconds


# ============================================================================
# Rate Limiter Factory
# ============================================================================

class RateLimiterFactory:
    """Factory for creating rate limiters with consistent configuration"""
    
    _instances: Dict[str, BaseRateLimiter] = {}
    _default_config = {
        "max_requests": 60,
        "window_seconds": 60,
        "use_redis": False,
        "redis_url": None,
        "redis_client": None
    }
    
    @classmethod
    def get_limiter(
        cls,
        name: str,
        max_requests: Optional[int] = None,
        window_seconds: Optional[int] = None,
        use_redis: Optional[bool] = None,
        redis_url: Optional[str] = None,
        redis_client: Optional['redis.Redis'] = None
    ) -> BaseRateLimiter:
        """Get or create a rate limiter by name"""
        if name in cls._instances:
            return cls._instances[name]
        
        # Use default values if not provided
        max_requests = max_requests or cls._default_config["max_requests"]
        window_seconds = window_seconds or cls._default_config["window_seconds"]
        use_redis = use_redis if use_redis is not None else cls._default_config["use_redis"]
        redis_url = redis_url or cls._default_config["redis_url"]
        redis_client = redis_client or cls._default_config["redis_client"]
        
        # Create appropriate limiter
        if use_redis and REDIS_AVAILABLE and (redis_url or redis_client):
            limiter = RedisRateLimiter(
                max_requests=max_requests,
                window_seconds=window_seconds,
                redis_client=redis_client,
                redis_url=redis_url
            )
        else:
            limiter = InMemoryRateLimiter(
                max_requests=max_requests,
                window_seconds=window_seconds
            )
            # Start cleanup for in-memory limiter
            if isinstance(limiter, InMemoryRateLimiter):
                limiter.start_cleanup()
        
        cls._instances[name] = limiter
        logger.info(f"Created rate limiter '{name}' with {max_requests} requests per {window_seconds}s")
        return limiter
    
    @classmethod
    def reset_all(cls) -> None:
        """Reset all rate limiters"""
        for name, limiter in cls._instances.items():
            limiter.reset_all()
        logger.info("Reset all rate limiters")


# ============================================================================
# Rate Limiter Decorators
# ============================================================================

def rate_limit(
    max_requests: int = 60,
    window_seconds: int = 60,
    key_func: Optional[Callable] = None,
    use_redis: bool = False,
    redis_url: Optional[str] = None
):
    """
    Decorator for rate limiting functions.
    
    Example:
        @rate_limit(max_requests=10, window_seconds=60)
        async def send_message(request):
            ...
    """
    def decorator(func):
        # Create limiter with a unique name
        limiter_name = f"{func.__module__}.{func.__name__}"
        
        # Get or create limiter
        limiter = RateLimiterFactory.get_limiter(
            name=limiter_name,
            max_requests=max_requests,
            window_seconds=window_seconds,
            use_redis=use_redis,
            redis_url=redis_url
        )
        
        async def wrapper(*args, **kwargs):
            # Generate key
            if key_func:
                key = key_func(*args, **kwargs)
            else:
                # Default: use function name + first argument
                key = f"{limiter_name}:{str(args[0]) if args else 'default'}"
            
            # Check rate limit
            if not limiter.allow_request(key):
                remaining = limiter.get_remaining(key)
                reset_time = limiter.get_reset_time(key)
                
                raise Exception(
                    f"Rate limit exceeded. Remaining: 0, Reset at: {reset_time}"
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


# ============================================================================
# Utility Functions
# ============================================================================

def get_client_ip(request) -> str:
    """Extract client IP from request"""
    # Check for proxy headers first
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    return request.client.host if request.client else "unknown"


def get_user_key(user_id: int, action: str = "default") -> str:
    """Generate a rate limit key for a user"""
    return f"user:{user_id}:{action}"


def get_ip_key(ip: str, action: str = "default") -> str:
    """Generate a rate limit key for an IP"""
    return f"ip:{ip}:{action}"


# ============================================================================
# Pre-configured Rate Limiters
# ============================================================================

# Common rate limit configurations
MESSAGE_LIMITER = WebSocketRateLimiter(max_messages=30, window_seconds=60)
LOGIN_LIMITER = WebSocketRateLimiter(max_messages=10, window_seconds=300)  # 10 per 5 minutes
SIGNUP_LIMITER = WebSocketRateLimiter(max_messages=5, window_seconds=300)  # 5 per 5 minutes
FILE_UPLOAD_LIMITER = WebSocketRateLimiter(max_messages=10, window_seconds=3600)  # 10 per hour
VERIFICATION_LIMITER = WebSocketRateLimiter(max_messages=3, window_seconds=3600)  # 3 per hour
API_LIMITER = WebSocketRateLimiter(max_messages=100, window_seconds=60)  # 100 per minute

# ============================================================================
# Module Exports
# ============================================================================

__all__ = [
    # Classes
    'BaseRateLimiter',
    'InMemoryRateLimiter',
    'RedisRateLimiter',
    'WebSocketRateLimiter',
    'MultiTierRateLimiter',
    'RateLimiterFactory',
    
    # Enums
    'RateLimitType',
    'RateLimitStrategy',
    
    # Decorators
    'rate_limit',
    
    # Utilities
    'get_client_ip',
    'get_user_key',
    'get_ip_key',
    
    # Pre-configured
    'MESSAGE_LIMITER',
    'LOGIN_LIMITER',
    'SIGNUP_LIMITER',
    'FILE_UPLOAD_LIMITER',
    'VERIFICATION_LIMITER',
    'API_LIMITER',
]