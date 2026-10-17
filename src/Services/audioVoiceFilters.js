/**
 * ChatTornado Web Audio DSP Engine
 * Applies voice transformation filters (Helium, Deep Giant, Cyber Robot, Walkie-Talkie, Cosmic Echo)
 * directly in the browser using Web Audio API and OfflineAudioContext.
 */

export const VOICE_FILTERS = [
    { id: "normal", name: "Normal", icon: "🎙️", desc: "Studio Clarity" },
    { id: "helium", name: "Helium", icon: "🐿️", desc: "Chipmunk Pitch" },
    { id: "deep", name: "Deep Giant", icon: "👹", desc: "Sub-Bass Titan" },
    { id: "robot", name: "Cyber Robot", icon: "🤖", desc: "Metallic Modulator" },
    { id: "walkie", name: "Walkie-Talkie", icon: "📻", desc: "Retro Radio Grit" },
    { id: "echo", name: "Cosmic Echo", icon: "🌌", desc: "Spacious Reverb" },
];

/**
 * Converts an AudioBuffer into a WAV Blob
 */
function bufferToWave(abuffer, len) {
    const numOfChan = abuffer.numberOfChannels;
    const length = len * numOfChan * 2 + 44;
    const out = new DataView(new ArrayBuffer(length));
    const channels = [];
    let sample = 0;
    let offset = 0;
    let pos = 0;

    function setUint16(data) {
        out.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data) {
        out.setUint32(pos, data, true);
        pos += 4;
    }

    // RIFF identifier
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8);  // file length - 8
    setUint32(0x45564157); // "WAVE"

    // format chunk identifier
    setUint32(0x20746d66); // "fmt "
    setUint32(16);          // format chunk length
    setUint16(1);           // sample format (raw)
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // byte rate
    setUint16(numOfChan * 2); // block align
    setUint16(16); // bits per sample

    // data chunk identifier
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4); // chunk length

    for (let i = 0; i < abuffer.numberOfChannels; i++) {
        channels.push(abuffer.getChannelData(i));
    }

    while (pos < length) {
        for (let i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset] || 0));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
            out.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    return new Blob([out], { type: "audio/wav" });
}

/**
 * Apply selected voice filter to recorded audio blob
 */
export async function applyVoiceFilter(rawAudioBlob, filterId = "normal") {
    if (!rawAudioBlob || filterId === "normal") {
        return rawAudioBlob;
    }

    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const tempCtx = new AudioContextClass();
        const arrayBuffer = await rawAudioBlob.arrayBuffer();
        const decodedBuffer = await tempCtx.decodeAudioData(arrayBuffer);
        await tempCtx.close();

        const sampleRate = decodedBuffer.sampleRate;
        const length = decodedBuffer.length;
        const duration = decodedBuffer.duration;

        // Render through OfflineAudioContext
        const offlineCtx = new OfflineAudioContext(
            decodedBuffer.numberOfChannels,
            length,
            sampleRate
        );

        const source = offlineCtx.createBufferSource();
        source.buffer = decodedBuffer;

        let lastNode = source;

        if (filterId === "helium") {
            // Chipmunk Formant Shift & Highpass
            const highpass = offlineCtx.createBiquadFilter();
            highpass.type = "highpass";
            highpass.frequency.value = 400;

            const peak = offlineCtx.createBiquadFilter();
            peak.type = "peaking";
            peak.frequency.value = 2800;
            peak.gain.value = 14;

            lastNode.connect(highpass);
            highpass.connect(peak);
            lastNode = peak;
        } else if (filterId === "deep") {
            // Deep Giant Sub-Bass Resonance
            const lowpass = offlineCtx.createBiquadFilter();
            lowpass.type = "lowpass";
            lowpass.frequency.value = 1200;

            const bassBoost = offlineCtx.createBiquadFilter();
            bassBoost.type = "lowshelf";
            bassBoost.frequency.value = 180;
            bassBoost.gain.value = 16;

            lastNode.connect(bassBoost);
            bassBoost.connect(lowpass);
            lastNode = lowpass;
        } else if (filterId === "robot") {
            // Ring Modulation Metallic Resonance
            const carrier = offlineCtx.createOscillator();
            carrier.type = "sawtooth";
            carrier.frequency.value = 65; // Hz

            const ringMod = offlineCtx.createGain();
            ringMod.gain.value = 0.5;

            carrier.connect(ringMod.gain);
            carrier.start();

            lastNode.connect(ringMod);
            lastNode = ringMod;
        } else if (filterId === "walkie") {
            // Walkie-Talkie Bandpass (300Hz - 3200Hz)
            const bpass = offlineCtx.createBiquadFilter();
            bpass.type = "bandpass";
            bpass.frequency.value = 1500;
            bpass.Q.value = 1.2;

            const dist = offlineCtx.createWaveShaper();
            dist.curve = makeDistortionCurve(18);

            lastNode.connect(bpass);
            bpass.connect(dist);
            lastNode = dist;
        } else if (filterId === "echo") {
            // Cosmic Delay / Echo
            const delay = offlineCtx.createDelay();
            delay.delayTime.value = 0.22; // 220ms

            const feedback = offlineCtx.createGain();
            feedback.gain.value = 0.45;

            const wetGain = offlineCtx.createGain();
            wetGain.gain.value = 0.7;

            lastNode.connect(delay);
            delay.connect(feedback);
            feedback.connect(delay);
            delay.connect(wetGain);

            // Connect dry + wet to output
            lastNode.connect(offlineCtx.destination);
            wetGain.connect(offlineCtx.destination);
            source.start(0);

            const renderedBuffer = await offlineCtx.startRendering();
            return bufferToWave(renderedBuffer, renderedBuffer.length);
        }

        // Connect final node to destination
        lastNode.connect(offlineCtx.destination);
        source.start(0);

        const renderedBuffer = await offlineCtx.startRendering();
        return bufferToWave(renderedBuffer, renderedBuffer.length);
    } catch (err) {
        console.warn("Audio filter rendering fallback to raw audio:", err);
        return rawAudioBlob;
    }
}

function makeDistortionCurve(amount = 20) {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
}
