// Web Audio API Synthesized Sound Effects for ChatTornado
// Zero external files/dependencies, works 100% offline, cross-platform and reliable!

class SoundEngine {
    constructor() {
        this.ctx = null;
    }

    getAudioContext() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === "suspended") {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    play(soundType) {
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;

            switch (soundType) {
                case "tada":
                case "fanfare":
                    this.playTada(ctx);
                    break;
                case "laser":
                case "pew":
                    this.playLaser(ctx);
                    break;
                case "coin":
                case "jump":
                    this.playCoin(ctx);
                    break;
                case "chime":
                case "magic":
                    this.playChime(ctx);
                    break;
                case "boing":
                case "bounce":
                    this.playBoing(ctx);
                    break;
                case "whoosh":
                case "tornado":
                    this.playWhoosh(ctx);
                    break;
                case "laugh":
                case "giggle":
                    this.playLaugh(ctx);
                    break;
                case "boom":
                case "explosion":
                    this.playBoom(ctx);
                    break;
                case "drum":
                case "rimshot":
                    this.playRimshot(ctx);
                    break;
                case "win":
                case "victory":
                    this.playWin(ctx);
                    break;
                case "meow":
                    this.playMeow(ctx);
                    break;
                case "woof":
                    this.playWoof(ctx);
                    break;
                default:
                    this.playChime(ctx);
            }
        } catch (e) {
            console.warn("Audio playback error:", e);
        }
    }

    playTada(ctx) {
        const notes = [261.63, 329.63, 392.00, 523.25]; // C E G C
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
            gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + (idx === 3 ? 0.6 : 0.25));
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + idx * 0.1);
            osc.stop(ctx.currentTime + idx * 0.1 + (idx === 3 ? 0.65 : 0.3));
        });
    }

    playLaser(ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.19);
    }

    playCoin(ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
        osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08); // E6
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.36);
    }

    playChime(ctx) {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);
            gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.05 + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + idx * 0.05);
            osc.stop(ctx.currentTime + idx * 0.05 + 0.55);
        });
    }

    playBoing(ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.33);
    }

    playWhoosh(ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(450, ctx.currentTime + 0.12);
        osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.33);
    }

    playLaugh(ctx) {
        [0, 0.1, 0.2, 0.3, 0.4].forEach((time, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sawtooth";
            const freq = i % 2 === 0 ? 550 : 420;
            osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
            gain.gain.setValueAtTime(0.12, ctx.currentTime + time);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + time);
            osc.stop(ctx.currentTime + time + 0.09);
        });
    }

    playBoom(ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(160, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.45);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.46);
    }

    playRimshot(ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.13);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "square";
        osc2.frequency.setValueAtTime(700, ctx.currentTime + 0.16);
        gain2.gain.setValueAtTime(0.18, ctx.currentTime + 0.16);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.16);
        osc2.stop(ctx.currentTime + 0.36);
    }

    playWin(ctx) {
        const melody = [
            { f: 523.25, d: 0.12 },
            { f: 659.25, d: 0.12 },
            { f: 783.99, d: 0.12 },
            { f: 1046.50, d: 0.35 }
        ];
        let t = ctx.currentTime;
        melody.forEach(item => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(item.f, t);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + item.d);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + item.d + 0.05);
            t += item.d + 0.02;
        });
    }

    playMeow(ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(450, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(650, ctx.currentTime + 0.15);
        osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.42);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.43);
    }

    playWoof(ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(260, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.22, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.17);
    }
}

export const soundEngine = new SoundEngine();

export const SOUND_EFFECTS_LIST = [
    { id: "tada", name: "Ta-da!", emoji: "🎉", desc: "Victory fanfare" },
    { id: "laser", name: "Laser Pew", emoji: "🚀", desc: "Sci-fi blaster" },
    { id: "coin", name: "Super Coin", emoji: "🪙", desc: "Arcade coin" },
    { id: "chime", name: "Magic Chime", emoji: "✨", desc: "Sparkle sound" },
    { id: "boing", name: "Cartoon Boing", emoji: "🦘", desc: "Spring bounce" },
    { id: "whoosh", name: "Tornado Spin", emoji: "🌪️", desc: "Wind vortex" },
    { id: "laugh", name: "Cartoon Giggle", emoji: "😂", desc: "Happy laugh" },
    { id: "boom", name: "Mega Boom", emoji: "💥", desc: "Cartoon blast" },
    { id: "drum", name: "Ba-Dum Tss!", emoji: "🥁", desc: "Punchline drum" },
    { id: "win", name: "Winner Fanfare", emoji: "🏆", desc: "Trophy sound" },
    { id: "meow", name: "Kitty Meow", emoji: "🐱", desc: "Cute cat" },
    { id: "woof", name: "Puppy Woof", emoji: "🐶", desc: "Friendly dog" },
];
