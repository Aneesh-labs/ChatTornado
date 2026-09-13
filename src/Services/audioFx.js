// src/Services/audioFx.js

const createOscillator = (audioCtx, type, freq) => {
    const osc = audioCtx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    return osc;
};

let audioCtx = null;

const initAudio = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
};

export const playLaserScanSound = () => {
    try {
        const ctx = initAudio();
        const t = ctx.currentTime;

        const osc = createOscillator(ctx, 'sawtooth', 150);
        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.Q.value = 10;

        // Filter sweep
        filter.frequency.setValueAtTime(100, t);
        filter.frequency.exponentialRampToValueAtTime(3000, t + 0.3);
        filter.frequency.exponentialRampToValueAtTime(100, t + 0.6);

        // Amplitude envelope
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(0.3, t + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, t + 0.6);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.6);
    } catch (e) {
        console.warn("AudioContext not supported or blocked", e);
    }
};

export const playCapsuleUnlockSound = () => {
    try {
        const ctx = initAudio();
        const t = ctx.currentTime;

        const playChime = (freq, delay) => {
            const osc = createOscillator(ctx, 'sine', freq);
            const gainNode = ctx.createGain();

            gainNode.gain.setValueAtTime(0, t + delay);
            gainNode.gain.linearRampToValueAtTime(0.5, t + delay + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, t + delay + 1.5);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start(t + delay);
            osc.stop(t + delay + 1.5);
        };

        playChime(880, 0); // A5
        playChime(1318.51, 0.1); // E6
        playChime(1760, 0.25); // A6
    } catch (e) {
        console.warn("AudioContext not supported or blocked", e);
    }
};

export const playShieldActivateSound = () => {
    try {
        const ctx = initAudio();
        const t = ctx.currentTime;

        const osc = createOscillator(ctx, 'square', 100);
        const gainNode = ctx.createGain();

        // Quick snap envelope
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(0.3, t + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

        // Pitch drop
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.15);
    } catch (e) {
        console.warn("AudioContext not supported or blocked", e);
    }
};

