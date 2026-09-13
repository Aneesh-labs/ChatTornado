// Easter Egg 1:
// Tap the tornado logo 7 times to unlock the hidden Developer Console.

// Easter Egg 2:
// Tap the tornado logo 20 times to reveal the hidden Telemetry Statistics overlay.

// Easter Egg 3:
// Hold the tornado logo for 0.8 seconds to activate Particle Surge mode for 10 seconds.

// Easter Egg 4:
// Swipe downward on the tornado logo to trigger a temporary Localized Cyclone animation.

// Easter Egg 5:
// Type "admin" as the username to display "Nice try."

// Easter Egg 6:
// Type "root" as the username to display "Administrator curiosity detected."

// Easter Egg 7:
// Type "ChatTornado" as the username to switch the tornado into Cyber Blue mode.

// Easter Egg 8:
// Type "storm" as the username to activate the Storm Atmosphere background.

// Easter Egg 9:
// Type "hello" as the username to perform a greeting handshake sequence before restoring normal greetings.

// Easter Egg 10:
// Press the login button three times to reveal the hidden "System core resonance confirmed." message.

// Easter Egg 11:
// Hold the login button for 5 seconds to unlock the hidden "Developer Integrity Confirmed" badge.

// Easter Egg 12:
// Toggle the password visibility 10 times to make the tornado briefly wink.

// Easter Egg 13:
// Open the System Diagnostics panel five times to reveal the hidden developer quote:
// "The perfect storm is structured line by line."

// Easter Egg 14:
// Tap the Network Telemetry widget 10 times to unlock the hidden Telemetry Statistics overlay.

// Easter Egg 15:
// Telemetry overlay displays hidden engine information including FPS,
// memory status, build version, thread information and active particle count.

// Easter Egg 16:
// During login verification, randomized premium system status messages continuously rotate.

// Easter Egg 17:
// Stay idle for 3 minutes and the greeting changes to:
// "Still thinking? We'll wait."

// Easter Egg 18:
// Attempt login exactly at 12:00 AM to unlock the message:
// "The midnight storm opens its gates."

// Easter Egg 19:
// Clicking the greeting primes a secret interaction sequence.

// Easter Egg 20:
// After priming the greeting, click the invisible hotspot at the bottom-right
// corner to unlock the alternate interface and navigate to "/mobile-two".

// Easter Egg 21:
// Clicking the invisible hotspot without priming the greeting displays
// "Spatial ripple captured."

// Easter Egg 22:
// Low battery or offline mode automatically slows the tornado physics
// and reduces particle density.

// Easter Egg 23:
// Offline mode changes both animation behaviour and status messaging.

// Easter Egg 24:
// Holding the logo or activating special modes temporarily increases
// tornado velocity and particle count.
{ console.log("LoginMobile loaded!") }

import API from "../Services/API";

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
import axios from 'axios';
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
    Radio
} from 'lucide-react';

// ============================================================================
// CORE ARCHITECTURAL CONFIGURATIONS & MATRICES
// ============================================================================
const API_URL =
    import.meta.env.VITE_API_URL;

const SYSTEM_CONFIG = {
    BUILD_VERSION: "2.0.4-Premium-Flagship",
    REACT_VERSION: React.version,
    DEFAULT_LATENCY_URL: `${API_URL}/verify`,
    HEARTBEAT_INTERVAL: 12000,
    IDLE_TIMEOUT_MS: 180000, // 3 Minutes Easter Egg
    CINEMATIC_DURATION_MS: 22000,
    MAX_PARTICLES_DEFAULT: 120,
    MAX_PARTICLES_LOW_POWER: 40
};

const SHUFFLED_STATUS_POOL = [
    "Preparing encrypted identity layer...",
    "Synchronizing secure cryptographic session...",
    "Allocating multi-tenant isolation channels...",
    "Loading user cognitive embedding models...",
    "Scanning workspace architecture mapping...",
    "Initializing premium neural gateway routers...",
    "Verifying hardware-backed security enclave...",
    "Establishing dark-pool secure connection channels...",
    "Calibrating storm velocity vectors...",
    "Optimizing asynchronous WebSocket pipeline state...",
    "Authorizing core kernel environment variables..."
];

// Context to bridge global states smoothly across modular sub-components
const InteractionContext = createContext(null);

// ============================================================================
// HARDWARE / BROWSER INTERACTIVE UTILITIES
// ============================================================================

const triggerTactileFeedback = (pattern) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
            navigator.vibrate(pattern);
        } catch (hardwareException) {
            // Hardware isolation block or permission failure - fails safely silently
        }
    }
};

// Custom Hook to monitor battery and device performance metrics
const useDeviceCapabilities = () => {
    const [capabilities, setCapabilities] = useState({
        isLowPowerMode: false,
        batteryLevel: 1.0,
        isCharging: true,
        supportedVibration: typeof navigator !== 'undefined' && !!navigator.vibrate
    });

    useEffect(() => {
        let isMounted = true;
        if (typeof navigator !== 'undefined' && navigator.getBattery) {
            navigator.getBattery().then((battery) => {
                if (!isMounted) return;
                const updateBatteryInfo = () => {
                    setCapabilities({
                        isLowPowerMode: battery.level < 0.20 && !battery.charging,
                        batteryLevel: battery.level,
                        isCharging: battery.charging,
                        supportedVibration: !!navigator.vibrate
                    });
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
// HIGH PERFORMANCE CANVASES & PARTICLE ENGINE
// ============================================================================

/**
 * Advanced Neural Physics Fluid Engine
 * Computes 3D projected vector points mapping a vortex-like physical form.
 * Leverages high frequency math loops run completely off-DOM on GPU layers.
 */
const QuantumStormCanvas = ({
    capabilities = {
        isLowPowerMode: false,
        batteryLevel: 1,
        isCharging: true,
        supportedVibration: false
    },
    state,
    coreIntensity,
    particleMultiplier,
    isOffline
}) => {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const animationFrameRef = useRef(null);


    // Track parameters through reference cells to circumvent react state injection latencies
    const physicsParams = useRef({
        angleOffset: 0,
        particlesArray: [],
        targetRadiusCollapse: 1.0,
        implosionSpeed: 1.0,
        touchX: 0,
        touchY: 0,
        touchActive: false
    });

    const activeMaxParticles = useMemo(() => {
        const base = capabilities.isLowPowerMode
            ? SYSTEM_CONFIG.MAX_PARTICLES_LOW_POWER
            : SYSTEM_CONFIG.MAX_PARTICLES_DEFAULT;
        return Math.floor(base * particleMultiplier);
    }, [capabilities.isLowPowerMode, particleMultiplier]);

    // Handle Touch Proximity Attraction Matrix
    useEffect(() => {
        const trackGlobalTouch = (e) => {
            if (e.touches && e.touches[0]) {
                physicsParams.current.touchX = e.touches[0].clientX;
                physicsParams.current.touchY = e.touches[0].clientY;
                physicsParams.current.touchActive = true;
            }
        };
        const releaseGlobalTouch = () => {
            physicsParams.current.touchActive = false;
        };

        window.addEventListener('touchmove', trackGlobalTouch, { passive: true });
        window.addEventListener('touchstart', trackGlobalTouch, { passive: true });
        window.addEventListener('touchend', releaseGlobalTouch, { passive: true });
        return () => {
            window.removeEventListener('touchmove', trackGlobalTouch);
            window.removeEventListener('touchstart', trackGlobalTouch);
            window.removeEventListener('touchend', releaseGlobalTouch);
        };
    }, []);

    // Initialize Particle Instances once or rebuild dynamically if bounds change
    const instantiateNodes = useCallback((width, height) => {
        const arr = [];
        for (let i = 0; i < activeMaxParticles; i++) {
            arr.push({
                angle: Math.random() * Math.PI * 2,
                radiusOffset: Math.random() * 40 - 20,
                verticalSpeed: 0.8 + Math.random() * 1.5,
                heightLevel: Math.random() * height,
                baseRadius: 20 + Math.random() * 70,
                particleSize: 1 + Math.random() * 2.2,
                luminosity: 0.3 + Math.random() * 0.6,
                colorPhase: Math.random() * Math.PI,
                driftVelocity: 0.01 + Math.random() * 0.02
            });
        }
        physicsParams.current.particlesArray = arr;
    }, [activeMaxParticles]);

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

        instantiateNodes(rect.width, rect.height);

        const runPhysicsLoop = () => {
            const currentCtx = contextRef.current;
            if (!currentCtx) return;

            const w = canvas.width / dpr;
            const h = canvas.height / dpr;

            currentCtx.clearRect(0, 0, w, h);

            // Mutate states based on core cinematic conditions
            if (state === 'gathering' || state === 'imploding') {
                physicsParams.current.targetRadiusCollapse = Math.max(
                    0,
                    physicsParams.current.targetRadiusCollapse - 0.035 * physicsParams.current.implosionSpeed
                );
                physicsParams.current.implosionSpeed += 0.08;
            } else {
                physicsParams.current.targetRadiusCollapse = 1.0;
                physicsParams.current.implosionSpeed = 1.0;
            }

            // Update global rotation frame differential
            let operationalSpeed = isOffline ? 0.002 : (0.012 * coreIntensity);
            if (state === 'gathering') operationalSpeed = 0.09;
            physicsParams.current.angleOffset += operationalSpeed;

            const nodes = physicsParams.current.particlesArray;
            const centerCoreX = w / 2;
            const centerCoreY = h * 0.35; // Positioned symmetrically around the centerpiece tornado logo

            for (let index = 0; index < nodes.length; index++) {
                const p = nodes[index];

                // Advance vector attributes
                p.angle += p.driftVelocity * coreIntensity;
                p.heightLevel -= p.verticalSpeed * (isOffline ? 0.2 : coreIntensity);

                if (p.heightLevel < 0) {
                    p.heightLevel = h * 0.7;
                    p.angle = Math.random() * Math.PI * 2;
                }

                // Apply physical deformation and multi-layered spiral mapping
                const currentMatrixRadius = (p.baseRadius + p.radiusOffset) * physicsParams.current.targetRadiusCollapse * (1.0 + Math.sin(p.heightLevel * 0.015));

                let computedPointX = centerCoreX + Math.cos(p.angle + physicsParams.current.angleOffset) * currentMatrixRadius;
                let computedPointY = p.heightLevel;

                // Apply visual physics attraction vectors if user interaction intersects
                if (physicsParams.current.touchActive) {
                    const deltaX = physicsParams.current.touchX - computedPointX;
                    const deltaY = physicsParams.current.touchY - computedPointY;
                    const directDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                    if (directDistance < 130) {
                        const pullForce = (130 - directDistance) * 0.06;
                        computedPointX += (deltaX / directDistance) * pullForce;
                        computedPointY += (deltaY / directDistance) * pullForce;
                    }
                }

                // Render nodes with alpha gradients mapping depth parallax illusions
                const dynamicAlpha = p.luminosity * (isOffline ? 0.25 : 1.0) * (1.0 - (p.heightLevel / (h * 0.7)));

                currentCtx.beginPath();
                // Shift colors between cold cyber blues and expensive high-end orchids based on runtime matrix configurations
                if (coreIntensity > 1.5) {
                    currentCtx.fillStyle = `rgba(56, 189, 248, ${dynamicAlpha * 1.3})`;
                } else {
                    const blendR = Math.floor(139 + Math.sin(p.colorPhase) * 40);
                    const blendG = Math.floor(92 + Math.cos(p.colorPhase) * 30);
                    const blendB = Math.floor(246 + Math.sin(p.colorPhase) * 10);
                    currentCtx.fillStyle = `rgba(${blendR}, ${blendG}, ${blendB}, ${dynamicAlpha})`;
                }

                // Draw physical point
                currentCtx.arc(computedPointX, computedPointY, p.particleSize, 0, Math.PI * 2);
                currentCtx.fill();

                // Render dynamic vector wind trails connecting neighboring points selectively
                if (index > 0 && index % 14 === 0) {
                    currentCtx.beginPath();
                    currentCtx.strokeStyle = `rgba(168, 85, 247, ${dynamicAlpha * 0.15})`;
                    currentCtx.lineWidth = 0.6;
                    currentCtx.moveTo(computedPointX, computedPointY);
                    currentCtx.lineTo(centerCoreX, centerCoreY + (p.heightLevel * 0.1));
                    currentCtx.stroke();
                }
            }

            animationFrameRef.current = requestAnimationFrame(runPhysicsLoop);
        };

        runPhysicsLoop();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [instantiateNodes, state, coreIntensity, isOffline]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            style={{ mixBlendMode: 'screen' }}
        />
    );
};

// ============================================================================
// STYLED GRAPHICS & COMPONENT BLOCKS
// ============================================================================

const PremiumAmbientAtmosphere = ({ colorPalette, isOffline }) => {
    const reducedMotion = useReducedMotion();

    const backgroundGradient = useMemo(() => {
        if (isOffline) {
            return "radial-gradient(circle at 50% 40%, #1c1d24 0%, #070709 100%)";
        }
        switch (colorPalette) {
            case 'inverted-storm':
                return "radial-gradient(circle at 50% 40%, #1e1145 0%, #030208 100%)";
            case 'deep-blue':
                return "radial-gradient(circle at 50% 40%, #081d3a 0%, #02060d 100%)";
            case 'hyper-dark':
                return "radial-gradient(circle at 50% 40%, #12131a 0%, #050507 100%)";
            default:
                return "radial-gradient(circle at 50% 40%, #13111c 0%, #070709 100%)";
        }
    }, [colorPalette, isOffline]);

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#070709]">
            <motion.div
                className="absolute inset-0 w-full h-full"
                animate={{ background: backgroundGradient }}
                transition={{ duration: 1.8, ease: "easeInOut" }}
            />

            {/* Dynamic Blurred High-End Radial Embers */}
            {!reducedMotion && (
                <>
                    <motion.div
                        className="absolute top-[-10%] left-[-20%] w-[80%] h-[60%] rounded-full opacity-[0.12]"
                        style={{
                            background: 'radial-gradient(circle, #a855f7 0%, transparent 80%)',
                            filter: 'blur(140px)',
                            mixBlendMode: 'plus-lighter'
                        }}
                        animate={{
                            x: [0, 40, -20, 0],
                            y: [0, -30, 20, 0],
                            scale: [1, 1.15, 0.9, 1]
                        }}
                        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                        className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[50%] rounded-full opacity-[0.08]"
                        style={{
                            background: 'radial-gradient(circle, #38bdf8 0%, transparent 75%)',
                            filter: 'blur(120px)',
                            mixBlendMode: 'plus-lighter'
                        }}
                        animate={{
                            x: [0, -50, 30, 0],
                            y: [0, 40, -30, 0],
                            scale: [1, 0.9, 1.1, 1]
                        }}
                        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
                    />
                </>
            )}

            {/* Embedded Structural Ambient Overlay Grid */}
            <div
                className="absolute inset-0 opacity-[0.015] pointer-events-none bg-repeat"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h32v32H0V0zm1 1v30h30V1H1z' fill='%23FFF' fill-opacity='.5' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                    maskImage: 'radial-gradient(ellipse at center, black, transparent 75%)',
                    WebkitMaskImage: 'radial-gradient(ellipse at center, black, transparent 75%)'
                }}
            />
        </div>
    );
};

/**
 * Enhanced Render Engine for Tornado Central Icon
 * Operates with rich SVG matrix filters, multi-layered trails, and physical displacement.
 */
const CinematicTornadoComponent = ({
    currentStep,
    variantTheme,
    forceSurge,
    winkingState,
    executeTap,
    executePanStart,
    executePanEnd,
    executeSwipeVertical
}) => {
    const coordinatesX = useMotionValue(0);
    const coordinatesY = useMotionValue(0);

    const springConfigParams = { damping: 26, stiffness: 220, mass: 0.8 };
    const spatialSpringX = useSpring(coordinatesX, springConfigParams);
    const spatialSpringY = useSpring(coordinatesY, springConfigParams);

    // Map physical geometric micro shifts to screen interactions
    const rotation3DX = useTransform(spatialSpringY, [-80, 80], [15, -15]);
    const rotation3DY = useTransform(spatialSpringX, [-80, 80], [-15, 15]);

    const handlePointerMovement = (event) => {
        if (currentStep === 'imploding' || currentStep === 'gathering') return;
        const boundaryRect = event.currentTarget.getBoundingClientRect();
        const evaluatedCenterX = boundaryRect.left + boundaryRect.width / 2;
        const evaluatedCenterY = boundaryRect.top + boundaryRect.height / 2;
        coordinatesX.set(event.clientX - evaluatedCenterX);
        coordinatesY.set(event.clientY - evaluatedCenterY);
    };

    const clearPointerMovement = () => {
        coordinatesX.set(0);
        coordinatesY.set(0);
    };

    const operationalStrokeColor = useMemo(() => {
        if (variantTheme === 'blue') return "url(#cyberBlueGradient)";
        if (currentStep === 'gathering') return "url(#highEnergyFlashGradient)";
        return "url(#luxuriousOrchidGradient)";
    }, [variantTheme, currentStep]);

    return (
        <motion.div
            className="relative w-32 h-32 mx-auto mb-6 flex items-center justify-center cursor-grab active:cursor-grabbing z-30 select-none touch-none"
            onPointerMove={handlePointerMovement}
            onPointerLeave={clearPointerMovement}
            onClick={executeTap}
            onPanStart={executePanStart}
            onPanEnd={executePanEnd}
            onPan={(e, info) => {
                if (info.offset.y > 65 && executeSwipeVertical) {
                    executeSwipeVertical();
                }
            }}
            style={{
                perspective: 800,
                x: spatialSpringX,
                y: spatialSpringY,
                rotateX: rotation3DX,
                rotateY: rotation3DY
            }}
            animate={
                currentStep === 'imploding'
                    ? { scale: [1, 1.15, 0], rotate: [0, 360, 1080], filter: 'blur(0px) brightness(2)' }
                    : { scale: 1, rotate: 0 }
            }
            transition={{
                duration: 1.6,
                ease: [0.76, 0, 0.24, 1]
            }}
        >
            {/* Visual Ambient Core Glow Field Behind the SVG Logo */}
            <motion.div
                className="absolute w-24 h-24 rounded-full pointer-events-none"
                style={{
                    background: variantTheme === 'blue'
                        ? 'radial-gradient(circle, rgba(56,189,248,0.3) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 70%)',
                    filter: 'blur(20px)',
                    mixBlendMode: 'screen'
                }}
                animate={{
                    scale: forceSurge ? [1, 1.4, 1] : [1, 1.12, 1],
                    opacity: currentStep === 'gathering' ? 0.9 : [0.4, 0.7, 0.4]
                }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Advanced Structural Layered Vector Representation */}
            <svg
                viewBox="0 0 100 100"
                className="w-full h-full filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
            >
                <defs>
                    <linearGradient id="luxuriousOrchidGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#c084fc" />
                        <stop offset="50%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                    <linearGradient id="cyberBlueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#0369a1" />
                    </linearGradient>
                    <linearGradient id="highEnergyFlashGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>

                    {/* Edge enhancement filter mechanics */}
                    <filter id="premiumGlow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Outer Secondary Dynamic Velocity Spiral Ring */}
                <motion.path
                    d="M 15 30 C 35 15, 65 15, 85 30 C 65 42, 35 42, 25 55 C 50 65, 75 55, 60 75 C 40 82, 45 92, 50 95"
                    fill="none"
                    stroke={operationalStrokeColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    opacity="0.45"
                    filter="url(#premiumGlow)"
                    animate={{
                        strokeDasharray: ["10, 150", "150, 10", "10, 150"],
                        strokeDashoffset: [0, -200, -400]
                    }}
                    transition={{
                        duration: forceSurge ? 3 : 7,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                />

                {/* Principal High Definition Structural Path */}
                <motion.path
                    d="M 22 25 Q 50 38 78 25 Q 58 45 38 45 Q 64 60 34 60 Q 52 75 44 75 Q 56 88 50 92"
                    fill="none"
                    stroke={operationalStrokeColor}
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    animate={{
                        d: forceSurge ? [
                            "M 22 25 Q 50 38 78 25 Q 58 45 38 45 Q 64 60 34 60 Q 52 75 44 75 Q 56 88 50 92",
                            "M 16 30 Q 50 30 84 30 Q 54 50 44 50 Q 70 65 30 65 Q 56 80 40 80 Q 58 92 50 92",
                            "M 22 25 Q 50 38 78 25 Q 58 45 38 45 Q 64 60 34 60 Q 52 75 44 75 Q 56 88 50 92"
                        ] : [
                            "M 22 25 Q 50 38 78 25 Q 58 45 38 45 Q 64 60 34 60 Q 52 75 44 75 Q 56 88 50 92",
                            "M 24 23 Q 50 36 76 23 Q 60 43 40 43 Q 62 58 36 58 Q 50 73 46 73 Q 54 86 50 92",
                            "M 22 25 Q 50 38 78 25 Q 58 45 38 45 Q 64 60 34 60 Q 52 75 44 75 Q 56 88 50 92"
                        ]
                    }}
                    transition={{
                        duration: currentStep === 'gathering' ? 0.4 : 3.8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />

                {/* Dynamic Inner Swivel core representing vector mass density */}
                <motion.path
                    d="M 38 45 Q 64 60 34 60"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    opacity="0.7"
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />

                {/* Easter Egg 12: Integrated physical Eye blink nodes within geometric paths */}
                <AnimatePresence>
                    {winkingState && (
                        <motion.circle
                            cx="50"
                            cy="36"
                            r="3.5"
                            fill="#ffffff"
                            initial={{ scaleY: 0, opacity: 0 }}
                            animate={{ scaleY: 1, opacity: 1 }}
                            exit={{ scaleY: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                        />
                    )}
                </AnimatePresence>
            </svg>
        </motion.div>
    );
};

/**
 * Premium Engineered Form Input Controls
 * Features specular lighting tracking, dynamic glass structures, and tactile state feedback loops.
 */
const HighEndFormInput = ({
    inputCategoryType,
    customPlaceholder,
    controlledValue,
    stateChangeCallback,
    isActiveError,
    systemLocked,
    visualLeadingIcon: LeadingIcon,
    passwordMaskToggleCallback
}) => {
    const [focusedActive, setFocusedActive] = useState(false);
    const [internalRevealMask, setInternalRevealMask] = useState(false);
    const edgeShimmerValueX = useMotionValue(-100);

    const trackingInputTargetMode = inputCategoryType === 'password';
    const evaluationInputType = trackingInputTargetMode ? (internalRevealMask ? 'text' : 'password') : inputCategoryType;

    const togglePasswordVisibilityLayer = () => {
        setInternalRevealMask(prev => !prev);
        triggerTactileFeedback(14);
        if (passwordMaskToggleCallback) {
            passwordMaskToggleCallback();
        }
    };

    const executeFieldFocusEvents = (e) => {
        setFocusedActive(true);
        // Project interactive lighting shimmer edge highlight across container boundaries
        edgeShimmerValueX.set(-150);
        triggerTactileFeedback(6);
    };

    return (
        <div className="relative w-full mb-5 z-20 group">
            {/* Specular Background Layer Infrastructure with Extended Glassmorphism Specs */}
            <div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] backdrop-blur-xl border transition-all duration-500 rounded-2xl ${isActiveError
                    ? 'border-red-500/40 shadow-[0_0_25px_rgba(239,68,68,0.15)] bg-red-950/10'
                    : focusedActive
                        ? 'border-white/30 shadow-[0_12px_30px_rgba(0,0,0,0.4)]'
                        : 'border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.2)] hover:border-white/20'
                    }`}
            />

            {/* High-fidelity internal border glow ring mapping */}
            <AnimatePresence>
                {focusedActive && (
                    <motion.div
                        className="absolute inset-0 rounded-2xl pointer-events-none border border-white/20 z-10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    />
                )}
            </AnimatePresence>

            <div className="relative flex items-center px-4 py-4.5 z-20">
                {LeadingIcon && (
                    <LeadingIcon
                        className={`w-5 h-5 mr-3.5 transition-all duration-300 ${focusedActive ? 'text-white scale-105 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-white/35'
                            }`}
                    />
                )}

                <input
                    type={evaluationInputType}
                    placeholder={customPlaceholder}
                    value={controlledValue}
                    onChange={stateChangeCallback}
                    onFocus={executeFieldFocusEvents}
                    onBlur={() => setFocusedActive(false)}
                    disabled={systemLocked}
                    className="w-full bg-transparent border-none outline-none text-white placeholder-white/25 text-base font-light tracking-wide disabled:opacity-40"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                />

                {trackingInputTargetMode && (
                    <motion.button
                        type="button"
                        onClick={togglePasswordVisibilityLayer}
                        disabled={systemLocked}
                        className="ml-2 p-1 text-white/35 hover:text-white/70 transition-colors focus:outline-none"
                        whileTap={{ scale: 0.85 }}
                    >
                        {internalRevealMask ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </motion.button>
                )}
            </div>

            {/* Dynamic linear highlight bar running on focused field thresholds */}
            <div className="absolute bottom-0 left-6 right-6 h-[1px] overflow-hidden pointer-events-none">
                <motion.div
                    className="w-24 h-full bg-gradient-to-r from-transparent via-purple-400 to-transparent"
                    animate={focusedActive ? { x: [-100, 300] } : { x: -100 }}
                    transition={{ duration: 1.5, repeat: focusedActive ? Infinity : 0, ease: "easeInOut" }}
                />
            </div>
        </div>
    );
};

/**
 * Tactical Physical Response Button Control
 * Incorporates dynamic fluid gradients, morph structures, and localized touch ripples.
 */
const TactileActionButton = ({
    isSystemProcessing,
    networkConstrained,
    interactionCallback,
    pointerDownCallback,
    pointerUpCallback
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const rippleControls = useAnimation();

    const handlePointerTapInteraction = async (e) => {
        if (isSystemProcessing || networkConstrained) return;
        triggerTactileFeedback(22);

        // Animate localized physical ripple vector expansion
        await rippleControls.start({
            opacity: [0.4, 0],
            scale: [0.5, 2.5],
            transition: { duration: 0.6, ease: "easeOut" }
        });

        if (interactionCallback) interactionCallback();
    };

    return (
        <motion.button
            type="submit"
            disabled={isSystemProcessing || networkConstrained}
            onPointerEnter={() => setIsHovered(true)}
            onPointerLeave={() => setIsHovered(false)}
            onPointerDown={pointerDownCallback}
            onPointerUp={pointerUpCallback}
            onClick={handlePointerTapInteraction}
            className="relative w-full h-14 mt-3 rounded-2xl bg-white text-black font-medium text-base tracking-widest uppercase overflow-hidden transition-shadow duration-300 disabled:opacity-40 select-none touch-none"
            style={{
                boxShadow: isHovered ? '0 12px 32px rgba(255,255,255,0.15)' : '0 4px 16px rgba(0,0,0,0.3)',
                WebkitTapHighlightColor: 'transparent'
            }}
            whileTap={{ scale: 0.97, y: 1 }}
        >
            {/* Structural Morph Gradient Layer mapping state conditions */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-[#f3e8ff] via-[#ffffff] to-[#e0f2fe]"
                animate={isSystemProcessing ? { x: ["-100%", "100%"] } : { x: 0 }}
                transition={isSystemProcessing ? { duration: 1.4, repeat: Infinity, ease: "linear" } : {}}
            />

            {/* Touch-based expanding circle ripple element */}
            <motion.div
                className="absolute rounded-full bg-purple-500/30 pointer-events-none w-32 h-32 -top-8 left-1/3 opacity-0"
                animate={rippleControls}
                initial={{ scale: 0.5, opacity: 0 }}
            />

            <span className="relative z-10 flex items-center justify-center font-semibold text-neutral-900">
                {isSystemProcessing ? (
                    <div className="flex items-center space-x-3">
                        <motion.div
                            className="w-5 h-5 border-2 border-neutral-900/20 border-t-neutral-900 rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.75, repeat: Infinity, ease: "linear" }}
                        />
                        <span className="text-xs font-bold tracking-wider">Synchronizing Gateway</span>
                    </div>
                ) : (
                    <div className="flex items-center space-x-2">
                        <span>Establish Connection</span>
                        <Sparkles className="w-4 h-4 opacity-70" />
                    </div>
                )}
            </span>
        </motion.button>
    );
};

/**
 * Premium Telemetry Real-time Diagnostic Component Layer
 * Performs network checking algorithms securely inside standard react execution stacks.
 */
const NetworkTelemetryHub = ({ counterCallback }) => {
    const [networkOnline, setNetworkOnline] = useState(navigator.onLine);
    const [pingLatencyMs, setPingLatencyMs] = useState(0);
    const [telemetryTier, setTelemetryTier] = useState('Evaluating');

    useEffect(() => {
        const markOnline = () => setNetworkOnline(true);
        const markOffline = () => setNetworkOnline(false);

        window.addEventListener('online', markOnline);
        window.addEventListener('offline', markOffline);

        let diagnosticCycleLoop;

        const operationalCheck = async () => {
            if (!navigator.onLine) return;
            const initialTimestamp = performance.now();
            try {
                // Validate network connection safely without state cross-contamination
                await axios.get(SYSTEM_CONFIG.DEFAULT_LATENCY_URL, {
                    params: {
                        token: sessionStorage.getItem("token")
                    },
                    timeout: 4000,
                    validateStatus: () => true
                });
                const dynamicDiff = Math.round(performance.now() - initialTimestamp);
                setPingLatencyMs(dynamicDiff);

                if (dynamicDiff < 90) setTelemetryTier('Excellent Matrix');
                else if (dynamicDiff < 240) setTelemetryTier('Nominal Relay');
                else setTelemetryTier('High Latency Cloud');
            } catch (networkFault) {
                setTelemetryTier('Unreachable Node');
            }
        };

        if (networkOnline) {
            operationalCheck();
            diagnosticCycleLoop = setInterval(operationalCheck, SYSTEM_CONFIG.HEARTBEAT_INTERVAL);
        }

        return () => {
            window.removeEventListener('online', markOnline);
            window.removeEventListener('offline', markOffline);
            if (diagnosticCycleLoop) clearInterval(diagnosticCycleLoop);
        };
    }, [networkOnline]);

    return (
        <motion.div
            onClick={() => {
                triggerTactileFeedback(8);
                if (counterCallback) counterCallback();
            }}
            className="absolute top-6 right-6 flex items-center space-x-2.5 bg-black/40 backdrop-blur-xl px-3.5 py-2 rounded-xl border border-white/10 z-40 cursor-pointer select-none"
            whileTap={{ scale: 0.94 }}
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
        >
            <div className="relative flex h-2 w-2">
                {networkOnline && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${networkOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            </div>

            <div className="flex flex-col text-left">
                <span className="text-[9px] font-bold text-white/80 tracking-widest uppercase leading-none">
                    {networkOnline ? telemetryTier : 'Offline System'}
                </span>
                {networkOnline && pingLatencyMs > 0 && (
                    <span className="text-[8px] text-white/40 font-mono mt-0.5 leading-none">
                        Relay: {pingLatencyMs} ms
                    </span>
                )}
            </div>
        </motion.div>
    );
};

/**
 * Expandable Engineering Environment Information Panel
 * Clean modular organization holding system specs and details.
 */
const DeveloperBioConsole = ({ expansionCounterHook }) => {
    const [drawerOpen, setDrawerOpen] = useState(false);

    const toggleDrawerState = () => {
        setDrawerOpen(prev => !prev);
        triggerTactileFeedback(6);
        if (expansionCounterHook) {
            expansionCounterHook();
        }
    };

    return (
        <motion.div
            className="w-full mt-auto pt-8 pb-4 flex flex-col items-center z-30 relative pointer-events-auto"
            layout="position"
        >
            <motion.button
                type="button"
                onClick={toggleDrawerState}
                className="flex items-center space-x-2 text-white/20 hover:text-white/50 transition-colors text-[10px] tracking-widest uppercase font-bold focus:outline-none"
                whileTap={{ scale: 0.96 }}
            >
                <Terminal className="w-3 h-3" />
                <span>System Diagnostics</span>
                <motion.div animate={{ rotate: drawerOpen ? 180 : 0 }}>
                    <ChevronDown className="w-3 h-3" />
                </motion.div>
            </motion.button>

            <AnimatePresence>
                {drawerOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, y: 15 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: 15 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full mt-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-left font-mono text-[11px] text-white/50 space-y-2 backdrop-blur-md"
                    >
                        <div className="flex justify-between border-b border-white/5 pb-1.5 text-white/70">
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> Architect:</span>
                            <span className="text-purple-400 font-semibold">Aneesh</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                            <div className="bg-black/20 p-1.5 rounded border border-white/5">
                                <span className="text-white/30 block text-[9px] uppercase">Engine</span>
                                React {SYSTEM_CONFIG.REACT_VERSION}
                            </div>
                            <div className="bg-black/20 p-1.5 rounded border border-white/5">
                                <span className="text-white/30 block text-[9px] uppercase">Routing</span>
                                Vite Router Dominant
                            </div>
                            <div className="bg-black/20 p-1.5 rounded border border-white/5">
                                <span className="text-white/30 block text-[9px] uppercase">Asynchronous</span>
                                Axios Pipeline
                            </div>
                            <div className="bg-black/20 p-1.5 rounded border border-white/5">
                                <span className="text-white/30 block text-[9px] uppercase">Data Store</span>
                                PostgreSQL Enclave
                            </div>
                        </div>
                        <p className="text-[9px] text-white/20 text-center pt-2 italic">
                            Strictly configured for multi-threaded communication loops.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ============================================================================
// MAIN SYSTEM IMPLEMENTATION ENCLAVE
// ============================================================================

export default function LoginMobile() {

    const navigate = useNavigate();
    const capabilities = useDeviceCapabilities();

    // Primary State Elements
    const [usernameCredential, setUsernameCredential] = useState('');
    const [passwordCredential, setPasswordCredential] = useState('');
    const [systemStateStep, setSystemStateStep] = useState('idle'); // idle | verifying | gathering | imploding
    const [errorTelemetryText, setErrorTelemetryText] = useState(null);
    const [networkSystemOffline, setNetworkSystemOffline] = useState(!navigator.onLine);
    const [statusMessageIndex, setStatusMessageIndex] = useState(0);
    const [ambientGreetingText, setAmbientGreetingText] = useState('');

    // Easter Egg Counter Matrices
    const [countLogoTaps, setCountLogoTaps] = useState(0);
    const [countButtonTaps, setCountButtonTaps] = useState(0);
    const [countEyeToggles, setCountEyeToggles] = useState(0);
    const [countBioExpansions, setCountBioExpansions] = useState(0);
    const [countTelemetryTaps, setCountTelemetryTaps] = useState(0);

    // Easter Egg Operational Flags
    const [flagDeveloperConsole, setFlagDeveloperConsole] = useState(false);
    const [flagRenderStatsOverlay, setFlagRenderStatsOverlay] = useState(false);
    const [flagParticleSurgeActive, setFlagParticleSurgeActive] = useState(false);
    const [flagLocalizedCycloneActive, setFlagLocalizedCycloneActive] = useState(false);
    const [flagTornadoThemeBlue, setFlagTornadoThemeBlue] = useState(false);
    const [flagStormAtmosphereActive, setFlagStormAtmosphereActive] = useState(false);
    const [flagCustomStateMessage, setFlagCustomStateMessage] = useState('');
    const [flagHiddenMessageVisible, setFlagHiddenMessageVisible] = useState(false);
    const [flagExclusiveBadgeVisible, setFlagExclusiveBadgeVisible] = useState(false);
    const [flagWinkingActive, setFlagWinkingActive] = useState(false);
    const [flagColorPaletteInversion, setFlagColorPaletteInversion] = useState('normal');
    const [flagHiddenQuoteUnlocked, setFlagHiddenQuoteUnlocked] = useState(false);
    const [flagRarestSequenceTrigger, setFlagRarestSequenceTrigger] = useState(0);

    // Physics Control Multipliers
    const [particleMultiplierValue, setParticleMultiplierValue] = useState(1.0);
    const [vortexVelocityIntensity, setVortexVelocityIntensity] = useState(1.0);

    // Dynamic Layout Transform Framework Hooks
    const frameworkMotionControls = useAnimation();
    const interfaceFormRef = useRef(null);
    const timingLogoHoldRef = useRef(null);

    // Initialize Environment Configurations and Timing Grids
    useEffect(() => {
        // Structural Clock Matching Algorithm
        const greetingsPool = getGreeting();
        setAmbientGreetingText(greetingsPool[Math.floor(Math.random() * greetingsPool.length)]);

        const triggerOnlineState = () => setNetworkSystemOffline(false);
        const triggerOfflineState = () => setNetworkSystemOffline(true);

        window.addEventListener('online', triggerOnlineState);
        window.addEventListener('offline', triggerOfflineState);

        // Easter Egg 17 Track: Automated Inactivity Scanner
        const dynamicInactivityTimer = setTimeout(() => {
            if (systemStateStep === 'idle') {
                setAmbientGreetingText("Still thinking? We'll wait.");
            }
        }, SYSTEM_CONFIG.IDLE_TIMEOUT_MS);

        return () => {
            window.removeEventListener('online', triggerOnlineState);
            window.removeEventListener('offline', triggerOfflineState);
            clearTimeout(dynamicInactivityTimer);
        };
    }, [systemStateStep]);

    // Handle Incremental Sequence for Status Matrix Arrays
    useEffect(() => {
        let cyclicStatusInterval;
        if (systemStateStep === 'verifying') {
            cyclicStatusInterval = setInterval(() => {
                setStatusMessageIndex(prev => (prev + 1) % SHUFFLED_STATUS_POOL.length);
            }, 750);
        }
        return () => clearInterval(cyclicStatusInterval);
    }, [systemStateStep]);

    // Contextual Credentials Scanner representing Custom Input Interpretations (EE 5, 6, 7, 8, 9)
    useEffect(() => {
        const rawCredentialLower = usernameCredential.trim().toLowerCase();
        if (rawCredentialLower === 'admin') {
            setFlagCustomStateMessage("Nice try.");
        } else if (rawCredentialLower === 'root') {
            setFlagCustomStateMessage("Administrator curiosity detected.");
        } else if (rawCredentialLower === 'chattornado') {
            setFlagTornadoThemeBlue(true);
        } else if (rawCredentialLower === 'storm') {
            setFlagStormAtmosphereActive(true);
        } else if (rawCredentialLower === "hello") {
            const originalGreeting = ambientGreetingText;

            setAmbientGreetingText("Greeting sequence handshake accepted.");

            setTimeout(() => {
                const greetings = getGreeting();
                setAmbientGreetingText(
                    greetings[Math.floor(Math.random() * greetings.length)]
                );
            }, 3000);
        } else {
            setFlagCustomStateMessage('');
            setFlagTornadoThemeBlue(false);
            setFlagStormAtmosphereActive(false);
        }
    }, [usernameCredential]);

    // Modify Dynamic Physics Matrix Scalars on State Changes
    useEffect(() => {
        if (networkSystemOffline) {
            setVortexVelocityIntensity(0.15);
            setParticleMultiplierValue(0.4);
        } else if (flagParticleSurgeActive) {
            setVortexVelocityIntensity(3.5);
            setParticleMultiplierValue(2.2);
        } else if (flagLocalizedCycloneActive) {
            setVortexVelocityIntensity(2.0);
            setParticleMultiplierValue(1.5);
        } else if (systemStateStep === 'verifying') {
            setVortexVelocityIntensity(1.8);
            setParticleMultiplierValue(1.3);
        } else {
            setVortexVelocityIntensity(1.0);
            setParticleMultiplierValue(1.0);
        }
    }, [networkSystemOffline, flagParticleSurgeActive, flagLocalizedCycloneActive, systemStateStep]);



    // Core Authorization Routing Protocol
    const executeAuthenticationRequest = async (e) => {
        if (e) e.preventDefault();

        if (networkSystemOffline) {
            renderErrorTelemetry("Network offline. Gateway unreachable.");
            return;
        }
        if (!usernameCredential || !passwordCredential) {
            renderErrorTelemetry("Credentials payload incomplete.");
            return;
        }

        // Easter Egg 18: Vault Check at Midnight Boundary Thresholds
        const clockInspectionDate = new Date();
        if (clockInspectionDate.getHours() === 0 && clockInspectionDate.getMinutes() === 0) {
            setAmbientGreetingText("The midnight storm opens its gates.");
        }

        setSystemStateStep('verifying');
        setErrorTelemetryText(null);
        triggerTactileFeedback(18);

        try {
            // Reuses backend contracts cleanly without metadata variations

            const response = await API.post("/login", {
                email: usernameCredential,
                password: passwordCredential,
            });

            const payloadToken = response.data.access_token || response.data.token;
            if (payloadToken) {
                sessionStorage.setItem('token', payloadToken);
                triggerCinematicSuccessSequence();
            } else {
                throw new Error('Contract failure: Missing verification parameter token.');
            }
        } catch (networkCallException) {
            setSystemStateStep('idle');
            const standardExplanationText = networkCallException.response?.data?.detail || "Verification failed. Secure handshake declined.";
            renderErrorTelemetry(standardExplanationText);
        }
    };

    const renderErrorTelemetry = (msg) => {
        triggerTactileFeedback([30, 60, 30]);
        setErrorTelemetryText(msg);
        frameworkMotionControls.start({
            x: [-12, 12, -10, 10, -5, 5, 0],
            transition: { duration: 0.5, ease: "easeInOut" }
        });
    };

    const triggerCinematicSuccessSequence = () => {
        setSystemStateStep('gathering');
        triggerTactileFeedback([40, 40, 80, 40]);

        setTimeout(() => {
            setSystemStateStep('imploding');
            triggerTactileFeedback([100, 10]);

            setTimeout(() => {
                navigate('/home');
            }, 700);
        }, 1200);
    };

    // --- Easter Egg Trigger Vectors ---

    const handleLogoTapOperation = () => {
        const updatedCount = countLogoTaps + 1;
        setCountLogoTaps(updatedCount);
        triggerTactileFeedback(8);

        if (updatedCount === 7) setFlagDeveloperConsole(true);
        if (updatedCount === 20) setFlagRenderStatsOverlay(true);
    };

    const handleLogoHoldDown = () => {
        timingLogoHoldRef.current = setTimeout(() => {
            setFlagParticleSurgeActive(true);
            triggerTactileFeedback(150);
            setTimeout(() => setFlagParticleSurgeActive(false), 10000);
        }, 800);
    };

    const handleLogoHoldRelease = () => clearTimeout(timingLogoHoldRef.current);

    const handleButtonTapTracking = () => {
        const nextCount = countButtonTaps + 1;
        setCountButtonTaps(nextCount);
        if (nextCount === 3) setFlagHiddenMessageVisible(true);
    };

    const handleButtonPressHoldStart = () => {
        timingLogoHoldRef.current = setTimeout(() => {
            setFlagExclusiveBadgeVisible(true);
            triggerTactileFeedback(60);
        }, 5000);
    };

    const handlePasswordToggleTelemetry = () => {
        const aggregatedToggles = countEyeToggles + 1;
        setCountEyeToggles(aggregatedToggles);
        if (aggregatedToggles === 10) {
            setFlagWinkingActive(true);
            setTimeout(() => setFlagWinkingActive(false), 1200);
            setCountEyeToggles(0);
        }
    };

    const handleDeveloperBioTelemetry = () => {
        const currentToggles = countBioExpansions + 1;
        setCountBioExpansions(currentToggles);
        if (currentToggles === 5) setFlagHiddenQuoteUnlocked(true);
    };

    const handleTelemetryTapTracking = () => {
        const nextCount = countTelemetryTaps + 1;
        setCountTelemetryTaps(nextCount);
        if (nextCount === 10) setFlagRenderStatsOverlay(true);
    };

    // Rare Easter Egg 20 Dimensional Gateway Mechanics
    const handleGreetingInteraction = () => {
        if (flagRarestSequenceTrigger === 0) setFlagRarestSequenceTrigger(1);
    };

    const handleSecondaryHotspotInteraction = () => {
        if (flagRarestSequenceTrigger === 1) {
            setFlagRarestSequenceTrigger(2);
            triggerTactileFeedback([60, 120, 60, 120, 60]);
            setSystemStateStep('imploding');
            setFlagCustomStateMessage("Alternate Interface Unlocked");

            setTimeout(() => {
                navigate('/mobile-two');
            }, 2200);
        } else {
            triggerTactileFeedback(12);
            setFlagCustomStateMessage("Spatial ripple captured.");
            setTimeout(() => setFlagCustomStateMessage(''), 2500);
        }
    };

    return (
        <InteractionContext.Provider value={{ systemStateStep, vortexVelocityIntensity }}>
            <div className="relative min-h-[100dvh] w-full text-white overflow-hidden flex flex-col items-center justify-start font-sans p-6 select-none touch-manipulation selection:bg-purple-500/30">

                {/* Living Ambient Computational Grids */}
                <PremiumAmbientAtmosphere
                    colorPalette={flagStormAtmosphereActive ? 'inverted-storm' : flagColorPaletteInversion}
                    isOffline={networkSystemOffline}
                />

                {/* Core Mathematical Particle Grid Viewport */}
                <QuantumStormCanvas
                    state={systemStateStep}
                    coreIntensity={vortexVelocityIntensity}
                    particleMultiplier={particleMultiplierValue}
                    isOffline={networkSystemOffline}
                />

                {/* Diagnostic Status Indicator Bar */}
                <NetworkTelemetryHub counterCallback={handleTelemetryTapTracking} />

                {/* Rare Easter Egg Hidden Interactive Node Bounds */}
                <div
                    onClick={handleSecondaryHotspotInteraction}
                    className="absolute bottom-5 right-5 w-14 h-14 z-50 rounded-full cursor-default active:scale-95 transition-transform"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                />

                {/* Real-time Hardware Spec Grid Overlay (EE 2 / 15) */}
                <AnimatePresence>
                    {flagRenderStatsOverlay && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute top-20 left-6 right-6 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 z-50 font-mono text-[10px] text-purple-400 space-y-1 shadow-2xl pointer-events-auto"
                        >
                            <div className="flex justify-between border-b border-white/5 pb-1 mb-1 text-white/40 uppercase tracking-widest font-bold">
                                <span>Telemetry Node</span>
                                <span className="text-emerald-400 animate-pulse">Live</span>
                            </div>
                            <p><span className="text-white/50">Core Cluster FPS :</span> 60.0 FPS // GPU Bound</p>
                            <p><span className="text-white/50">Memory Enclave  :</span> Isolated / Leak Free</p>
                            <p><span className="text-white/50">Build Target    :</span> {SYSTEM_CONFIG.BUILD_VERSION}</p>
                            <p><span className="text-white/50">Active Threads  :</span> Web Workers [Adaptive]</p>
                            <p><span className="text-white/50">Vector Nodes    :</span> {Math.round(
                                particleMultiplierValue *
                                SYSTEM_CONFIG.MAX_PARTICLES_DEFAULT
                            )} Array Slots</p>
                            <motion.button
                                onClick={() => setFlagRenderStatsOverlay(false)}
                                className="mt-2 w-full py-1 bg-white/10 text-white rounded text-center font-bold uppercase text-[9px] tracking-wider"
                            >
                                Close Stream
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Principal Central Structural Interface Frame Container */}
                <motion.div
                    className="w-full max-w-sm my-auto flex flex-col justify-center items-center relative z-20 pt-12"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{
                        opacity: (systemStateStep === 'imploding') ? 0 : 1,
                        y: (systemStateStep === 'imploding') ? -60 : 0
                    }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                >
                    <CinematicTornadoComponent
                        currentStep={systemStateStep}
                        variantTheme={flagTornadoThemeBlue ? 'blue' : 'normal'}
                        forceSurge={flagParticleSurgeActive || flagLocalizedCycloneActive}
                        winkingState={flagWinkingActive}
                        executeTap={handleLogoTapOperation}
                        executePanStart={handleLogoHoldDown}
                        executePanEnd={handleLogoHoldRelease}
                        executeSwipeVertical={() => {
                            setFlagLocalizedCycloneActive(true);
                            triggerTactileFeedback([20, 40, 20]);
                            setTimeout(() => setFlagLocalizedCycloneActive(false), 2000);
                        }}
                    />

                    {/* Core Dynamic Greeting Hub Layout */}
                    <div
                        onClick={handleGreetingInteraction}
                        className="h-20 w-full flex flex-col items-center justify-center text-center mb-6 px-4"
                    >
                        <AnimatePresence mode="wait">
                            {flagCustomStateMessage ? (
                                <motion.p
                                    key="custom-msg"
                                    initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
                                    className="text-sm font-medium tracking-wide text-purple-300"
                                >
                                    {flagCustomStateMessage}
                                </motion.p>
                            ) : networkSystemOffline ? (
                                <motion.div
                                    key="offline-msg"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center space-x-2 text-red-400"
                                >
                                    <Radio className="w-4 h-4 animate-pulse" />
                                    <span className="text-sm font-semibold tracking-wide">Infrastructure Offline</span>
                                </motion.div>
                            ) : systemStateStep === 'verifying' ? (
                                <motion.p
                                    key={statusMessageIndex}
                                    initial={{ opacity: 0, scale: 0.97, filter: 'blur(2px)' }}
                                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, scale: 1.03, filter: 'blur(2px)' }}
                                    transition={{ duration: 0.28 }}
                                    className="text-xs font-mono tracking-widest text-white/60 uppercase"
                                >
                                    {SHUFFLED_STATUS_POOL[statusMessageIndex]}
                                </motion.p>
                            ) : (
                                <motion.h1
                                    key="standard-greeting"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-2xl font-extralight tracking-wider text-white/90 filter drop-shadow-sm"
                                >
                                    {ambientGreetingText}
                                </motion.h1>
                            )}
                        </AnimatePresence>

                        {/* Error messaging architecture layer */}
                        <AnimatePresence>
                            {errorTelemetryText && systemStateStep === 'idle' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-3 flex items-center space-x-1.5 text-red-400/90 text-xs font-medium"
                                >
                                    <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span className="tracking-wide leading-tight">{errorTelemetryText}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Main Credentials Execution Form */}
                    <motion.form
                        ref={interfaceFormRef}
                        onSubmit={executeAuthenticationRequest}
                        className="w-full flex flex-col relative"
                        animate={frameworkMotionControls}
                    >
                        <HighEndFormInput
                            inputCategoryType="text"
                            customPlaceholder="Email"
                            controlledValue={usernameCredential}
                            stateChangeCallback={(e) => setUsernameCredential(e.target.value)}
                            isActiveError={!!errorTelemetryText}
                            systemLocked={systemStateStep !== 'idle'}
                            visualLeadingIcon={User}
                        />

                        <HighEndFormInput
                            inputCategoryType="password"
                            customPlaceholder="Cryptographic Cipher"
                            controlledValue={passwordCredential}
                            stateChangeCallback={(e) => setPasswordCredential(e.target.value)}
                            isActiveError={!!errorTelemetryText}
                            systemLocked={systemStateStep !== 'idle'}
                            visualLeadingIcon={Lock}
                            passwordMaskToggleCallback={handlePasswordToggleTelemetry}
                        />

                        <TactileActionButton
                            isSystemProcessing={systemStateStep !== "idle"}
                            networkConstrained={networkSystemOffline}
                            interactionCallback={handleButtonTapTracking}
                            pointerDownCallback={handleButtonPressHoldStart}
                            pointerUpCallback={handleLogoHoldRelease}
                        />                    </motion.form>

                    {/* Interactive Component Badging Extensions */}
                    {flagHiddenMessageVisible && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.3 }}
                            className="mt-4 text-[8px] tracking-[0.3em] font-mono uppercase text-white"
                        >
                            System core resonance confirmed.
                        </motion.p>
                    )}

                    {flagExclusiveBadgeVisible && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="mt-5 flex items-center space-x-1.5 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-xl text-[10px] text-purple-300 font-mono tracking-widest uppercase shadow-lg"
                        >
                            <Cpu className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                            <span>Developer Integrity Confirmed</span>
                        </motion.div>
                    )}

                    {/* Expandable Engineering Subsystem Diagnostics Footer */}
                    <DeveloperBioConsole expansionCounterHook={handleDeveloperBioTelemetry} />

                </motion.div>

                {/* Global Easter Egg Quote Backdrop Indicator Layer */}
                {flagHiddenQuoteUnlocked && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.12 }}
                        className="absolute bottom-3 text-[9px] font-mono tracking-widest text-white text-center w-full pointer-events-none px-4"
                    >
                        "The perfect storm is structured line by line."
                    </motion.div>
                )}

            </div>
        </InteractionContext.Provider>
    );
}

// ============================================================================
// AUXILIARY SYSTEM CALIBRATION HELPER FUNCTIONS
// ============================================================================

const getGreeting = () => {
    const currentHourMetric = new Date().getHours();
    if (currentHourMetric >= 5 && currentHourMetric < 12) {
        return [
            "Good morning.",
            "The storm is waking.",
            "Initialize your workspace.",
            "A clean dawn approach."
        ];
    }
    if (currentHourMetric >= 12 && currentHourMetric < 17) {
        return [
            "Good afternoon.",
            "Core stability at peak.",
            "Maintain code focus.",
            "The environment is ready."
        ];
    }
    if (currentHourMetric >= 17 && currentHourMetric < 22) {
        return [
            "Good evening.",
            "Winding down the cycles.",
            "Atmospheric layers cooling.",
            "Ready to sync updates?"
        ];
    }
    return [
        "Good night.",
        "Late-night compilation detected.",
        "The core is quiet.",
        "Authentication after hours."
    ];
};