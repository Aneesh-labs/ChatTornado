// Pure Web Audio synthesizer for Quiet Cosmic Minimalism feedback.
// Restrained tactile clicks, warm observatory tones, and deep temporal swells.

class AfterspaceSoundscape {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volumes = {
      master: 0.7,
      music: 0.55,
      ambient: 0.5,
      effects: 0.75,
    };
  }

  ensureContext() {
    if (this.muted || typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setVolumes(v) {
    this.volumes = { ...this.volumes, ...v };
    if (this.droneGain && this.ctx) {
      this.droneGain.gain.setTargetAtTime(
        this.muted ? 0.0001 : this.gainFor("ambient", 0.032),
        this.ctx.currentTime,
        0.2
      );
    }
  }

  setMuted(flag) {
    this.muted = Boolean(flag);
    if (this.droneGain && this.ctx) {
      this.droneGain.gain.setTargetAtTime(
        this.muted ? 0.0001 : this.gainFor("ambient", 0.032),
        this.ctx.currentTime,
        0.2
      );
    }
  }

  startAmbientDrone() {
    const ctx = this.ensureContext();
    if (!ctx || this.droneNodes) return;
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(
      this.muted ? 0.0001 : this.gainFor("ambient", 0.032),
      now + 1.8
    );

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(280, now);

    const oscA = ctx.createOscillator();
    oscA.type = "sine";
    oscA.frequency.setValueAtTime(73.42, now); // D2 warm observatory fifth
    const oscB = ctx.createOscillator();
    oscB.type = "sine";
    oscB.frequency.setValueAtTime(110.0, now); // A2

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(masterGain).connect(ctx.destination);
    oscA.start(now);
    oscB.start(now);
    this.droneGain = masterGain;
    this.droneNodes = [oscA, oscB];
  }

  stopAmbientDrone() {
    if (!this.droneNodes) return;
    this.droneNodes.forEach((o) => {
      try {
        o.stop();
      } catch (_) {}
    });
    this.droneNodes = null;
    this.droneGain = null;
  }

  gainFor(channel = "effects", scale = 1) {
    return Math.max(0.0001, this.volumes.master * (this.volumes[channel] ?? 0.6) * scale);
  }

  playClick() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.045);
    g.gain.setValueAtTime(this.gainFor("effects", 0.08), now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  playJournalTurn() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.09);
    g.gain.setValueAtTime(this.gainFor("effects", 0.045), now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  playDiscovery() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [293.66, 440, 523.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      g.gain.setValueAtTime(0.0001, now + idx * 0.09);
      g.gain.linearRampToValueAtTime(this.gainFor("music", 0.075), now + idx * 0.09 + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 1.1);
      osc.connect(g).connect(ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 1.15);
    });
  }

  playTemporalShift(targetIndex = 1) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const base = targetIndex === 0 ? 110 : targetIndex === 2 ? 164.8 : 130.8;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(base * 0.85, now);
    osc.frequency.exponentialRampToValueAtTime(base, now + 0.55);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(this.gainFor("ambient", 0.14), now + 0.22);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.1);
  }

  playScanPing(progressRatio = 0.5) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(340 + progressRatio * 220, now);
    g.gain.setValueAtTime(this.gainFor("effects", 0.035), now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playCompletionChord() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [196.0, 293.66, 369.99, 440.0].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.14);
      g.gain.setValueAtTime(0.0001, now + i * 0.14);
      g.gain.linearRampToValueAtTime(this.gainFor("music", 0.08), now + i * 0.14 + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
      osc.connect(g).connect(ctx.destination);
      osc.start(now + i * 0.14);
      osc.stop(now + 2.9);
    });
  }
}

export const afterspaceSound = new AfterspaceSoundscape();
