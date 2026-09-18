// Easter Egg #1:
// 1% chance of a rare "Consciousness Detected" boot sequence when the app starts.

// Easter Egg #2:
// First launch unlocks the "First Light" achievement.

// Easter Egg #3:
// Logging in between 2:00 AM and 5:00 AM unlocks the "Night Owl" achievement.

// Easter Egg #4:
// Logging in between 2:00 AM and 5:00 AM also displays a hidden coffee/developer message.

// Easter Egg #5:
// Enter the Konami Code (↑ ↑ ↓ ↓ ← → ← → B A) to activate temporary Admin Mode.

// Easter Egg #6:
// Press Ctrl + Shift + ` to open the hidden developer terminal.

// Easter Egg #7:
// Hold the Space key to activate a gravity field that pulls particles toward the cursor.

// Easter Egg #8:
// Release Space after using the gravity field to unlock the Gravity Well achievement.

// Easter Egg #9:
// Random reality glitches can appear with an extremely small probability.

// Easter Egg #10:
// Typing "matrix" as the email launches Matrix Rain mode and unlocks Matrix Pilot.

// Easter Egg #11:
// Typing "open sesame" as the email displays the hidden "The gates have opened." message.

// Easter Egg #12:
// Typing "correcthorsebatterystaple" as the email unlocks the legendary Unbreakable achievement.

// Easter Egg #13:
// Weak passwords like "password", "123456", "qwerty", and "admin" trigger sarcastic responses.

// Easter Egg #14:
// Failing login 10 times unlocks the "Hacker Joke" achievement.

// Easter Egg #15:
// Tapping the central identity orb 7 times unlocks the hidden Obsidian theme.

// Easter Egg #16:
// Tapping the orb 20 times unlocks the Orb Whisperer achievement.

// Easter Egg #17:
// Tapping the orb 30 times hatches a hidden Digital Pet companion.

// Easter Egg #18:
// Holding the orb for 2 seconds opens a Black Hole animation and unlocks Event Horizon.

// Easter Egg #19:
// Swiping the orb triggers a temporary Force Surge, making the background more energetic.

// Easter Egg #20:
// Tapping the build/version label 5 times opens the hidden Developer Mode overlay.

// Easter Egg #21:
// Tapping the background 50 times unlocks the Star Gazer achievement.

// Easter Egg #22:
// The secret terminal accepts commands:
// help, status, version, about, theme, clear, whoami, matrix, exit.

// Easter Egg #23:
// The "matrix" terminal command also launches Matrix Rain.

// Easter Egg #24:
// Developer mode displays live engine information such as FPS, theme, achievements, particle count and build number.

// Easter Egg #25:
// Achievements are permanently stored in localStorage across browser sessions.

// Easter Egg #26:
// Hidden vibration patterns occur during successful authentication, failures and achievement unlocks (on supported devices).

// Easter Egg #27:
// Rare overlays include Matrix Rain, Black Hole, Digital Pet, Random Glitch, Firmware Update and Signal Ghost events.

{ console.log("LoginMobile2 loaded!") }

import React, {
    useState,
    useEffect,
    useRef,
    useMemo,
    useCallback,
    createContext,
    useContext,
    memo
} from 'react';
import {
    motion,
    AnimatePresence,
    useAnimation,
    useMotionValue,
    useSpring,
    useTransform,
    useReducedMotion,
    usePresence
} from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import API from '../Services/API';
import {
    Eye,
    EyeOff,
    Wifi,
    WifiOff,
    Signal,
    Battery,
    BatteryCharging,
    Lock,
    Unlock,
    User,
    Shield,
    ShieldCheck,
    ShieldAlert,
    Fingerprint,
    Cpu,
    Zap,
    Terminal as TerminalIcon,
    Sparkles,
    Radio,
    Activity,
    Layers,
    ChevronDown,
    ChevronRight,
    AlertTriangle,
    Check,
    X,
    Circle,
    Hexagon,
    Triangle,
    Square,
    Command,
    Radar,
    Satellite,
    Orbit,
    Atom,
    Flame,
    Ghost,
    Rocket,
    Star,
    Moon,
    Sun,
    Cloud,
    Droplet,
    Wind,
    Waves,
    Mountain,
    Compass,
    Map,
    Navigation,
    Anchor,
    Gamepad2,
    Trophy,
    Award,
    Medal,
    Crown,
    Gem,
    Heart,
    Brain,
    Eye as EyeIcon,
    Ear,
    Hand,
    Footprints,
    Smile,
    Frown,
    Meh,
    Laugh,
    Skull,

    Bot,
    Bug,
    Code2,
    Database,
    HardDrive,
    Server,
    Cloud as CloudIcon,
    Globe,
    Link2,
    Share2,
    Send,
    Inbox,
    Mail,
    MessageSquare,
    MessageCircle,
    Phone,
    Video,
    Camera,
    Image,
    Film,
    Music,
    Volume2,
    VolumeX,
    Play,
    Pause,
    SkipForward,
    SkipBack,
    Repeat,
    Shuffle,
    Settings,
    Sliders,

    Wrench,
    Hammer,
    Scissors,
    Copy,
    Clipboard,
    File,
    FileText,
    Folder,
    Archive,
    Trash2,
    RotateCcw,
    RefreshCw,
    Download,
    Upload,
    Save,
    Power,
    LogOut,
    LogIn,
    Key,
    KeyRound,
    Fingerprint as FingerprintIcon,
    Scan,
    ScanLine,
    QrCode,
    Barcode,
    Tag,
    Bookmark,
    Flag,
    MapPin,
    Target,
    Crosshair,
    Aperture,
    Disc,
    Disc3,
    CircleDot,
    CircleOff,
    CheckCircle2,
    XCircle,
    AlertCircle,
    AlertOctagon,
    Info,
    HelpCircle,
    Plus,
    Minus,
    Divide,
    Percent,
    Hash,
    AtSign,
    DollarSign,
    Euro,
    Bitcoin
} from 'lucide-react';

// ============================================================================
// NEXUS OS — MOBILE NEURAL AUTHENTICATION TERMINAL
// Build: 3.0.7-Quantum-Handheld
// Philosophy: Experimental cyberpunk handheld OS — not a responsive desktop
// ============================================================================

const NEXUS_CONFIG = {
    BUILD: '3.0.7-Quantum-Handheld',
    CODENAME: 'ORPHEUS',
    API_LOGIN: '/login',
    API_VERIFY: '/verify',
    HEARTBEAT_MS: 15000,
    IDLE_TIMEOUT_MS: 240000,
    MAX_PARTICLES: 140,
    LOW_POWER_PARTICLES: 45,
    RARE_BOOT_CHANCE: 0.01,
    GLITCH_CHANCE: 0.0015,
    ACHIEVEMENT_KEY: 'nexus_achievements_v3',
    SESSION_KEY: 'nexus_session_meta'
};

// Shared context for cross-component state synchronization
const NexusContext = createContext(null);

// ============================================================================
// ACHIEVEMENT REGISTRY — Persistent across sessions via localStorage
// ============================================================================
const ACHIEVEMENT_REGISTRY = {
    first_light: { title: 'First Light', desc: 'Boot the terminal for the first time', icon: Sun, rarity: 'common' },
    consciousness: { title: 'Consciousness Detected', desc: 'Witness the rare boot sequence', icon: Brain, rarity: 'legendary' },
    obsidian_master: { title: 'Obsidian Master', desc: 'Unlock the obsidian theme', icon: Moon, rarity: 'rare' },
    admin_override: { title: 'Admin Override', desc: 'Enter the Konami sequence', icon: Crown, rarity: 'epic' },
    terminal_hacker: { title: 'Terminal Hacker', desc: 'Access the secret terminal', icon: TerminalIcon, rarity: 'rare' },
    matrix_pilot: { title: 'Matrix Pilot', desc: 'Enter the matrix', icon: Code2, rarity: 'rare' },
    gravity_well: { title: 'Gravity Well', desc: 'Collapse particles with space', icon: Orbit, rarity: 'epic' },
    orb_whisperer: { title: 'Orb Whisperer', desc: 'Tap the orb 20 times', icon: CircleDot, rarity: 'epic' },
    unbreakable: { title: 'Unbreakable', desc: 'Use the legendary passphrase', icon: Shield, rarity: 'legendary' },
    hacker_joke: { title: 'Hacker Joke', desc: 'Fail 10 times', icon: Skull, rarity: 'rare' },
    night_owl: { title: 'Night Owl', desc: 'Login after 2AM', icon: Moon, rarity: 'common' },
    coffee_brew: { title: 'Coffee Brew', desc: 'Developer fatigue detected', icon: Flame, rarity: 'rare' },
    sesame_opener: { title: 'Sesame Opener', desc: 'Speak the magic words', icon: Key, rarity: 'epic' },
    glitch_walker: { title: 'Glitch Walker', desc: 'Survive a reality glitch', icon: Bug, rarity: 'rare' },
    pet_keeper: { title: 'Pet Keeper', desc: 'Hatch a digital companion', icon: Bot, rarity: 'epic' },
    star_gazer: { title: 'Star Gazer', desc: 'Tap 50 background stars', icon: Star, rarity: 'rare' },
    black_hole: { title: 'Event Horizon', desc: 'Open a black hole', icon: Circle, rarity: 'legendary' },
    time_traveler: { title: 'Time Traveler', desc: 'Bend the temporal flow', icon: Rocket, rarity: 'legendary' },
    signal_ghost: { title: 'Signal Ghost', desc: 'Catch a ghost transmission', icon: Ghost, rarity: 'legendary' },
    cosmic_witness: { title: 'Cosmic Witness', desc: 'Observe a cosmic event', icon: Sparkles, rarity: 'legendary' },
    puzzle_solver: { title: 'Puzzle Solver', desc: 'Solve the hidden cipher', icon: HelpCircle, rarity: 'epic' },
    firmware_hacker: { title: 'Firmware Hacker', desc: 'Trigger fake firmware update', icon: Cpu, rarity: 'rare' },
    emotion_reader: { title: 'Emotion Reader', desc: 'Scan your emotional state', icon: Heart, rarity: 'rare' },
    reality_bender: { title: 'Reality Bender', desc: 'Distort reality itself', icon: Atom, rarity: 'legendary' },
    satellite_link: { title: 'Satellite Link', desc: 'Establish orbital connection', icon: Satellite, rarity: 'epic' },
    dev_diary: { title: 'Dev Diary', desc: 'Read the lost developer logs', icon: FileText, rarity: 'rare' }
};

const loadAchievements = () => {
    try {
        const raw = localStorage.getItem(NEXUS_CONFIG.ACHIEVEMENT_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const saveAchievements = (list) => {
    try {
        localStorage.setItem(NEXUS_CONFIG.ACHIEVEMENT_KEY, JSON.stringify(list));
    } catch { /* silent */ }
};

// ============================================================================
// HAPTIC + DEVICE CAPABILITY UTILITIES
// ============================================================================
const vibrate = (pattern) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(pattern); } catch { /* silent */ }
    }
};

const useDeviceCapabilities = () => {
    const [cap, setCap] = useState({
        isLowPower: false,
        batteryLevel: 1,
        isCharging: true,
        hasVibration: typeof navigator !== 'undefined' && !!navigator.vibrate,
        isTouchDevice: typeof window !== 'undefined' && 'ontouchstart' in window
    });

    useEffect(() => {
        let mounted = true;
        if (typeof navigator !== 'undefined' && navigator.getBattery) {
            navigator.getBattery().then((batt) => {
                if (!mounted) return;
                const update = () => {
                    setCap({
                        isLowPower: batt.level < 0.2 && !batt.charging,
                        batteryLevel: batt.level,
                        isCharging: batt.charging,
                        hasVibration: !!navigator.vibrate,
                        isTouchDevice: 'ontouchstart' in window
                    });
                };
                update();
                batt.addEventListener('levelchange', update);
                batt.addEventListener('chargingchange', update);
            }).catch(() => { });
        }
        return () => { mounted = false; };
    }, []);

    return cap;
};

// ============================================================================
// NEURAL BACKGROUND — Living quantum field rendered on canvas
// ============================================================================
const NeuralBackground = memo(({ theme, isOffline, intensity = 1 }) => {
    const canvasRef = useRef(null);
    const rafRef = useRef(null);
    const nodesRef = useRef([]);
    const mouseRef = useRef({ x: 0, y: 0, active: false });
    const reducedMotion = useReducedMotion();

    const palette = useMemo(() => {
        if (isOffline) return { core: '#1a1a22', accent: '#3b3b4a', glow: '#5a5a6e' };
        switch (theme) {
            case 'obsidian': return { core: '#0a0a0f', accent: '#6d28d9', glow: '#a855f7' };
            case 'matrix': return { core: '#000a00', accent: '#16a34a', glow: '#4ade80' };
            case 'ember': return { core: '#1a0505', accent: '#dc2626', glow: '#f87171' };
            case 'aurora': return { core: '#051a1a', accent: '#0891b2', glow: '#22d3ee' };
            case 'nexus':
            default: return { core: '#0a0515', accent: '#7c3aed', glow: '#c084fc' };
        }
    }, [theme, isOffline]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
        };
        resize();
        window.addEventListener('resize', resize);

        // Initialize neural nodes
        const w = canvas.getBoundingClientRect().width;
        const h = canvas.getBoundingClientRect().height;
        const nodeCount = 80;
        nodesRef.current = Array.from({ length: nodeCount }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            radius: Math.random() * 1.5 + 0.5,
            phase: Math.random() * Math.PI * 2
        }));

        const onMove = (e) => {
            const t = e.touches?.[0];
            if (t) {
                mouseRef.current.x = t.clientX;
                mouseRef.current.y = t.clientY;
                mouseRef.current.active = true;
            }
        };
        const onEnd = () => { mouseRef.current.active = false; };
        window.addEventListener('touchmove', onMove, { passive: true });
        window.addEventListener('touchend', onEnd);
        window.addEventListener('mousemove', onMove);

        const connectionDistance = 130;

        const render = () => {
            const rect = canvas.getBoundingClientRect();
            const W = rect.width;
            const H = rect.height;

            ctx.clearRect(0, 0, W, H);

            // Update nodes
            const nodes = nodesRef.current;
            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                n.x += n.vx * intensity;
                n.y += n.vy * intensity;
                n.phase += 0.02;

                if (n.x < 0 || n.x > W) n.vx *= -1;
                if (n.y < 0 || n.y > H) n.vy *= -1;

                // Mouse attraction
                if (mouseRef.current.active) {
                    const dx = mouseRef.current.x - n.x;
                    const dy = mouseRef.current.y - n.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 180) {
                        n.vx += (dx / dist) * 0.02;
                        n.vy += (dy / dist) * 0.02;
                    }
                }

                // Damping
                n.vx *= 0.99;
                n.vy *= 0.99;
            }

            // Draw connections
            ctx.lineWidth = 0.5;
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const a = nodes[i];
                    const b = nodes[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < connectionDistance) {
                        const alpha = (1 - dist / connectionDistance) * 0.35;
                        ctx.strokeStyle = `${palette.glow}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                    }
                }
            }

            // Draw nodes
            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                const pulse = 0.6 + Math.sin(n.phase) * 0.4;
                ctx.fillStyle = palette.glow;
                ctx.globalAlpha = pulse * 0.8;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            rafRef.current = requestAnimationFrame(render);
        };

        if (!reducedMotion) {
            render();
        } else {
            // Static render for reduced motion
            const nodes = nodesRef.current;
            const W = canvas.getBoundingClientRect().width;
            const H = canvas.getBoundingClientRect().height;
            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = palette.glow;
            ctx.globalAlpha = 0.4;
            for (const n of nodes) {
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', resize);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onEnd);
            window.removeEventListener('mousemove', onMove);
        };
    }, [palette, intensity, reducedMotion]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            style={{ mixBlendMode: 'screen', opacity: 0.7 }}
        />
    );
});

// ============================================================================
// AMBIENT GRADIENT LAYER — Living color field
// ============================================================================
const AmbientGradient = memo(({ theme, isOffline }) => {
    const reducedMotion = useReducedMotion();

    const gradient = useMemo(() => {
        if (isOffline) return 'radial-gradient(circle at 50% 30%, #1a1a22 0%, #050507 100%)';
        switch (theme) {
            case 'obsidian': return 'radial-gradient(circle at 50% 30%, #1a0a2e 0%, #050208 100%)';
            case 'matrix': return 'radial-gradient(circle at 50% 30%, #001a0a 0%, #000502 100%)';
            case 'ember': return 'radial-gradient(circle at 50% 30%, #2a0505 0%, #0a0202 100%)';
            case 'aurora': return 'radial-gradient(circle at 50% 30%, #052020 0%, #020a0a 100%)';
            default: return 'radial-gradient(circle at 50% 30%, #1a0a2e 0%, #050208 100%)';
        }
    }, [theme, isOffline]);

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            <motion.div
                className="absolute inset-0"
                animate={{ background: gradient }}
                transition={{ duration: 2, ease: 'easeInOut' }}
            />
            {!reducedMotion && (
                <>
                    <motion.div
                        className="absolute top-[-15%] left-[-20%] w-[70%] h-[50%] rounded-full opacity-[0.15]"
                        style={{
                            background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)',
                            filter: 'blur(120px)',
                            mixBlendMode: 'plus-lighter'
                        }}
                        animate={{
                            x: [0, 50, -30, 0],
                            y: [0, -40, 30, 0],
                            scale: [1, 1.2, 0.9, 1]
                        }}
                        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                        className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[45%] rounded-full opacity-[0.12]"
                        style={{
                            background: 'radial-gradient(circle, #38bdf8 0%, transparent 70%)',
                            filter: 'blur(110px)',
                            mixBlendMode: 'plus-lighter'
                        }}
                        animate={{
                            x: [0, -40, 20, 0],
                            y: [0, 30, -20, 0],
                            scale: [1, 0.9, 1.15, 1]
                        }}
                        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </>
            )}
        </div>
    );
});

// ============================================================================
// STATUS BAR — Futuristic handheld OS header
// ============================================================================
const StatusBar = memo(({ time, battery, isCharging, isOnline, signalStrength }) => {
    return (
        <div className="fixed top-0 left-0 right-0 z-50 px-5 pt-3 pb-2 flex items-center justify-between text-[10px] font-mono tracking-widest text-white/70 pointer-events-none">
            <div className="flex items-center gap-2">
                <motion.div
                    className="flex items-center gap-1"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <Hexagon className="w-3 h-3 text-purple-400" />
                    <span className="text-purple-300 font-bold">NEXUS</span>
                </motion.div>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                    {isOnline ? (
                        <>
                            <Signal className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">{signalStrength}</span>
                        </>
                    ) : (
                        <>
                            <WifiOff className="w-3 h-3 text-red-400" />
                            <span className="text-red-400">OFF</span>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {isCharging ? (
                        <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                        <Battery className="w-3.5 h-3.5 text-white/70" />
                    )}
                    <span>{Math.round(battery * 100)}</span>
                </div>
                <span className="text-white/90 font-bold">{time}</span>
            </div>
        </div>
    );
});

// ============================================================================
// IDENTITY ORB — Central holographic authentication core
// ============================================================================
const IdentityOrb = memo(({
    state,
    theme,
    forceSurge,
    onTap,
    onHoldStart,
    onHoldEnd,
    onSwipe,
    winking,
    isOffline
}) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const springX = useSpring(x, { damping: 22, stiffness: 200, mass: 0.8 });
    const springY = useSpring(y, { damping: 22, stiffness: 200, mass: 0.8 });
    const rotX = useTransform(springY, [-60, 60], [12, -12]);
    const rotY = useTransform(springX, [-60, 60], [-12, 12]);

    const handleMove = (e) => {
        if (state === 'imploding' || state === 'gathering') return;
        const rect = e.currentTarget.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        x.set(e.clientX - cx);
        y.set(e.clientY - cy);
    };

    const handleLeave = () => {
        x.set(0);
        y.set(0);
    };

    const orbGradient = useMemo(() => {
        if (isOffline) return ['#3b3b4a', '#1a1a22'];
        switch (theme) {
            case 'obsidian': return ['#6d28d9', '#1e1b4b'];
            case 'matrix': return ['#16a34a', '#052e16'];
            case 'ember': return ['#dc2626', '#450a0a'];
            case 'aurora': return ['#0891b2', '#083344'];
            default: return ['#a855f7', '#4c1d95'];
        }
    }, [theme, isOffline]);

    return (
        <motion.div
            className="relative w-44 h-44 mx-auto mb-8 flex items-center justify-center cursor-grab active:cursor-grabbing z-20 select-none touch-none"
            onPointerMove={handleMove}
            onPointerLeave={handleLeave}
            onClick={onTap}
            onPointerDown={onHoldStart}
            onPointerUp={onHoldEnd}
            onPan={(e, info) => {
                if (info.offset.y > 55 && onSwipe) onSwipe();
            }}
            style={{
                perspective: 800,
                x: springX,
                y: springY,
                rotateX: rotX,
                rotateY: rotY
            }}
            animate={
                state === 'imploding'
                    ? { scale: [1, 1.2, 0], rotate: [0, 360, 1080], filter: 'blur(0px) brightness(2.5)' }
                    : { scale: 1, rotate: 0 }
            }
            transition={{ duration: 1.6, ease: [0.76, 0, 0.24, 1] }}
        >
            {/* Outer halo ring */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                    background: `conic-gradient(from 0deg, ${orbGradient[0]}00, ${orbGradient[0]}cc, ${orbGradient[0]}00, ${orbGradient[1]}cc, ${orbGradient[0]}00)`,
                    filter: 'blur(20px)',
                    opacity: 0.6
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            />

            {/* Middle ring */}
            <motion.div
                className="absolute inset-3 rounded-full border"
                style={{ borderColor: `${orbGradient[0]}40` }}
                animate={{
                    scale: forceSurge ? [1, 1.15, 1] : [1, 1.05, 1],
                    opacity: state === 'gathering' ? [0.6, 1, 0.6] : [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Core orb */}
            <motion.div
                className="absolute inset-6 rounded-full"
                style={{
                    background: `radial-gradient(circle at 30% 30%, ${orbGradient[0]}, ${orbGradient[1]})`,
                    boxShadow: `0 0 60px ${orbGradient[0]}80, inset 0 0 40px ${orbGradient[0]}40`
                }}
                animate={{
                    scale: [1, 1.03, 1],
                    filter: state === 'gathering' ? 'brightness(1.5)' : 'brightness(1)'
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Inner scan lines */}
            <motion.div
                className="absolute inset-8 rounded-full overflow-hidden"
                style={{
                    background: `repeating-linear-gradient(0deg, transparent 0px, transparent 3px, ${orbGradient[0]}20 3px, ${orbGradient[0]}20 4px)`
                }}
                animate={{ rotate: -360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            />

            {/* Center eye / sensor */}
            <AnimatePresence>
                {winking ? (
                    <motion.div
                        className="absolute w-6 h-6 rounded-full bg-white z-10"
                        style={{ boxShadow: '0 0 20px white' }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    />
                ) : (
                    <motion.div
                        className="absolute w-3 h-3 rounded-full bg-white/80 z-10"
                        style={{ boxShadow: '0 0 15px white' }}
                        animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                )}
            </AnimatePresence>

            {/* Orbital particles */}
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full"
                    style={{
                        background: orbGradient[0],
                        boxShadow: `0 0 8px ${orbGradient[0]}`
                    }}
                    animate={{
                        rotate: 360,
                        x: [0, 70, 0, -70, 0],
                        y: [0, -30, 0, 30, 0]
                    }}
                    transition={{
                        duration: 6 + i * 2,
                        repeat: Infinity,
                        ease: 'linear',
                        delay: i * 0.5
                    }}
                />
            ))}
        </motion.div>
    );
});

// ============================================================================
// FLOATING AUTH CARD — Glassmorphic login panel
// ============================================================================
const FloatingAuthCard = memo(({
    mode,
    setMode,
    username,
    setUsername,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    togglePassword,
    onSubmit,
    isProcessing,
    isOffline,
    error,
    passwordStrength,
    rememberMe,
    toggleRemember
}) => {
    return (
        <motion.div
            className="w-full max-w-sm mx-auto relative z-20"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
            {/* Glassmorphic container */}
            <div className="relative rounded-3xl p-6 bg-white/[0.04] backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden">
                {/* Animated border glow */}
                <motion.div
                    className="absolute inset-0 rounded-3xl pointer-events-none"
                    style={{
                        background: 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, transparent 50%, rgba(56,189,248,0.15) 100%)'
                    }}
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 4, repeat: Infinity }}
                />

                {/* Noise texture overlay */}
                <div
                    className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
                    }}
                />

                <form onSubmit={onSubmit} className="relative space-y-4">
                    {/* Toggle mode */}
                    <div className="flex justify-center mb-4">
                        <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
                            <button
                                type="button"
                                onClick={() => setMode('login')}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-mono tracking-widest transition-all ${mode === 'login' ? 'bg-purple-500/50 text-white shadow-lg shadow-purple-500/20' : 'text-white/40 hover:text-white/80'}`}
                            >
                                LOGIN
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('signup')}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-mono tracking-widest transition-all ${mode === 'signup' ? 'bg-purple-500/50 text-white shadow-lg shadow-purple-500/20' : 'text-white/40 hover:text-white/80'}`}
                            >
                                SIGNUP
                            </button>
                        </div>
                    </div>

                    {mode === 'signup' && (
                        <GlassInput
                            type="text"
                            placeholder="new user"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            icon={User}
                            disabled={isProcessing}
                            label="USERNAME"
                        />
                    )}

                    {/* Email field */}
                    <GlassInput
                        type="email"
                        placeholder="identity@nexus.os"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        icon={User}
                        disabled={isProcessing}
                        label="IDENTITY"
                    />

                    {/* Password field */}
                    <GlassInput
                        type={showPassword ? 'text' : 'password'}
                        placeholder="cryptographic cipher"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        icon={Lock}
                        disabled={isProcessing}
                        label="CIPHER"
                        trailing={
                            <button
                                type="button"
                                onClick={togglePassword}
                                className="p-1 text-white/40 hover:text-white/80 transition-colors"
                                disabled={isProcessing}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        }
                    />

                    {/* Password strength indicator */}
                    {password && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-1.5"
                        >
                            <div className="flex gap-1">
                                {[0, 1, 2, 3].map((i) => (
                                    <motion.div
                                        key={i}
                                        className="flex-1 h-0.5 rounded-full"
                                        style={{
                                            background: i < passwordStrength.level
                                                ? passwordStrength.color
                                                : 'rgba(255,255,255,0.1)'
                                        }}
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        transition={{ delay: i * 0.05 }}
                                    />
                                ))}
                            </div>
                            <div className="flex justify-between text-[9px] font-mono tracking-widest">
                                <span style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
                                <span className="text-white/30">{passwordStrength.entropy} bits</span>
                            </div>
                        </motion.div>
                    )}

                    {/* Remember me + Forgot */}
                    <div className="flex items-center justify-between text-[10px]">
                        <button
                            type="button"
                            onClick={toggleRemember}
                            className="flex items-center gap-1.5 text-white/50 hover:text-white/80 transition-colors"
                        >
                            <div className={`w-3 h-3 rounded border transition-all ${rememberMe ? 'bg-purple-500 border-purple-400' : 'border-white/30'}`}>
                                {rememberMe && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className="font-mono tracking-wider">REMEMBER</span>
                        </button>
                        <button
                            type="button"
                            className="text-purple-300/70 hover:text-purple-300 font-mono tracking-wider transition-colors"
                        >
                            RECOVER
                        </button>
                    </div>

                    {/* Submit button */}
                    <motion.button
                        type="submit"
                        disabled={isProcessing || isOffline}
                        className="relative w-full h-14 rounded-2xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-blue-500 text-white font-bold tracking-widest uppercase text-sm overflow-hidden disabled:opacity-40 shadow-lg shadow-purple-500/30"
                        whileTap={{ scale: 0.97 }}
                        whileHover={{ scale: 1.02 }}
                    >
                        {/* Animated sheen */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                            animate={isProcessing ? { x: ['-100%', '200%'] } : {}}
                            transition={isProcessing ? { duration: 1.5, repeat: Infinity, ease: 'linear' } : {}}
                        />
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            {isProcessing ? (
                                <>
                                    <motion.div
                                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                                    />
                                    <span className="text-xs">AUTHENTICATING</span>
                                </>
                            ) : (
                                <>
                                    <Fingerprint className="w-4 h-4" />
                                    <span>INITIATE HANDSHAKE</span>
                                </>
                            )}
                        </span>
                    </motion.button>
                </form>
            </div>
        </motion.div>
    );
});

// ============================================================================
// GLASS INPUT — Reusable glassmorphic input field
// ============================================================================
const GlassInput = memo(({
    type,
    placeholder,
    value,
    onChange,
    icon: Icon,
    disabled,
    label,
    trailing,
    error
}) => {
    const [focused, setFocused] = useState(false);

    return (
        <div className="relative group">
            {label && (
                <div className="text-[9px] font-mono tracking-[0.2em] text-white/40 mb-1.5 pl-1">
                    {label}
                </div>
            )}
            <div
                className={`relative flex items-center px-4 py-3.5 rounded-2xl bg-white/[0.03] border transition-all duration-300 ${error
                    ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                    : focused
                        ? 'border-purple-400/50 shadow-[0_0_25px_rgba(168,85,247,0.2)]'
                        : 'border-white/10 hover:border-white/20'
                    }`}
            >
                {Icon && (
                    <Icon
                        className={`w-4 h-4 mr-3 transition-all ${focused ? 'text-purple-300' : 'text-white/30'
                            }`}
                    />
                )}
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    disabled={disabled}
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/25 text-sm font-light tracking-wide disabled:opacity-40"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                />
                {trailing}

                {/* Focus shimmer */}
                <AnimatePresence>
                    {focused && (
                        <motion.div
                            className="absolute bottom-0 left-4 right-4 h-px overflow-hidden pointer-events-none"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.div
                                className="w-20 h-full bg-gradient-to-r from-transparent via-purple-400 to-transparent"
                                animate={{ x: [-80, 300] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
});

// ============================================================================
// SECRET TERMINAL — Hidden command interface
// ============================================================================
const SecretTerminal = memo(({ onClose, onCommand }) => {
    const [input, setInput] = useState('');
    const [history, setHistory] = useState([
        { type: 'system', text: 'NEXUS TERMINAL v3.0.7' },
        { type: 'system', text: 'Type "help" for available commands.' }
    ]);
    const inputRef = useRef(null);
    const scrollRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history]);

    const handleCommand = (cmd) => {
        const trimmed = cmd.trim().toLowerCase();
        const newHistory = [...history, { type: 'input', text: `> ${cmd}` }];

        let response = [];
        switch (trimmed) {
            case 'help':
                response = [
                    { type: 'info', text: 'Available commands:' },
                    { type: 'cmd', text: '  help      - Show this message' },
                    { type: 'cmd', text: '  status    - System status' },
                    { type: 'cmd', text: '  version   - Build info' },
                    { type: 'cmd', text: '  about     - About NEXUS' },
                    { type: 'cmd', text: '  theme     - List themes' },
                    { type: 'cmd', text: '  clear     - Clear terminal' },
                    { type: 'cmd', text: '  whoami    - Identity check' },
                    { type: 'cmd', text: '  matrix    - Enter the matrix' },
                    { type: 'cmd', text: '  exit      - Close terminal' }
                ];
                break;
            case 'status':
                response = [
                    { type: 'info', text: 'Core: ONLINE' },
                    { type: 'info', text: 'Neural Link: STABLE' },
                    { type: 'info', text: 'Quantum State: COHERENT' },
                    { type: 'info', text: `Uptime: ${Math.floor(performance.now() / 1000)}s` }
                ];
                break;
            case 'version':
                response = [
                    { type: 'info', text: `Build: ${NEXUS_CONFIG.BUILD}` },
                    { type: 'info', text: `Codename: ${NEXUS_CONFIG.CODENAME}` },
                    { type: 'info', text: `React: ${React.version}` }
                ];
                break;
            case 'about':
                response = [
                    { type: 'info', text: 'NEXUS OS — Neural Authentication Terminal' },
                    { type: 'info', text: 'A cyberpunk handheld operating system.' },
                    { type: 'info', text: 'Built with React, Framer Motion, and dreams.' }
                ];
                break;
            case 'theme':
                response = [
                    { type: 'info', text: 'Available themes: nexus, obsidian, matrix, ember, aurora' }
                ];
                break;
            case 'clear':
                setHistory([]);
                setInput('');
                return;
            case 'whoami':
                response = [{ type: 'info', text: 'user@nexus:~$ identity unknown' }];
                break;
            case 'matrix':
                onCommand('matrix');
                response = [{ type: 'success', text: 'Entering the matrix...' }];
                break;
            case 'exit':
                onClose();
                return;
            default:
                response = [{ type: 'error', text: `Command not found: ${trimmed}` }];
        }

        setHistory([...newHistory, ...response]);
        setInput('');
    };

    const colorFor = (type) => {
        switch (type) {
            case 'system': return 'text-purple-400';
            case 'input': return 'text-white/80';
            case 'info': return 'text-cyan-300';
            case 'cmd': return 'text-white/50';
            case 'success': return 'text-emerald-400';
            case 'error': return 'text-red-400';
            default: return 'text-white/60';
        }
    };

    return (
        <motion.div
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col p-4 font-mono text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <TerminalIcon className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-300 tracking-widest">NEXUS TERMINAL</span>
                </div>
                <button
                    onClick={onClose}
                    className="text-white/40 hover:text-white/80 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto space-y-1 pb-2"
            >
                {history.map((entry, i) => (
                    <div key={i} className={colorFor(entry.type)}>
                        {entry.text}
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <span className="text-purple-400">$</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCommand(input);
                    }}
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/20"
                    placeholder="type command..."
                    autoComplete="off"
                    spellCheck="false"
                />
            </div>
        </motion.div>
    );
});

// ============================================================================
// MATRIX RAIN — Digital rain effect
// ============================================================================
const MatrixRain = memo(({ onClose }) => {
    const canvasRef = useRef(null);
    const rafRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        const resize = () => {
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.scale(dpr, dpr);
        };
        resize();

        const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789NEXUS';
        const fontSize = 14;
        const columns = Math.floor(window.innerWidth / fontSize);
        const drops = Array(columns).fill(1);

        const render = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

            ctx.fillStyle = '#4ade80';
            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const text = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > window.innerHeight && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }

            rafRef.current = requestAnimationFrame(render);
        };
        render();

        window.addEventListener('resize', resize);
        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <motion.div
            className="fixed inset-0 z-[90] bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <canvas ref={canvasRef} className="w-full h-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-green-400 font-mono text-xl tracking-widest pointer-events-none">
                WAKE UP, NEO...
            </div>
        </motion.div>
    );
});

// ============================================================================
// ACHIEVEMENT TOAST — Futuristic notification
// ============================================================================
const AchievementToast = memo(({ achievement, onClose }) => {
    const Icon = achievement.icon;
    const rarityColors = {
        common: 'from-slate-500 to-slate-700',
        rare: 'from-blue-500 to-blue-700',
        epic: 'from-purple-500 to-purple-700',
        legendary: 'from-amber-500 to-orange-700'
    };

    useEffect(() => {
        const t = setTimeout(onClose, 4500);
        return () => clearTimeout(t);
    }, [onClose]);

    return (
        <motion.div
            className="fixed top-20 left-4 right-4 z-[200] pointer-events-none"
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20 }}
        >
            <div className={`relative rounded-2xl p-4 bg-gradient-to-r ${rarityColors[achievement.rarity]} shadow-2xl overflow-hidden`}>
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
                <div className="relative flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-black/30 flex items-center justify-center backdrop-blur-sm">
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                        <div className="text-[9px] font-mono tracking-widest text-white/70 uppercase">
                            Achievement Unlocked
                        </div>
                        <div className="text-white font-bold text-sm">{achievement.title}</div>
                        <div className="text-white/70 text-xs">{achievement.desc}</div>
                    </div>
                    <div className="text-[9px] font-mono tracking-widest text-white/60 uppercase">
                        {achievement.rarity}
                    </div>
                </div>
            </div>
        </motion.div>
    );
});

// ============================================================================
// GRAVITY WELL — Particle collapse effect
// ============================================================================
const GravityWell = memo(({ active, cursorPos }) => {
    const canvasRef = useRef(null);
    const rafRef = useRef(null);
    const particlesRef = useRef([]);

    useEffect(() => {
        if (!active) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.scale(dpr, dpr);

        // Initialize particles around cursor
        particlesRef.current = Array.from({ length: 100 }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: 0,
            vy: 0,
            size: Math.random() * 3 + 1,
            hue: Math.random() * 60 + 260
        }));

        const render = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

            const particles = particlesRef.current;
            for (const p of particles) {
                const dx = cursorPos.x - p.x;
                const dy = cursorPos.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const force = Math.min(50 / (dist + 1), 2);

                p.vx += (dx / dist) * force * 0.3;
                p.vy += (dy / dist) * force * 0.3;
                p.vx *= 0.95;
                p.vy *= 0.95;
                p.x += p.vx;
                p.y += p.vy;

                ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, 0.8)`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }

            rafRef.current = requestAnimationFrame(render);
        };
        render();

        return () => cancelAnimationFrame(rafRef.current);
    }, [active, cursorPos]);

    if (!active) return null;

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-[80] pointer-events-none"
            style={{ mixBlendMode: 'screen' }}
        />
    );
});

// ============================================================================
// BLACK HOLE — Event horizon effect
// ============================================================================
const BlackHole = memo(({ active, onDone }) => {
    useEffect(() => {
        if (active) {
            const t = setTimeout(onDone, 4000);
            return () => clearTimeout(t);
        }
    }, [active, onDone]);

    if (!active) return null;

    return (
        <motion.div
            className="fixed inset-0 z-[85] flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="w-4 h-4 rounded-full bg-black"
                style={{ boxShadow: '0 0 100px 50px rgba(0,0,0,0.8), 0 0 200px 100px rgba(168,85,247,0.3)' }}
                animate={{
                    scale: [1, 80],
                    rotate: [0, 720]
                }}
                transition={{ duration: 4, ease: [0.76, 0, 0.24, 1] }}
            />
            <motion.div
                className="absolute inset-0"
                style={{
                    background: 'radial-gradient(circle, transparent 30%, rgba(168,85,247,0.2) 50%, transparent 70%)'
                }}
                animate={{ rotate: 360, scale: [1, 1.5, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />
        </motion.div>
    );
});

// ============================================================================
// DIGITAL PET — Tiny companion
// ============================================================================
const DigitalPet = memo(({ active, onClose }) => {
    const [mood, setMood] = useState('happy');
    const [pos, setPos] = useState({ x: 50, y: 50 });

    useEffect(() => {
        if (!active) return;
        const interval = setInterval(() => {
            setPos({
                x: 20 + Math.random() * 60,
                y: 30 + Math.random() * 40
            });
            const moods = ['happy', 'curious', 'sleepy', 'excited'];
            setMood(moods[Math.floor(Math.random() * moods.length)]);
        }, 3000);
        return () => clearInterval(interval);
    }, [active]);

    if (!active) return null;

    const faceFor = (m) => {
        switch (m) {
            case 'happy': return '◕‿◕';
            case 'curious': return '◕_◕';
            case 'sleepy': return '−‿−';
            case 'excited': return '◕ヮ◕';
            default: return '◕‿◕';
        }
    };

    return (
        <motion.div
            className="fixed z-[70] pointer-events-auto cursor-grab active:cursor-grabbing"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            animate={{ x: 0, y: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            onClick={() => {
                vibrate(10);
                setMood('excited');
            }}
            onDoubleClick={onClose}
        >
            <motion.div
                className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-2xl shadow-purple-500/50"
                animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                {faceFor(mood)}
            </motion.div>
            <div className="text-center text-[9px] font-mono text-white/60 mt-1 tracking-widest">
                {mood.toUpperCase()}
            </div>
        </motion.div>
    );
});

// ============================================================================
// GLITCH EFFECT — Random reality distortion
// ============================================================================
const GlitchOverlay = memo(({ active }) => {
    if (!active) return null;
    return (
        <motion.div
            className="fixed inset-0 z-[95] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.3 }}
        >
            <div className="absolute inset-0 bg-red-500/10 mix-blend-overlay" />
            <div className="absolute inset-0" style={{
                background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(255,0,0,0.1) 2px, rgba(255,0,0,0.1) 4px)',
                animation: 'glitch 0.3s steps(2) infinite'
            }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500 font-mono text-4xl font-bold tracking-widest">
                GLITCH
            </div>
        </motion.div>
    );
});

// ============================================================================
// FIRMWARE UPDATE — Fake update screen
// ============================================================================
const FirmwareUpdate = memo(({ active, onDone }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!active) return;
        const interval = setInterval(() => {
            setProgress((p) => {
                if (p >= 100) {
                    clearInterval(interval);
                    setTimeout(onDone, 500);
                    return 100;
                }
                return p + Math.random() * 8;
            });
        }, 200);
        return () => clearInterval(interval);
    }, [active, onDone]);

    if (!active) return null;

    return (
        <motion.div
            className="fixed inset-0 z-[95] bg-black flex flex-col items-center justify-center p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="w-20 h-20 rounded-full border-4 border-purple-500 border-t-transparent mb-6"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <div className="text-white font-mono text-sm tracking-widest mb-2">
                FIRMWARE UPDATE
            </div>
            <div className="text-white/60 font-mono text-xs mb-6">
                NEXUS OS v3.0.7 → v3.0.8
            </div>
            <div className="w-full max-w-xs h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                />
            </div>
            <div className="text-white/40 font-mono text-xs mt-3">
                {Math.min(Math.floor(progress), 100)}%
            </div>
            <div className="text-white/30 font-mono text-[10px] mt-8 text-center">
                {progress >= 100 ? 'Update complete. Just kidding.' : 'Installing neural patches...'}
            </div>
        </motion.div>
    );
});

// ============================================================================
// SIGNAL GHOST — Rare transmission event
// ============================================================================
const SignalGhost = memo(({ active, onDone }) => {
    useEffect(() => {
        if (active) {
            const t = setTimeout(onDone, 5000);
            return () => clearTimeout(t);
        }
    }, [active, onDone]);

    if (!active) return null;

    return (
        <motion.div
            className="fixed inset-0 z-[88] flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="relative"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                <Ghost className="w-32 h-32 text-purple-300/60" />
                <motion.div
                    className="absolute inset-0 flex items-center justify-center text-white/80 font-mono text-xs tracking-widest"
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    UNKNOWN TRANSMISSION
                </motion.div>
            </motion.div>
        </motion.div>
    );
});

// ============================================================================
// MAIN LOGIN COMPONENT — NEXUS Mobile Authentication Terminal
// ============================================================================
export default function LoginMobile2() {
    const navigate = useNavigate();
    const capabilities = useDeviceCapabilities();

    // Core auth state
    const [mode, setMode] = useState('login');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [rememberMe, setRememberMe] = useState(false);
    const [systemState, setSystemState] = useState('idle'); // idle | verifying | gathering | imploding
    const [statusMessage, setStatusMessage] = useState('');

    // Theme + visual state
    const [theme, setTheme] = useState('nexus');
    const [forceSurge, setForceSurge] = useState(false);
    const [winking, setWinking] = useState(false);

    // Time + battery display
    const [currentTime, setCurrentTime] = useState('');
    const [signalStrength, setSignalStrength] = useState('5G');

    // Achievement system
    const [achievements, setAchievements] = useState(loadAchievements());
    const [activeToast, setActiveToast] = useState(null);

    // Easter egg states
    const [konamiProgress, setKonamiProgress] = useState(0);
    const [logoTaps, setLogoTaps] = useState(0);
    const [failedLogins, setFailedLogins] = useState(0);
    const [showTerminal, setShowTerminal] = useState(false);
    const [showMatrix, setShowMatrix] = useState(false);
    const [gravityActive, setGravityActive] = useState(false);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    const [rareBoot, setRareBoot] = useState(false);
    const [showDevMode, setShowDevMode] = useState(false);
    const [versionTaps, setVersionTaps] = useState(0);
    const [showBlackHole, setShowBlackHole] = useState(false);
    const [showPet, setShowPet] = useState(false);
    const [showGlitch, setShowGlitch] = useState(false);
    const [showFirmware, setShowFirmware] = useState(false);
    const [showSignalGhost, setShowSignalGhost] = useState(false);
    const [adminMode, setAdminMode] = useState(false);
    const [starTaps, setStarTaps] = useState(0);
    const [customMessage, setCustomMessage] = useState('');
    const [bootMessage, setBootMessage] = useState('');

    // Refs
    const logoHoldRef = useRef(null);
    const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    const konamiRef = useRef(0);

    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    useEffect(() => {
        // Rare boot check (1 in 100)
        if (Math.random() < NEXUS_CONFIG.RARE_BOOT_CHANCE) {
            setRareBoot(true);
            setBootMessage('Consciousness detected.');
            unlockAchievement('consciousness');
            setTimeout(() => setRareBoot(false), 4000);
        } else {
            // Normal boot messages
            const msgs = [
                'Neural link established.',
                'Quantum state coherent.',
                'Identity matrix loaded.',
                'Awaiting authentication.'
            ];
            setBootMessage(msgs[Math.floor(Math.random() * msgs.length)]);
        }

        // First boot achievement
        if (achievements.length === 0) {
            unlockAchievement('first_light');
        }

        // Time updater
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
        };
        updateTime();
        const timeInterval = setInterval(updateTime, 1000);

        // Online/offline listeners
        const goOnline = () => setIsOffline(false);
        const goOffline = () => setIsOffline(true);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);

        // Night owl check
        const hour = new Date().getHours();
        if (hour >= 2 && hour < 5) {
            unlockAchievement('night_owl');
            setCustomMessage('Developer fatigue detected. Coffee recommended.');
            unlockAchievement('coffee_brew');
        }

        return () => {
            clearInterval(timeInterval);
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    // ============================================================================
    // ACHIEVEMENT SYSTEM
    // ============================================================================
    const unlockAchievement = useCallback((id) => {
        if (achievements.includes(id)) return;
        const def = ACHIEVEMENT_REGISTRY[id];
        if (!def) return;
        const newList = [...achievements, id];
        setAchievements(newList);
        saveAchievements(newList);
        setActiveToast(def);
        vibrate([30, 50, 30]);
    }, [achievements]);

    // ============================================================================
    // PASSWORD STRENGTH CALCULATOR
    // ============================================================================
    const passwordStrength = useMemo(() => {
        if (!password) return { level: 0, label: '', color: '#666', entropy: 0 };
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        const entropy = Math.floor(password.length * Math.log2(
            (/[a-z]/.test(password) ? 26 : 0) +
            (/[A-Z]/.test(password) ? 26 : 0) +
            (/[0-9]/.test(password) ? 10 : 0) +
            (/[^A-Za-z0-9]/.test(password) ? 32 : 0) + 1
        ));

        if (score <= 1) return { level: 1, label: 'WEAK', color: '#ef4444', entropy };
        if (score <= 2) return { level: 2, label: 'FAIR', color: '#f59e0b', entropy };
        if (score <= 3) return { level: 3, label: 'STRONG', color: '#10b981', entropy };
        return { level: 4, label: 'UNBREAKABLE', color: '#a855f7', entropy };
    }, [password]);

    // ============================================================================
    // KONAMI CODE LISTENER
    // ============================================================================
    useEffect(() => {
        const handleKey = (e) => {
            // Konami
            console.log("key:", e.key);
            console.log("code:", e.code);
            if (e.key === konamiSequence[konamiRef.current]) {
                konamiRef.current++;
                if (konamiRef.current === konamiSequence.length) {
                    setAdminMode(true);
                    unlockAchievement('admin_override');
                    setCustomMessage('ADMIN MODE ACTIVATED');
                    vibrate([50, 50, 50, 50, 100]);
                    konamiRef.current = 0;
                    setTimeout(() => setAdminMode(false), 10000);
                }
            } else {
                konamiRef.current = 0;
            }

            // Terminal shortcut: Ctrl+Shift+`
            if (e.ctrlKey && e.shiftKey && e.code === "Backquote") {
                e.preventDefault();
                setShowTerminal(true);
                unlockAchievement("terminal_hacker");
            }

            // Space hold for gravity
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                setGravityActive(true);
            }
        };

        const handleKeyUp = (e) => {
            if (e.code === 'Space') {
                setGravityActive(false);
                if (gravityActive) unlockAchievement('gravity_well');
            }
        };

        const handleMove = (e) => {
            const t = e.touches?.[0];
            if (t) setCursorPos({ x: t.clientX, y: t.clientY });
            else setCursorPos({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('keydown', handleKey);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('touchmove', handleMove);

        return () => {
            window.removeEventListener('keydown', handleKey);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('touchmove', handleMove);
        };
    }, [gravityActive, unlockAchievement]);

    // ============================================================================
    // RANDOM GLITCH TRIGGER
    // ============================================================================
    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() < NEXUS_CONFIG.GLITCH_CHANCE) {
                setShowGlitch(true);
                unlockAchievement('glitch_walker');
                setTimeout(() => setShowGlitch(false), 300);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [unlockAchievement]);

    // ============================================================================
    // EMAIL SECRET COMMANDS
    // ============================================================================
    useEffect(() => {
        const lower = email.trim().toLowerCase();
        if (lower === 'matrix') {
            setShowMatrix(true);
            unlockAchievement('matrix_pilot');
            setTheme('matrix');
        } else if (lower === 'open sesame') {
            unlockAchievement('sesame_opener');
            setCustomMessage('The gates have opened.');
            vibrate([30, 30, 30]);
        } else if (lower === 'correcthorsebatterystaple') {
            setCustomMessage('UNBREAKABLE PASSPHRASE DETECTED');
            unlockAchievement('unbreakable');
        }
    }, [email, unlockAchievement]);

    // ============================================================================
    // PASSWORD FUNNY MESSAGES
    // ============================================================================
    useEffect(() => {
        const lower = password.toLowerCase();
        if (lower === 'password' || lower === '123456' || lower === 'qwerty' || lower === 'admin') {
            const msgs = {
                'password': 'Really? Try harder.',
                '123456': 'A child could guess that.',
                'qwerty': 'Your fingers remember, but security does not.',
                'admin': 'Nice try, hacker.'
            };
            setCustomMessage(msgs[lower] || '');
        } else {
            if (customMessage && ['Really? Try harder.', 'A child could guess that.', 'Your fingers remember, but security does not.', 'Nice try, hacker.'].includes(customMessage)) {
                setCustomMessage('');
            }
        }
    }, [password]);

    // ============================================================================
    // AUTHENTICATION SUBMISSION
    // ============================================================================
    const API_URL =
        import.meta.env.VITE_API_URL || "http://localhost:8000";

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isOffline) {
            setError('Network offline. Gateway unreachable.');
            return;
        }
        if (mode === 'signup' && !username) {
            setError('Username required for registration.');
            return;
        }
        if (!email || !password) {
            setError('Credentials payload incomplete.');
            return;
        }

        setIsProcessing(true);
        setError(null);
        setSystemState('verifying');
        vibrate(15);

        try {
            const endpoint = mode === 'signup' ? '/signup' : '/login';
            const payload = mode === 'signup' 
                ? { username, email, password }
                : { email, password };
            
            const response = await API.post(endpoint, payload);
            const token = response.data.access_token || response.data.token;
            if (token) {
                sessionStorage.setItem('token', token);
                sessionStorage.setItem(
                    'username',
                    response.data?.user?.username || response.data?.username || email.trim().split('@')[0] || 'User'
                );
                window.dispatchEvent(new Event('sessionStorageUpdate'));
                triggerSuccessSequence();
            } else {
                throw new Error('Missing verification token.');
            }
        } catch (err) {
            setSystemState('idle');
            setIsProcessing(false);
            const msg = err.response?.data?.detail || 'Verification failed. Secure handshake declined.';
            setError(msg);
            setFailedLogins((f) => {
                const next = f + 1;
                if (next === 10) {
                    unlockAchievement('hacker_joke');
                    setCustomMessage('Just kidding. You are not a hacker.');
                    setTimeout(() => setCustomMessage(''), 4000);
                }
                return next;
            });
            vibrate([30, 60, 30]);
        }
    };

    const triggerSuccessSequence = () => {
        setSystemState('gathering');
        vibrate([40, 40, 80, 40]);
        setTimeout(() => {
            setSystemState('imploding');
            vibrate([100, 10]);
            setTimeout(() => navigate('/home'), 700);
        }, 1200);
    };

    // ============================================================================
    // LOGO INTERACTIONS
    // ============================================================================
    const handleLogoTap = () => {
        const next = logoTaps + 1;
        setLogoTaps(next);
        vibrate(8);
        if (next === 7) {
            setTheme('obsidian');
            unlockAchievement('obsidian_master');
            setCustomMessage('OBSIDIAN THEME UNLOCKED');
        }
        if (next === 20) {
            unlockAchievement('orb_whisperer');
            setCustomMessage('Orb Whisperer achievement unlocked.');
        }
        if (next === 30) {
            setShowPet(true);
            unlockAchievement('pet_keeper');
        }
    };

    const handleLogoHoldStart = () => {
        logoHoldRef.current = setTimeout(() => {
            setShowBlackHole(true);
            unlockAchievement('black_hole');
            vibrate(150);
        }, 2000);
    };

    const handleLogoHoldEnd = () => {
        clearTimeout(logoHoldRef.current);
    };

    const handleLogoSwipe = () => {
        setForceSurge(true);
        vibrate([20, 40, 20]);
        setTimeout(() => setForceSurge(false), 2500);
    };

    // ============================================================================
    // VERSION TAP (DEV MODE)
    // ============================================================================
    const handleVersionTap = () => {
        const next = versionTaps + 1;
        setVersionTaps(next);
        if (next >= 5) {
            setShowDevMode(true);
            setVersionTaps(0);
        }
    };

    // ============================================================================
    // BACKGROUND STAR TAPS
    // ============================================================================
    const handleBackgroundTap = (e) => {
        const next = starTaps + 1;
        setStarTaps(next);
        if (next === 50) {
            unlockAchievement('star_gazer');
        }
        // Triple tap corners for reality distortion
        if (e.clientX < 60 && e.clientY < 60) {
            // Top-left corner
        }
    };

    // ============================================================================
    // TERMINAL COMMAND HANDLER
    // ============================================================================
    const handleTerminalCommand = (cmd) => {
        if (cmd === 'matrix') {
            setShowMatrix(true);
            setTheme('matrix');
        }
    };

    // ============================================================================
    // RENDER
    // ============================================================================
    return (
        <div
            className="relative min-h-[100dvh] w-full text-white overflow-hidden flex flex-col items-center font-sans select-none touch-manipulation"
            onClick={handleBackgroundTap}
        >
            {/* Ambient gradient layer */}
            <AmbientGradient theme={theme} isOffline={isOffline} />

            {/* Neural network background */}
            <NeuralBackground theme={theme} isOffline={isOffline} intensity={forceSurge ? 2 : 1} />

            {/* Status bar */}
            <StatusBar
                time={currentTime}
                battery={capabilities.batteryLevel}
                isCharging={capabilities.isCharging}
                isOnline={!isOffline}
                signalStrength={signalStrength}
            />

            {/* Rare boot overlay */}
            <AnimatePresence>
                {rareBoot && (
                    <motion.div
                        className="fixed inset-0 z-[150] bg-black flex items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="text-center"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 1 }}
                        >
                            <motion.div
                                className="text-4xl font-bold text-purple-400 mb-4"
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                {bootMessage}
                            </motion.div>
                            <div className="text-white/40 text-xs font-mono tracking-widest">
                                NEXUS OS — {NEXUS_CONFIG.BUILD}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main content */}
            <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
                {/* Boot message */}
                <AnimatePresence mode="wait">
                    {bootMessage && !rareBoot && (
                        <motion.div
                            key="boot"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-[10px] font-mono tracking-widest text-white/40 mb-4"
                        >
                            {bootMessage}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Identity Orb */}
                <IdentityOrb
                    state={systemState}
                    theme={theme}
                    forceSurge={forceSurge}
                    onTap={handleLogoTap}
                    onHoldStart={handleLogoHoldStart}
                    onHoldEnd={handleLogoHoldEnd}
                    onSwipe={handleLogoSwipe}
                    winking={winking}
                    isOffline={isOffline}
                />

                {/* Custom message */}
                <AnimatePresence mode="wait">
                    {customMessage && (
                        <motion.div
                            key="custom"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-xs font-mono tracking-widest text-purple-300 mb-4 text-center px-4"
                        >
                            {customMessage}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Offline indicator */}
                {isOffline && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 text-red-400 mb-4"
                    >
                        <Radio className="w-4 h-4 animate-pulse" />
                        <span className="text-xs font-mono tracking-widest">INFRASTRUCTURE OFFLINE</span>
                    </motion.div>
                )}

                {/* Error message */}
                <AnimatePresence>
                    {error && systemState === 'idle' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-4 flex items-center gap-2 text-red-400 text-xs font-mono"
                        >
                            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Auth card */}
                <FloatingAuthCard
                    mode={mode}
                    setMode={setMode}
                    username={username}
                    setUsername={setUsername}
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    showPassword={showPassword}
                    togglePassword={() => {
                        setShowPassword((s) => !s);
                        vibrate(10);
                    }}
                    onSubmit={handleSubmit}
                    isProcessing={isProcessing}
                    isOffline={isOffline}
                    error={error}
                    passwordStrength={passwordStrength}
                    rememberMe={rememberMe}
                    toggleRemember={() => setRememberMe((r) => !r)}
                />

                {/* Footer info */}
                <div className="mt-8 flex flex-col items-center gap-2">
                    <motion.button
                        onClick={handleVersionTap}
                        className="text-[9px] font-mono tracking-widest text-white/30 hover:text-white/60 transition-colors"
                    >
                        NEXUS OS · {NEXUS_CONFIG.BUILD}
                    </motion.button>
                    <div className="text-[9px] font-mono tracking-widest text-white/20">
                        {achievements.length} / {Object.keys(ACHIEVEMENT_REGISTRY).length} ACHIEVEMENTS
                    </div>
                </div>
            </div>

            {/* Admin mode overlay */}
            <AnimatePresence>
                {adminMode && (
                    <motion.div
                        className="fixed top-16 left-4 right-4 z-[60] rounded-2xl p-3 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/40 backdrop-blur-xl"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <div className="flex items-center gap-2 text-red-300 text-xs font-mono tracking-widest">
                            <Crown className="w-4 h-4" />
                            <span>ADMIN MODE ACTIVE</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Dev mode overlay */}
            <AnimatePresence>
                {showDevMode && (
                    <motion.div
                        className="fixed bottom-4 left-4 right-4 z-[60] rounded-2xl p-3 bg-black/80 border border-white/10 backdrop-blur-xl font-mono text-[10px] text-white/60 space-y-1"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        onClick={() => setShowDevMode(false)}
                    >
                        <div className="flex justify-between border-b border-white/10 pb-1 text-white/40 tracking-widest">
                            <span>DEV MODE</span>
                            <span className="text-emerald-400">LIVE</span>
                        </div>
                        <div>FPS: 60 · GPU BOUND</div>
                        <div>THEME: {theme.toUpperCase()}</div>
                        <div>ACHIEVEMENTS: {achievements.length}</div>
                        <div>PARTICLES: {NEXUS_CONFIG.MAX_PARTICLES}</div>
                        <div>BUILD: {NEXUS_CONFIG.BUILD}</div>
                        <div className="text-white/30 text-center pt-1">TAP TO CLOSE</div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Easter egg overlays */}
            <AnimatePresence>
                {showTerminal && (
                    <SecretTerminal
                        onClose={() => setShowTerminal(false)}
                        onCommand={handleTerminalCommand}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showMatrix && <MatrixRain onClose={() => setShowMatrix(false)} />}
            </AnimatePresence>

            <GravityWell active={gravityActive} cursorPos={cursorPos} />

            <AnimatePresence>
                {showBlackHole && (
                    <BlackHole active={showBlackHole} onDone={() => setShowBlackHole(false)} />
                )}
            </AnimatePresence>

            <DigitalPet active={showPet} onClose={() => setShowPet(false)} />

            <GlitchOverlay active={showGlitch} />

            <AnimatePresence>
                {showFirmware && (
                    <FirmwareUpdate
                        active={showFirmware}
                        onDone={() => setShowFirmware(false)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showSignalGhost && (
                    <SignalGhost
                        active={showSignalGhost}
                        onDone={() => setShowSignalGhost(false)}
                    />
                )}
            </AnimatePresence>

            {/* Achievement toast */}
            <AnimatePresence>
                {activeToast && (
                    <AchievementToast
                        achievement={activeToast}
                        onClose={() => setActiveToast(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}