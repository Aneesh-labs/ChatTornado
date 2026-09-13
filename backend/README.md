# Chat Tornado — Backend Architecture & File Documentation

This document provides a comprehensive, file-by-file technical breakdown of the entire **Chat Tornado** backend (`C:\Users\samos\Desktop\tools\Projects\chat-tornado\backend`).

---

## 1. System Architecture Overview

The backend is built with **FastAPI**, **SQLAlchemy**, **WebSockets**, and **Pydantic**, designed for secure, low-latency, real-time messaging and peer-to-peer media communication.

- **Framework**: FastAPI (Asynchronous ASGI application)
- **Database ORM**: SQLAlchemy 2.0 (PostgreSQL / SQLite compatible)
- **Authentication**: JWT Access Tokens (HS256) + Opaque Database-Backed Refresh Tokens with Rotation & Revocation
- **Real-Time Layer**: Native WebSockets with live presence tracking, typing indicators, and WebRTC signaling
- **Ghost Chat**: In-memory, zero-disk RAM ephemeral messaging protocol
- **Media Engine**: Streaming multi-part upload pipeline with automatic FFmpeg / FFprobe video transcoding, WebP thumbnail generation, and HEIC conversion
- **Traffic Protection**: In-memory & Redis sliding-window rate limiting

---

## 2. File-by-File Breakdown

### 1. `main.py` — Application Entry Point
- **Purpose**: Initializes the FastAPI application instance, configures global middlewares, binds database models, registers route modules, and mounts the static file server.
- **Key Responsibilities**:
  - Automatically creates database tables on startup via `Base.metadata.create_all(bind=engine)`.
  - Configures `CORSMiddleware` to allow cross-origin requests from frontend clients and LAN devices.
  - Mounts all modular API routers (`auth_router`, `user_router`, `message_router`, `websocket_router`, `upload_router`).
  - Mounts `/uploads` to serve uploaded media files directly as static assets.
  - Exposes the health check root endpoint `GET /`.

---

### 2. `config.py` — Centralized Settings & Environment Configuration
- **Purpose**: Loads and validates environment variables using a cached `@dataclass` (`Settings`).
- **Key Configurations**:
  - **Database & Cache**: `DATABASE_URL`, `REDIS_URL`.
  - **JWT Lifespans**: `ACCESS_TOKEN_EXPIRE_MINUTES` (default 30m), `REFRESH_TOKEN_EXPIRE_DAYS` (default 7d).
  - **Media Limits**: `MAX_UPLOAD_SIZE` (25 MB default, overridden to 1 GB in streaming routes), `MAX_CHUNK_SIZE`.
  - **Rate Limiting**: `RATE_LIMIT_ENABLED`, `RATE_LIMIT_USE_REDIS`.
  - **WebSockets**: `WS_HEARTBEAT_INTERVAL` (30s), `WS_CONNECTION_TIMEOUT` (300s).
  - **CORS**: `CORS_ORIGINS` parsing into a list of allowed origins.

---

### 3. `database.py` — Database Engine & Session Management
- **Purpose**: Establishes the SQLAlchemy engine and provides request-scoped database sessions.
- **Key Components**:
  - `engine`: Created with connection health checks (`pool_pre_ping=True`) and connection recycling (`pool_recycle=300`).
  - `Base`: `DeclarativeBase` subclass from which all ORM models inherit.
  - `SessionLocal`: Factory for creating database sessions with explicit transaction controls (`autocommit=False`, `autoflush=False`).
  - `get_db()`: FastAPI dependency yielding a clean database session that automatically closes upon request completion.

---

### 4. `models.py` — SQLAlchemy Database Schemas
- **Purpose**: Defines the relational database schema and table relationships.
- **Models**:
  1. **`User` (`users`)**:
     - Fields: `id`, `username`, `email`, `password` (bcrypt hash), `avatar_url`, `status` (`online`/`offline`/etc.), `last_seen`, `last_login`, `created_at`.
     - Relationships: `sent_messages` and `received_messages`.
  2. **`Message` (`messages`)**:
     - Fields: `id`, `sender_id`, `receiver_id`, `message` (text/content), `created_at`, `read_state` (`sent`/`delivered`/`read`).
     - Relationships: Foreign keys to `User`, cascade relationship to `MessageVisibility`.
  3. **`MessageVisibility` (`message_visibility`)**:
     - Granular per-user visibility table enabling WhatsApp/Telegram-style "Delete for Me" and "Delete for Everyone" without breaking chat history for the other participant.
     - Enforces uniqueness per `(message_id, user_id)`.
  4. **`RefreshToken` (`refresh_tokens`)**:
     - Manages opaque refresh tokens with `token_id`, `user_id`, `expires_at`, `revoked` flag, `revoked_at` timestamp, `client_fingerprint`, and `previous_token_id` for token rotation chains.

---

### 5. `schemas.py` — Pydantic Validation & Serialization Models
- **Purpose**: Defines request and response validation contracts across the API.
- **Key Schema Categories**:
  - **Authentication**: `SignupData` (with username regex and 10+ char password validation), `LoginData`, `RefreshTokenData`, `LogoutData`, `EmailVerificationData`, `ResetPasswordData`, `ForgotPasswordData`.
  - **Messages**: `MessageType` enum (`text`, `image`, `video`, `file`, `voice`, `location`, `contact`), `MessageData`, `MessageResponse`, `MessageDeleteData`, `ChatDeleteData`, `MessageReactionData`.
  - **Users**: `UserStatus` enum, `UserResponse`, `UserUpdateData`.
  - **WebSockets & WebRTC**: `WebSocketMessage`, `TypingData`, `ReadReceiptData`, `CallType` enum (`voice`, `video`), `CallSignalData` (relaying SDP & ICE candidates), `CallResponse`.
  - **Media & Pagination**: `FileUploadResponse`, `MessageSearchData`, `PaginatedResponse`.

---

### 6. `auth.py` — Security Core, Token Lifecycle & Password Hashing
- **Purpose**: Handles cryptographic operations, JWT creation, token rotation, and security enforcement.
- **Key Functions**:
  - `hash_password(password)` / `verify_password(plain, hash)`: Bcrypt hashing with 12 rounds.
  - `create_access_token(data, expires_delta)`: Creates short-lived signed JWT access tokens with `exp`, `iat`, `type`, and `jti`.
  - `create_refresh_token_id()`: Generates cryptographically secure 32-byte opaque tokens for database storage.
  - `decode_token(token)`: Validates JWT signature, expiration, and payload integrity.
  - `rotate_refresh_token(old_token_id, db_session)`: Revokes the old token and issues a new linked token in a single atomic transaction.
  - `revoke_refresh_token()` / `revoke_all_user_refresh_tokens()`: Immediate revocation on logout or security breach.
  - `ensure_production_security()`: Validates that `SECRET_KEY` is not default or weak in production environments.

---

### 7. `auth_routes.py` — Authentication Endpoints
- **Purpose**: Handles user registration, authentication, token refresh, and session verification.
- **Endpoints**:
  - `POST /signup`: Validates username uniqueness, email format, and password strength; stores hashed password in `users`.
  - `POST /login`: Validates credentials, updates `last_login`, creates a JWT access token and a database refresh token.
  - `POST /refresh`: Validates refresh token from database, verifies expiration and revocation state, rotates the refresh token, and returns a new access token.
  - `POST /logout`: Marks the refresh token as revoked in the database.
  - `GET /verify`: Validates an access token and returns user identity metadata.

---

### 8. `user_routes.py` — User Discovery & Presence Endpoints
- **Purpose**: Allows authenticated users to find chat contacts and inspect online presence.
- **Endpoints**:
  - `GET /users`: Lists all registered users excluding the current user.
  - `GET /user/{user_id}`: Retrieves public details for a specific user ID.
  - `GET /search-users`: Case-insensitive substring search across usernames and emails with limit constraints.
  - `GET /online-users`: Returns an active list of user IDs currently connected to the WebSocket pool.

---

### 9. `message_routes.py` — Message History & Deletion Endpoints
- **Purpose**: Provides chat history queries and granular message deletion.
- **Endpoints**:
  - `GET /messages/{other_user_id}`: Returns chronological chat history between two users where `MessageVisibility.visible == True` for the requesting user.
  - `POST /delete_message/{message_id}`: Supports 3 deletion modes:
    - `"me"`: Sets `visible = False` only for the requesting user's record.
    - `"receiver"`: Sets `visible = False` only for the recipient (sender-only permission).
    - `"both"`: Sets `visible = False` for both users (Delete for Everyone).
  - `POST /delete_chat/{other_user_id}`: Hides all existing messages in a conversation for the requesting user.
  - `POST /delete_all_chats`: Clears all chat conversations for the requesting user.

---

### 10. `websocket_manager.py` — Connection Pools & Ghost Session Manager
- **Purpose**: Maintains in-memory real-time state for connected clients.
- **Key Classes**:
  1. **`ConnectionManager`**:
     - `active_connections`: Dictionary mapping `user_id -> WebSocket`.
     - `connect(user_id, websocket)` / `disconnect(user_id)`: Registers and deregisters active sockets.
     - `send_personal_message(receiver_id, message)`: Delivers real-time JSON packets directly to a specific user.
     - `broadcast_online_users()`: Broadcasts updated online user lists to all connected sockets, pruning dead connections.
  2. **`GhostSessionManager`**:
     - Manages temporary, RAM-only ephemeral chat rooms between pairs of users.
     - Generates sorted tuple keys `(user1, user2)` ensuring one session per pair.
     - Completely decoupled from the database—data evaporates on disconnect.

---

### 11. `websocket_routes.py` — Real-Time WebSocket Protocol & WebRTC Relay
- **Purpose**: Implements the bidirectional `/ws` socket endpoint.
- **Protocol Handlers**:
  - **Connection Auth**: Verifies `?token=` query parameter via `decode_token` before accepting connection.
  - **WebRTC Signaling (`type: "signal"`)**: Relays SDP offers/answers and ICE candidates directly between peers for end-to-end encrypted voice/video calls (media bypasses the server).
  - **Ghost Chat Protocol**:
    - `ghost_start` -> Creates in-RAM session and sends `ghost_invite` to receiver.
    - `ghost_accept` -> Confirms session with `ghost_connected`.
    - `ghost_message` -> Delivers message without writing to the database.
    - `ghost_typing` / `ghost_stop_typing` -> Real-time typing status in ghost mode.
    - `ghost_close` -> Destroys in-memory session.
  - **Standard Messaging (`type: "message"`)**: Persists message to `messages` table, creates `MessageVisibility` records for both parties, and echoes the message payload to both sender and receiver.
  - **Typing Indicators (`type: "typing_start"` / `"typing_stop"`)**: Relays real-time typing events.

---

### 12. `upload_routes.py` — Media Ingestion & Processing Pipeline
- **Purpose**: Handles streaming file uploads up to 1 GB with automatic media validation and transcoding.
- **Key Features**:
  - **Cross-Platform Binary Detection**: Locates system `ffmpeg` and `ffprobe` (or bundled binaries).
  - **MIME & Extension Security**: Multi-tier whitelist validating images, videos, audio, text, archives, and documents.
  - **Chunked Streaming**: Streams uploads in 8 MB chunks with a hard 1 GB ceiling to prevent memory exhaustion.
  - **HEIC / HEIF Conversion**: Automatically converts Apple HEIC/HEIF images into compressed WebP previews using Pillow + `pillow_heif`.
  - **Video Transcoding Engine**:
    - Analyzes video containers and codecs via `ffprobe`.
    - Automatically transcodes non-browser-compatible videos (e.g. MKV, AVI, WMV) to fast-start H.264 / AAC MP4 via `ffmpeg` (`-c:v libx264 -crf 23 -pix_fmt yuv420p -c:a aac -movflags +faststart`).
    - Generates WebP video thumbnails at keyframe timestamps.
  - **Rich Metadata Response**: Returns file URL, thumbnail URL, dimensions, duration, FPS, codecs, and container type.

---

### 13. `rate_limiter.py` — Multi-Tier Rate Limiting Subsystem
- **Purpose**: Protects auth, messaging, and upload routes from brute-force and DDoS attacks.
- **Features**:
  - **Algorithms**: Sliding Window, Token Bucket, and Leaky Bucket.
  - **Backends**: `InMemoryRateLimiter` (with automatic asyncio cleanup loop) and `RedisRateLimiter` (for distributed deployments).
  - **Pre-Configured Limiters**:
    - `LOGIN_LIMITER`: 10 attempts per 5 minutes.
    - `SIGNUP_LIMITER`: 5 attempts per 5 minutes.
    - `MESSAGE_LIMITER`: 30 messages per minute.
    - `FILE_UPLOAD_LIMITER`: 10 uploads per hour.
    - `API_LIMITER`: 100 requests per minute.
  - **Decorators**: `@rate_limit(max_requests, window_seconds)` for easy endpoint decoration.

---

## 3. Data Flow Architecture

```
[ Frontend Client (React 19) ]
         │
         ├─── HTTP / REST ───► [ auth_routes.py / user_routes.py / message_routes.py ]
         │                               │
         │                               ├──► [ auth.py ] ──► JWT / Password Hashing
         │                               └──► [ database.py ] ──► PostgreSQL / SQLite
         │
         ├─── WebSockets ────► [ websocket_routes.py ]
         │                               │
         │                               ├──► [ websocket_manager.py ] ──► Active Connections Pool
         │                               ├──► WebRTC Signaling (Direct Peer Relay)
         │                               ├──► Ghost Chat (In-Memory Ephemeral)
         │                               └──► Persistent Chat (Writes to DB + Visibility)
         │
         └─── Multipart Upload ► [ upload_routes.py ]
                                         │
                                         ├──► MIME & Extension Validation
                                         ├──► FFmpeg / FFprobe Video Transcoder (H.264/AAC)
                                         ├──► Pillow HEIC -> WebP Converter
                                         └──► Static Storage (/uploads)
```

---

## 4. Environment Variables Reference (`.env`)

| Variable | Description | Default / Example |
|---|---|---|
| `DATABASE_URL` | SQLAlchemy database connection string | `postgresql://postgres:password@localhost:5432/chat_tornado` |
| `SECRET_KEY` | Secret key used for signing JWT access tokens | `your-secret-key-32-chars-minimum` |
| `REFRESH_SECRET_KEY` | Secret key used for refresh token signing (optional) | `${SECRET_KEY}_refresh` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifespan in minutes | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifespan in days | `7` |
| `UPLOAD_DIR` | Directory path where uploaded files are stored | `./uploads` |
| `MAX_UPLOAD_SIZE` | Maximum upload size in bytes | `1073741824` (1 GB) |
| `REDIS_URL` | Redis connection URL for distributed rate limiting | `redis://localhost:6379/0` (Optional) |
| `RATE_LIMIT_ENABLED` | Enable or disable rate limiting | `true` |
| `CORS_ORIGINS` | Comma-separated list of allowed frontend origins | `http://localhost:5173,http://localhost:3000` |
