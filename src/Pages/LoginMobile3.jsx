{ console.log("LoginMobile3 loaded!") }

import React, {
    useState,
    useEffect,
    useRef,
    useMemo,
    useCallback,
    createContext,
    useContext
} from 'react';
import {
    motion,
    AnimatePresence,
    useAnimation,
    useMotionValue,
    useSpring,
    useTransform,
    useReducedMotion
} from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import API from "../Services/API";
import {
    Eye,
    EyeOff,
    Wifi,
    WifiOff,
    Code,
    Activity,
    Zap,
    ChevronDown,
    Shield,
    Cpu,
    Layers,
    User,
    Lock,
    Terminal,
    Sparkles,
    Radio,
    Fingerprint,
    Circle,
    Hexagon,
    Square,
    Triangle,
    Star,
    Cloud,
    Grid,
    Microchip,
    Navigation,
    Compass,
    Radar,
    Satellite,
    Globe,
    Atom,
    Brain,
    Bluetooth,
    Smartphone,
    Laptop,
    Watch,
    Camera,
    Video,
    Music,
    Gamepad2,
    Film,
    Tv,
    Signal,
    HardDrive,
    Battery,
    BatteryCharging,
    Power,
    RefreshCw,
    RotateCw,
    RotateCcw,
    ArrowUp,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    Move,
    ZoomIn,
    ZoomOut,
    Maximize,
    Minimize,
    Settings,
    Sliders,
    Repeat,
    Shuffle,
    Play,
    Pause,
    Volume2,
    VolumeX,
    Phone,
    Mail,
    CheckCircle,
    MessageSquare,
    MessageCircle,
    Send,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    Check,
    AlertCircle,
    AlertTriangle,
    Info,
    HelpCircle,
    Loader,
    Copy,
    Clipboard,
    Folder,
    FolderOpen,
    Share,
    Share2,
    Link,
    Link2,
    ExternalLink
} from 'lucide-react';
// ============================================================================
// SYSTEM ARCHITECTURE CONFIGURATIONS
// ============================================================================

const SYSTEM_CONFIG = {
    BUILD_VERSION: "3.0.0-Mobile-Cyberpunk",
    REACT_VERSION: React.version,
    API_BASE_URL: API.defaults?.baseURL || "http://localhost:8000",
    HEARTBEAT_INTERVAL: 8000,
    IDLE_TIMEOUT_MS: 120000,
    CINEMATIC_DURATION_MS: 18000,
    MAX_PARTICLES_DEFAULT: 80,
    MAX_PARTICLES_LOW_POWER: 25,
    ACHIEVEMENT_STORAGE_KEY: 'nexus_mobile_achievements'
};

// ============================================================================
// HARDWARE INTERACTION UTILITIES
// ============================================================================

const triggerHapticFeedback = (pattern) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            // Silent fail
        }
    }
};

const useDeviceCapabilities = () => {
    const [capabilities, setCapabilities] = useState({
        isLowPowerMode: false,
        batteryLevel: 1.0,
        isCharging: true,
        supportedVibration: typeof navigator !== 'undefined' && !!navigator.vibrate,
        isMobile: /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    });

    useEffect(() => {
        let isMounted = true;
        if (typeof navigator !== 'undefined' && navigator.getBattery) {
            navigator.getBattery().then((battery) => {
                if (!isMounted) return;
                const updateBatteryInfo = () => {
                    setCapabilities(prev => ({
                        ...prev,
                        isLowPowerMode: battery.level < 0.20 && !battery.charging,
                        batteryLevel: battery.level,
                        isCharging: battery.charging
                    }));
                };
                updateBatteryInfo();
                battery.addEventListener('levelchange', updateBatteryInfo);
                battery.addEventListener('chargingchange', updateBatteryInfo);
            }).catch(() => { });
        }
        return () => { isMounted = false; };
    }, []);

    return capabilities;
};

// ============================================================================
// ACHIEVEMENT SYSTEM
// ============================================================================

const AchievementSystem = {
    achievements: {},
    listeners: [],

    init() {
        try {
            const stored = localStorage.getItem(SYSTEM_CONFIG.ACHIEVEMENT_STORAGE_KEY);
            if (stored) {
                this.achievements = JSON.parse(stored);
            }
        } catch (e) { }
    },

    save() {
        try {
            localStorage.setItem(SYSTEM_CONFIG.ACHIEVEMENT_STORAGE_KEY, JSON.stringify(this.achievements));
        } catch (e) { }
    },

    unlock(id, name, description, icon = '🏆') {
        if (this.achievements[id]) return false;
        this.achievements[id] = {
            id,
            name,
            description,
            icon,
            unlockedAt: Date.now()
        };
        this.save();
        this.listeners.forEach(fn => fn({ id, name, description, icon }));
        triggerHapticFeedback([30, 20, 30, 20, 50]);
        return true;
    },

    isUnlocked(id) {
        return !!this.achievements[id];
    },

    getAll() {
        return Object.values(this.achievements);
    },

    subscribe(fn) {
        this.listeners.push(fn);
        return () => {
            this.listeners = this.listeners.filter(f => f !== fn);
        };
    }
};

AchievementSystem.init();

// ============================================================================
// QUANTUM PARTICLE ENGINE
// ============================================================================

const QuantumParticleCanvas = ({ capabilities, state, intensity, isOffline }) => {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const animationFrameRef = useRef(null);
    const particlesRef = useRef([]);
    const mouseRef = useRef({ x: 0, y: 0, active: false });

    const activeMaxParticles = useMemo(() => {
        const base = capabilities.isLowPowerMode
            ? SYSTEM_CONFIG.MAX_PARTICLES_LOW_POWER
            : SYSTEM_CONFIG.MAX_PARTICLES_DEFAULT;
        return Math.floor(base * intensity);
    }, [capabilities.isLowPowerMode, intensity]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        contextRef.current = ctx;

        // Initialize particles
        const w = rect.width;
        const h = rect.height;
        const particles = [];
        for (let i = 0; i < activeMaxParticles; i++) {
            particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.8,
                vy: (Math.random() - 0.5) * 0.8,
                size: 0.5 + Math.random() * 2,
                life: Math.random() * 100,
                maxLife: 50 + Math.random() * 100,
                color: Math.random() > 0.5 ? 'purple' : 'blue'
            });
        }
        particlesRef.current = particles;

        // Mouse tracking
        const handleMouseMove = (e) => {
            const rect2 = canvas.getBoundingClientRect();
            mouseRef.current.x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect2.left;
            mouseRef.current.y = (e.clientY || e.touches?.[0]?.clientY || 0) - rect2.top;
            mouseRef.current.active = true;
        };

        const handleMouseLeave = () => {
            mouseRef.current.active = false;
        };

        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('touchmove', handleMouseMove, { passive: true });
        canvas.addEventListener('mouseleave', handleMouseLeave);

        const runParticleLoop = () => {
            const currentCtx = contextRef.current;
            if (!currentCtx) return;

            const w2 = canvas.width / dpr;
            const h2 = canvas.height / dpr;

            currentCtx.clearRect(0, 0, w2, h2);

            const speed = isOffline ? 0.2 : (0.5 + intensity * 0.5);
            const particles2 = particlesRef.current;

            // Update and draw particles
            for (let i = 0; i < particles2.length; i++) {
                const p = particles2[i];

                p.x += p.vx * speed;
                p.y += p.vy * speed;
                p.life += 0.5;

                // Mouse interaction
                if (mouseRef.current.active) {
                    const dx = mouseRef.current.x - p.x;
                    const dy = mouseRef.current.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 100) {
                        const force = (100 - dist) / 100 * 0.05;
                        p.vx += (dx / dist) * force;
                        p.vy += (dy / dist) * force;
                    }
                }

                // Boundaries
                if (p.x < 0) { p.x = w2; }
                if (p.x > w2) { p.x = 0; }
                if (p.y < 0) { p.y = h2; }
                if (p.y > h2) { p.y = 0; }

                // Lifecycle
                if (p.life > p.maxLife) {
                    p.x = Math.random() * w2;
                    p.y = Math.random() * h2;
                    p.life = 0;
                    p.maxLife = 50 + Math.random() * 100;
                    p.size = 0.5 + Math.random() * 2;
                }

                // Draw
                const alpha = 0.3 + 0.7 * (1 - p.life / p.maxLife);
                const color = p.color === 'purple'
                    ? `rgba(168, 85, 247, ${alpha * 0.8})`
                    : `rgba(56, 189, 248, ${alpha * 0.6})`;

                currentCtx.beginPath();
                currentCtx.arc(p.x, p.y, p.size * (1 + intensity * 0.2), 0, Math.PI * 2);
                currentCtx.fillStyle = color;
                currentCtx.fill();

                // Glow
                if (p.size > 1.5) {
                    currentCtx.shadowBlur = 10;
                    currentCtx.shadowColor = p.color === 'purple'
                        ? 'rgba(168, 85, 247, 0.2)'
                        : 'rgba(56, 189, 248, 0.2)';
                    currentCtx.fill();
                    currentCtx.shadowBlur = 0;
                }
            }

            // Draw connections
            for (let i = 0; i < particles2.length; i++) {
                for (let j = i + 1; j < particles2.length; j++) {
                    const a = particles2[i];
                    const b = particles2[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 80) {
                        const alpha = (1 - dist / 80) * 0.15;
                        currentCtx.beginPath();
                        currentCtx.moveTo(a.x, a.y);
                        currentCtx.lineTo(b.x, b.y);
                        currentCtx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
                        currentCtx.lineWidth = 0.5;
                        currentCtx.stroke();
                    }
                }
            }

            animationFrameRef.current = requestAnimationFrame(runParticleLoop);
        };

        runParticleLoop();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('touchmove', handleMouseMove);
            canvas.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [activeMaxParticles, intensity, isOffline]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
        />
    );
};

// ============================================================================
// BACKGROUND SYSTEM
// ============================================================================

const AmbientBackground = ({ isOffline, colorScheme }) => {
    const reducedMotion = useReducedMotion();

    const gradient = useMemo(() => {
        if (isOffline) {
            return "radial-gradient(circle at 30% 40%, #1a1a2e 0%, #0a0a0f 100%)";
        }
        switch (colorScheme) {
            case 'obsidian':
                return "radial-gradient(circle at 30% 40%, #0d0d1a 0%, #050508 100%)";
            case 'storm':
                return "radial-gradient(circle at 30% 40%, #1a1040 0%, #06060a 100%)";
            default:
                return "radial-gradient(circle at 30% 40%, #0f0f1f 0%, #06060a 100%)";
        }
    }, [colorScheme, isOffline]);

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#06060a]">
            <motion.div
                className="absolute inset-0 w-full h-full"
                animate={{ background: gradient }}
                transition={{ duration: 2.0, ease: "easeInOut" }}
            />

            {!reducedMotion && (
                <>
                    <motion.div
                        className="absolute top-[-20%] left-[-30%] w-[100%] h-[70%] rounded-full opacity-[0.06]"
                        style={{
                            background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)',
                            filter: 'blur(120px)',
                            mixBlendMode: 'screen'
                        }}
                        animate={{
                            x: [0, 60, -30, 0],
                            y: [0, -40, 30, 0],
                            scale: [1, 1.2, 0.9, 1]
                        }}
                        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                        className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[50%] rounded-full opacity-[0.04]"
                        style={{
                            background: 'radial-gradient(circle, #38bdf8 0%, transparent 70%)',
                            filter: 'blur(100px)',
                            mixBlendMode: 'screen'
                        }}
                        animate={{
                            x: [0, -50, 40, 0],
                            y: [0, 50, -30, 0],
                            scale: [1, 0.85, 1.15, 1]
                        }}
                        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                    />
                </>
            )}
        </div>
    );
};

// ============================================================================
// HOLOGRAPHIC AUTHENTICATION ORB
// ============================================================================

const HolographicOrb = ({
    state,
    theme,
    onTap,
    onSwipe,
    onLongPress,
    glowIntensity
}) => {
    const orbRef = useRef();
    const rotationX = useMotionValue(0);
    const rotationY = useMotionValue(0);
    const springConfig = { damping: 20, stiffness: 150, mass: 0.8 };
    const springX = useSpring(rotationX, springConfig);
    const springY = useSpring(rotationY, springConfig);

    const [ripples, setRipples] = useState([]);

    const handlePointerMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (e.clientX - centerX) / (rect.width / 2);
        const deltaY = (e.clientY - centerY) / (rect.height / 2);
        rotationX.set(deltaY * 20);
        rotationY.set(deltaX * -20);
    };

    const handlePointerLeave = () => {
        rotationX.set(0);
        rotationY.set(0);
    };

    const handleTap = (e) => {
        triggerHapticFeedback(10);
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setRipples(prev => [...prev, { x, y, id: Date.now() }]);
        setTimeout(() => {
            setRipples(prev => prev.filter(r => r.id !== Date.now()));
        }, 600);
        if (onTap) onTap();
    };

    const handleLongPressStart = () => {
        triggerHapticFeedback([20, 10, 20]);
        if (onLongPress) onLongPress();
    };

    const handleSwipe = (direction) => {
        if (onSwipe) onSwipe(direction);
    };

    const orbState = useMemo(() => {
        switch (state) {
            case 'verifying':
                return { color: '#38bdf8', glow: '#38bdf8', pulse: 1.2, rotate: true };
            case 'gathering':
                return { color: '#a855f7', glow: '#a855f7', pulse: 1.4, rotate: true };
            case 'imploding':
                return { color: '#ffffff', glow: '#ffffff', pulse: 2.0, rotate: true };
            default:
                return { color: '#6366f1', glow: '#6366f1', pulse: 1.0, rotate: false };
        }
    }, [state]);

    return (
        <motion.div
            ref={orbRef}
            className="relative w-48 h-48 mx-auto mb-8 flex items-center justify-center z-20 select-none touch-none"
            style={{
                perspective: 800,
                rotateX: springX,
                rotateY: springY
            }}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onClick={handleTap}
            onTouchStart={() => {
                const timer = setTimeout(handleLongPressStart, 600);
                return () => clearTimeout(timer);
            }}
            animate={{
                scale: orbState.pulse,
                rotate: orbState.rotate ? 360 : 0
            }}
            transition={{
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 20, repeat: Infinity, ease: "linear" }
            }}
        >
            {/* Outer glow rings */}
            <motion.div
                className="absolute inset-[-20px] rounded-full pointer-events-none"
                style={{
                    background: `radial-gradient(circle, ${orbState.glow}33 0%, transparent 70%)`,
                    filter: 'blur(30px)'
                }}
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Orb body */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                    background: `radial-gradient(circle at 30% 30%, ${orbState.color}66, ${orbState.color}22 50%, transparent 100%)`,
                    border: `2px solid ${orbState.color}44`,
                    boxShadow: `inset 0 0 60px ${orbState.glow}33, 0 0 40px ${orbState.glow}22`
                }}
            />

            {/* Inner core */}
            <motion.div
                className="absolute inset-[20%] rounded-full"
                style={{
                    background: `radial-gradient(circle at 40% 40%, ${orbState.color}88, ${orbState.color}44 60%, transparent 100%)`,
                    boxShadow: `inset 0 0 30px ${orbState.glow}44`
                }}
                animate={{
                    scale: [1, 1.1, 1]
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Center pulse */}
            <motion.div
                className="absolute inset-[35%] rounded-full"
                style={{
                    background: `radial-gradient(circle, ${orbState.color}dd, ${orbState.color}88 50%, transparent 100%)`
                }}
                animate={{
                    scale: [1, 0.8, 1],
                    opacity: [1, 0.5, 1]
                }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Scan line effect */}
            {state === 'verifying' && (
                <motion.div
                    className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
                    style={{ border: `2px solid ${orbState.color}44` }}
                >
                    <motion.div
                        className="absolute left-0 right-0 h-[2px]"
                        style={{
                            background: `linear-gradient(90deg, transparent, ${orbState.color}88, transparent)`,
                            top: '20%'
                        }}
                        animate={{
                            top: ['20%', '80%', '20%']
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                        className="absolute top-0 bottom-0 w-[2px]"
                        style={{
                            background: `linear-gradient(180deg, transparent, ${orbState.color}88, transparent)`,
                            left: '20%'
                        }}
                        animate={{
                            left: ['20%', '80%', '20%']
                        }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                </motion.div>
            )}

            {/* Ripples */}
            <AnimatePresence>
                {ripples.map((ripple) => (
                    <motion.div
                        key={ripple.id}
                        className="absolute rounded-full border-2 pointer-events-none"
                        style={{
                            left: ripple.x - 20,
                            top: ripple.y - 20,
                            width: 40,
                            height: 40,
                            borderColor: `${orbState.color}88`
                        }}
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: 2, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6 }}
                    />
                ))}
            </AnimatePresence>

            {/* Center icon */}
            <div className="relative z-10">
                {state === 'verifying' ? (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                        <Radar className="w-12 h-12 text-white/80" />
                    </motion.div>
                ) : state === 'gathering' || state === 'imploding' ? (
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                    >
                        <CheckCircle className="w-12 h-12 text-white/90" />
                    </motion.div>
                ) : (
                    <Fingerprint className="w-12 h-12 text-white/60" />
                )}
            </div>
        </motion.div>
    );
};

// ============================================================================
// GLASSMORPHIC INPUT COMPONENT
// ============================================================================

const GlassInput = ({
    type,
    placeholder,
    value,
    onChange,
    icon: Icon,
    error,
    locked,
    onToggleVisibility,
    isPassword
}) => {
    const [focused, setFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    const handleToggle = () => {
        setShowPassword(prev => !prev);
        if (onToggleVisibility) onToggleVisibility();
        triggerHapticFeedback(8);
    };

    return (
        <motion.div
            className={`relative w-full mb-5 z-20 group`}
            animate={{
                x: error ? [-4, 4, -4, 4, 0] : 0
            }}
            transition={{ duration: 0.3 }}
        >
            <div
                className={`absolute inset-0 rounded-2xl bg-white/[0.03] backdrop-blur-xl border transition-all duration-300 ${error
                    ? 'border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.1)]'
                    : focused
                        ? 'border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
                        : 'border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.2)]'
                    }`}
            />

            <AnimatePresence>
                {focused && (
                    <motion.div
                        className="absolute inset-0 rounded-2xl pointer-events-none border border-white/20 z-10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    />
                )}
            </AnimatePresence>

            <div className="relative flex items-center px-4 py-4 z-20">
                {Icon && (
                    <Icon
                        className={`w-5 h-5 mr-3.5 transition-all duration-300 ${focused ? 'text-white scale-105' : 'text-white/30'
                            }`}
                    />
                )}

                <input
                    type={inputType}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    disabled={locked}
                    className="w-full bg-transparent border-none outline-none text-white placeholder-white/25 text-base font-light tracking-wide disabled:opacity-40"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                />

                {isPassword && (
                    <motion.button
                        type="button"
                        onClick={handleToggle}
                        disabled={locked}
                        className="ml-2 p-1 text-white/35 hover:text-white/70 transition-colors focus:outline-none"
                        whileTap={{ scale: 0.85 }}
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </motion.button>
                )}
            </div>

            <motion.div
                className="absolute bottom-0 left-6 right-6 h-[1px] overflow-hidden pointer-events-none"
                animate={focused ? { opacity: 1 } : { opacity: 0 }}
            >
                <motion.div
                    className="w-full h-full bg-gradient-to-r from-transparent via-purple-400/50 to-transparent"
                    animate={focused ? { x: [-100, 300] } : { x: -100 }}
                    transition={{ duration: 1.5, repeat: focused ? Infinity : 0, ease: "easeInOut" }}
                />
            </motion.div>
        </motion.div>
    );
};

// ============================================================================
// NEURAL AUTHENTICATION BUTTON
// ============================================================================

const NeuralButton = ({
    processing,
    offline,
    onClick,
    onLongPress
}) => {
    const [ripple, setRipple] = useState(null);
    const [hovering, setHovering] = useState(false);

    const handleClick = (e) => {
        if (processing || offline) return;
        triggerHapticFeedback(15);

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setRipple({ x, y, id: Date.now() });
        setTimeout(() => setRipple(null), 800);

        if (onClick) onClick();
    };

    const handleLongPressStart = () => {
        if (onLongPress) {
            triggerHapticFeedback([20, 10, 20, 10]);
            onLongPress();
        }
    };

    return (
        <motion.button
            type="submit"
            disabled={processing || offline}
            onPointerEnter={() => setHovering(true)}
            onPointerLeave={() => setHovering(false)}
            onClick={handleClick}
            onTouchStart={() => {
                const timer = setTimeout(handleLongPressStart, 800);
                return () => clearTimeout(timer);
            }}
            className="relative w-full h-14 mt-3 rounded-2xl overflow-hidden select-none touch-none"
            style={{
                background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(56,189,248,0.2))',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: hovering ? '0 8px 32px rgba(168,85,247,0.2)' : '0 4px 16px rgba(0,0,0,0.3)'
            }}
            whileTap={{ scale: 0.97 }}
        >
            {/* Animated background */}
            <motion.div
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(56,189,248,0.1))'
                }}
                animate={{
                    opacity: hovering ? 0.5 : 0.2
                }}
                transition={{ duration: 0.3 }}
            />

            {/* Processing animation */}
            {processing && (
                <motion.div
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.2), transparent)',
                        width: '200%'
                    }}
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
            )}

            {/* Ripple */}
            {ripple && (
                <motion.div
                    className="absolute rounded-full bg-white/20 pointer-events-none"
                    style={{
                        left: ripple.x - 75,
                        top: ripple.y - 75,
                        width: 150,
                        height: 150
                    }}
                    initial={{ scale: 0, opacity: 0.8 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 0.6 }}
                />
            )}

            <span className="relative z-10 flex items-center justify-center font-medium text-base text-white/90">
                {processing ? (
                    <div className="flex items-center space-x-3">
                        <motion.div
                            className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.75, repeat: Infinity, ease: "linear" }}
                        />
                        <span className="text-xs font-bold tracking-wider">AUTHENTICATING</span>
                    </div>
                ) : offline ? (
                    <div className="flex items-center space-x-2 text-white/50">
                        <WifiOff className="w-4 h-4" />
                        <span>OFFLINE</span>
                    </div>
                ) : (
                    <div className="flex items-center space-x-2">
                        <span>ESTABLISH CONNECTION</span>
                        <Sparkles className="w-4 h-4 opacity-70" />
                    </div>
                )}
            </span>
        </motion.button>
    );
};

// ============================================================================
// ACHIEVEMENT NOTIFICATION
// ============================================================================

const AchievementNotification = ({ achievement, onComplete }) => {
    useEffect(() => {
        triggerHapticFeedback([20, 30, 20, 30, 50]);
        const timer = setTimeout(() => {
            if (onComplete) onComplete();
        }, 4000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <motion.div
            className="fixed top-20 left-4 right-4 z-50 max-w-sm mx-auto"
            initial={{ opacity: 0, y: -60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -60, scale: 0.9 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
        >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
                <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl">
                        {achievement.icon || '🏆'}
                    </div>
                    <div className="flex-1">
                        <p className="text-white/40 text-[10px] font-bold tracking-widest uppercase">ACHIEVEMENT UNLOCKED</p>
                        <p className="text-white font-semibold text-sm">{achievement.name}</p>
                        <p className="text-white/40 text-xs">{achievement.description}</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// ============================================================================
// SECRET TERMINAL (Easter Egg)
// ============================================================================

const SecretTerminal = ({ onClose }) => {
    const [input, setInput] = useState('');
    const [history, setHistory] = useState([
        { type: 'system', text: 'NEXUS OS Terminal v3.0' },
        { type: 'system', text: 'Type "help" for available commands' },
        { type: 'system', text: '---' }
    ]);
    const terminalRef = useRef(null);

    const commands = {
        help: () => 'Available commands: help, theme, version, clear, status, about, matrix, coffee, quantum',
        theme: () => 'Current theme: OBSIDIAN (click logo 7 times to change)',
        version: () => `NEXUS OS v${SYSTEM_CONFIG.BUILD_VERSION}`,
        clear: () => {
            setHistory([]);
            return null;
        },
        status: () => 'System status: ONLINE | Particles: ACTIVE | Neural: CONNECTED',
        about: () => 'NEXUS OS - Premium Mobile Authentication System\nBuilt for the future of secure identity.',
        matrix: () => {
            // Trigger Matrix mode
            document.body.classList.toggle('matrix-mode');
            return 'Matrix mode activated.';
        },
        coffee: () => {
            const hour = new Date().getHours();
            if (hour >= 2 && hour < 5) {
                return '☕ Developer fatigue detected. Time for coffee.';
            }
            return '☕ Coffee mode: not yet.';
        },
        quantum: () => {
            return '⚛️ Quantum collapse initiated. Reality is now uncertain.';
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const cmd = input.trim().toLowerCase();
        const output = commands[cmd] ? commands[cmd]() : `Unknown command: ${cmd}`;

        setHistory(prev => [
            ...prev,
            { type: 'input', text: `> ${input}` },
            ...(output ? [{ type: 'output', text: output }] : [])
        ]);

        setInput('');
        setTimeout(() => {
            if (terminalRef.current) {
                terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
            }
        }, 50);
    };

    return (
        <motion.div
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="w-full max-w-lg h-[70vh] bg-black/80 border border-purple-500/20 rounded-2xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="flex items-center space-x-2">
                        <Terminal className="w-4 h-4 text-purple-400" />
                        <span className="text-white/60 text-sm font-mono">TERMINAL</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/40 hover:text-white/80 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div
                    ref={terminalRef}
                    className="flex-1 overflow-auto p-4 font-mono text-sm space-y-1"
                >
                    {history.map((entry, i) => (
                        <div
                            key={i}
                            className={`${entry.type === 'input'
                                ? 'text-green-400'
                                : entry.type === 'system'
                                    ? 'text-purple-400/60'
                                    : 'text-white/80'
                                } whitespace-pre-wrap`}
                        >
                            {entry.text}
                        </div>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="border-t border-white/10 p-3">
                    <div className="flex items-center space-x-2">
                        <span className="text-green-400 font-mono text-sm">&gt;</span>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-white font-mono text-sm"
                            placeholder="Enter command..."
                            autoFocus
                        />
                    </div>
                </form>
            </div>
        </motion.div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LoginMobile3() {
    const navigate = useNavigate();
    const capabilities = useDeviceCapabilities();

    // State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [state, setState] = useState('idle');
    const [error, setError] = useState(null);
    const [offline, setOffline] = useState(!navigator.onLine);
    const [achievement, setAchievement] = useState(null);
    const [terminalOpen, setTerminalOpen] = useState(false);
    const [theme, setTheme] = useState('default');
    const [matrixMode, setMatrixMode] = useState(false);

    // Easter egg counters
    const [logoClicks, setLogoClicks] = useState(0);
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [konamiProgress, setKonamiProgress] = useState(0);
    const [secretTyped, setSecretTyped] = useState('');
    const [bootCount, setBootCount] = useState(0);

    // Refs
    const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

    // Achievement system subscription
    useEffect(() => {
        const unsubscribe = AchievementSystem.subscribe((ach) => {
            setAchievement(ach);
            setTimeout(() => setAchievement(null), 4000);
        });
        return unsubscribe;
    }, []);

    // Boot count
    useEffect(() => {
        const count = parseInt(sessionStorage.getItem('nexus_boot_count') || '0');
        setBootCount(count + 1);
        sessionStorage.setItem('nexus_boot_count', String(count + 1));

        // Rare boot easter egg
        if (count === 0 || Math.random() < 0.01) {
            setTimeout(() => {
                AchievementSystem.unlock('rare_boot', 'Rare Boot', 'Consciousness detected.');
            }, 1000);
        }
    }, []);

    // Network status
    useEffect(() => {
        const handleOnline = () => setOffline(false);
        const handleOffline = () => setOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Konami code
    useEffect(() => {
        const handleKeyDown = (e) => {
            const key = e.key;
            if (key === 'Control' && e.shiftKey && e.key === '`') {
                setTerminalOpen(true);
                return;
            }

            // Konami code
            if (key === konamiSequence[konamiProgress]) {
                setKonamiProgress(prev => prev + 1);
                if (konamiProgress + 1 === konamiSequence.length) {
                    setKonamiProgress(0);
                    AchievementSystem.unlock('konami', 'Konami Code', 'Administrator mode unlocked.');
                    triggerHapticFeedback([30, 50, 30, 50, 80]);
                }
            } else {
                setKonamiProgress(0);
            }

            // Secret typing (matrix)
            if (key.length === 1) {
                const newTyped = (secretTyped + key.toLowerCase()).slice(-10);
                setSecretTyped(newTyped);
                if (newTyped.includes('matrix')) {
                    setMatrixMode(!matrixMode);
                    setSecretTyped('');
                    triggerHapticFeedback([20, 40, 20]);
                }
                if (newTyped.includes('open sesame')) {
                    setSecretTyped('');
                    // Play startup sound
                    try {
                        const audio = new Audio('/startup.mp3');
                        audio.play().catch(() => { });
                    } catch (e) { }
                    AchievementSystem.unlock('secret_audio', 'Secret Audio', 'The doors have opened.');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [konamiProgress, secretTyped, matrixMode]);

    // Idle detection
    useEffect(() => {
        let idleTimer;
        const resetTimer = () => {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                if (state === 'idle') {
                    const hour = new Date().getHours();
                    if (hour >= 2 && hour < 5) {
                        AchievementSystem.unlock('coffee_mode', 'Coffee Mode', 'Developer fatigue detected.');
                    }
                }
            }, SYSTEM_CONFIG.IDLE_TIMEOUT_MS);
        };

        const events = ['mousedown', 'touchstart', 'keydown'];
        events.forEach(ev => window.addEventListener(ev, resetTimer));
        resetTimer();

        return () => {
            clearTimeout(idleTimer);
            events.forEach(ev => window.removeEventListener(ev, resetTimer));
        };
    }, [state]);

    // Funny password messages
    const checkFunnyPassword = (pass) => {
        const lower = pass.toLowerCase();
        if (lower === 'password') return '🔓 That\'s a terrible password.';
        if (lower === '123456') return '🔢 Really? 123456?';
        if (lower === 'qwerty') return '⌨️ Keyboard pattern detected.';
        if (lower === 'admin') return '👤 Administrator curiosity detected.';
        if (lower === 'correcthorsebatterystaple') {
            AchievementSystem.unlock('unbreakable', 'Unbreakable', 'The impossible password.');
            return '🛡️ UNBREAKABLE!';
        }
        return null;
    };

    const handleLogin = async (e) => {
        e.preventDefault();

        if (offline) {
            setError('Network offline. Gateway unreachable.');
            triggerHapticFeedback([50, 50]);
            return;
        }

        if (!email || !password) {
            setError('Credentials payload incomplete.');
            triggerHapticFeedback(20);
            return;
        }

        // Check funny passwords
        const funnyMsg = checkFunnyPassword(password);
        if (funnyMsg) {
            setError(funnyMsg);
            triggerHapticFeedback(30);
            return;
        }

        setState('verifying');
        setError(null);
        triggerHapticFeedback(18);

        try {
            const response = await API.post('/login', {
                email: email,
                password: password
            });

            const token = response.data.access_token || response.data.token;
            if (token) {
                sessionStorage.setItem('token', token);
                setState('gathering');
                triggerHapticFeedback([40, 40, 80, 40]);

                // Achievement: first login
                AchievementSystem.unlock('first_login', 'First Contact', 'You have established the connection.');

                setTimeout(() => {
                    setState('imploding');
                    triggerHapticFeedback([100, 10]);

                    setTimeout(() => {
                        navigate('/home');
                    }, 800);
                }, 1200);
            } else {
                throw new Error('Invalid token response');
            }
        } catch (err) {
            setState('idle');
            setError(err.response?.data?.detail || 'Authentication failed. Secure handshake declined.');
            triggerHapticFeedback([30, 60, 30]);

            setFailedAttempts(prev => prev + 1);
            if (failedAttempts >= 9) {
                setTimeout(() => {
                    setError('Just kidding. 😉');
                    AchievementSystem.unlock('hacker_warning', 'Hacker Warning', 'Just kidding.');
                }, 500);
            }
        }
    };

    const handleLogoTap = () => {
        const count = logoClicks + 1;
        setLogoClicks(count);
        triggerHapticFeedback(8);

        if (count === 7) {
            setTheme('obsidian');
            AchievementSystem.unlock('obsidian_theme', 'Obsidian Theme', 'Unlocked OBSIDIAN visual mode.');
            setLogoClicks(0);
        }

        if (count === 20) {
            AchievementSystem.unlock('logo_achievement', 'Logo Master', '20 taps. Achievement unlocked.');
            setLogoClicks(0);
        }
    };

    const handleLongPressOrb = () => {
        AchievementSystem.unlock('quantum_collapse', 'Quantum Collapse', 'The reality has been altered.');
        triggerHapticFeedback([30, 20, 30, 20, 50, 20, 30]);
    };

    const handleSwipeOrb = (direction) => {
        if (direction === 'up') {
            AchievementSystem.unlock('gravity_shift', 'Gravity Shift', 'The particles obey your will.');
            triggerHapticFeedback(20);
        }
    };

    const handleError = (msg) => {
        setError(msg);
        triggerHapticFeedback(20);
        setTimeout(() => setError(null), 5000);
    };

    // Matrix mode CSS
    useEffect(() => {
        if (matrixMode) {
            document.body.classList.add('matrix-mode');
        } else {
            document.body.classList.remove('matrix-mode');
        }
    }, [matrixMode]);

    return (
        <div className="relative min-h-[100dvh] w-full overflow-hidden flex flex-col bg-[#06060a]">
            <style>
                {`
                .matrix-mode {
                    animation: matrixRain 0.1s linear infinite;
                }
                @keyframes matrixRain {
                    0% { background-color: rgba(0, 0, 0, 1); }
                    100% { background-color: rgba(0, 10, 0, 1); }
                }
                .matrix-mode * {
                    color: #00ff00 !important;
                    border-color: #00ff0044 !important;
                    text-shadow: 0 0 10px #00ff0044 !important;
                }
                .matrix-mode .text-white {
                    color: #00ff00 !important;
                }
                .matrix-mode input {
                    color: #00ff00 !important;
                }
                `}
            </style>

            <AmbientBackground isOffline={offline} colorScheme={theme} />
            <QuantumParticleCanvas
                capabilities={capabilities}
                state={state}
                intensity={state === 'verifying' ? 1.5 : 1.0}
                isOffline={offline}
            />

            {/* Network status indicator */}
            <motion.div
                className="absolute top-6 right-6 flex items-center space-x-2 bg-black/40 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/10 z-30"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <div className="relative flex h-2 w-2">
                    {!offline && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${!offline ? 'bg-emerald-500' : 'bg-red-500'}`} />
                </div>
                <span className="text-[8px] text-white/60 font-mono">
                    {!offline ? 'ONLINE' : 'OFFLINE'}
                </span>
            </motion.div>

            {/* Terminal toggle */}
            <motion.button
                className="absolute top-6 left-6 bg-black/40 backdrop-blur-xl p-2 rounded-full border border-white/10 z-30 text-white/40 hover:text-white/80 transition-colors"
                onClick={() => setTerminalOpen(true)}
                whileTap={{ scale: 0.9 }}
            >
                <Terminal className="w-4 h-4" />
            </motion.button>

            {/* Main content */}
            <motion.div
                className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-20"
                animate={{
                    opacity: state === 'imploding' ? 0 : 1,
                    y: state === 'imploding' ? -40 : 0
                }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
            >
                {/* Brand */}
                <motion.div
                    className="mb-6 text-center"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                >
                    <motion.h1
                        className="text-3xl font-light tracking-[0.3em] text-white/70"
                        onClick={handleLogoTap}
                        style={{ cursor: 'pointer' }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        NEXUS
                        <span className="text-purple-400/50 ml-1">OS</span>
                    </motion.h1>
                    <p className="text-[10px] text-white/20 tracking-[0.2em] mt-1 font-mono">
                        {SYSTEM_CONFIG.BUILD_VERSION}
                    </p>
                </motion.div>

                {/* Holographic Orb */}
                <HolographicOrb
                    state={state}
                    theme={theme}
                    onTap={handleLogoTap}
                    onSwipe={handleSwipeOrb}
                    onLongPress={handleLongPressOrb}
                    glowIntensity={state === 'verifying' ? 1.5 : 1.0}
                />

                {/* Status text */}
                <div className="h-8 mb-4 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        {error ? (
                            <motion.p
                                key="error"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-xs text-red-400/80 text-center max-w-xs font-mono"
                            >
                                {error}
                            </motion.p>
                        ) : state === 'verifying' ? (
                            <motion.p
                                key="verifying"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="text-xs text-blue-400/60 font-mono tracking-wider"
                            >
                                <span className="inline-block animate-pulse">●</span> SECURE HANDSHAKE IN PROGRESS
                            </motion.p>
                        ) : state === 'gathering' ? (
                            <motion.p
                                key="gathering"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="text-xs text-purple-400/60 font-mono tracking-wider"
                            >
                                <span className="inline-block animate-pulse">●</span> GATHERING NEURAL SIGNATURE
                            </motion.p>
                        ) : null}
                    </AnimatePresence>
                </div>

                {/* Login form */}
                <motion.form
                    onSubmit={handleLogin}
                    className="w-full max-w-sm space-y-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <GlassInput
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        icon={User}
                        error={error}
                        locked={state !== 'idle'}
                    />

                    <GlassInput
                        type="password"
                        placeholder="Cryptographic cipher"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        icon={Lock}
                        error={error}
                        locked={state !== 'idle'}
                        isPassword
                        onToggleVisibility={() => {
                            // Easter egg: password toggle counter
                            const count = parseInt(sessionStorage.getItem('password_toggle_count') || '0');
                            sessionStorage.setItem('password_toggle_count', String(count + 1));
                            if (count + 1 === 10) {
                                AchievementSystem.unlock('password_master', 'Password Master', 'You\'ve toggled 10 times.');
                            }
                        }}
                    />

                    <NeuralButton
                        processing={state !== 'idle'}
                        offline={offline}
                        onClick={() => {
                            // Easter egg: button click counter
                            const count = parseInt(sessionStorage.getItem('button_click_count') || '0');
                            sessionStorage.setItem('button_click_count', String(count + 1));
                            if (count + 1 === 25) {
                                AchievementSystem.unlock('button_masher', 'Button Masher', '25 clicks. You\'re dedicated.');
                            }
                        }}
                        onLongPress={() => {
                            AchievementSystem.unlock('secret_agent', 'Secret Agent', 'Long press detected. Agent activated.');
                        }}
                    />
                </motion.form>

                {/* Developer signature */}
                <motion.p
                    className="mt-8 text-[8px] text-white/10 font-mono tracking-[0.3em]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.5 }}
                >
                    <span className="cursor-pointer" onClick={() => {
                        const count = parseInt(sessionStorage.getItem('signature_clicks') || '0');
                        sessionStorage.setItem('signature_clicks', String(count + 1));
                        if (count + 1 === 5) {
                            AchievementSystem.unlock('signature_hunter', 'Signature Hunter', 'You found the hidden signature.');
                        }
                    }}>
                        BUILT FOR THE FUTURE
                    </span>
                </motion.p>
            </motion.div>

            {/* Terminal */}
            <AnimatePresence>
                {terminalOpen && (
                    <SecretTerminal onClose={() => setTerminalOpen(false)} />
                )}
            </AnimatePresence>

            {/* Achievement notification */}
            <AnimatePresence>
                {achievement && (
                    <AchievementNotification
                        achievement={achievement}
                        onComplete={() => setAchievement(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}