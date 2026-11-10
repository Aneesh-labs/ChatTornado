/**
 * Client-Side Video Quality & Transcoding Service
 * Provides client-side downscaling for:
 * - Original (100% bit-for-bit uncompressed original source file)
 * - Balanced 720p (Max 1280x720 aspect-preserved)
 * - Data Saver 480p (Max 854x480 aspect-preserved)
 * 
 * ZERO SERVER TRANSCODING:
 * Video processing happens strictly in the sender device's browser / WebView
 * before P2P WebRTC transmission.
 */

export const VIDEO_QUALITY_PRESETS = {
    ORIGINAL: "ORIGINAL",
    BALANCED_720P: "BALANCED_720P",
    DATA_SAVER_480P: "DATA_SAVER_480P"
};

/**
 * Estimates transcoded size based on preset and original video duration.
 */
export function estimateTranscodedSize(originalFile, preset, durationSeconds = 30) {
    if (preset === VIDEO_QUALITY_PRESETS.ORIGINAL || !originalFile) {
        return originalFile ? originalFile.size : 0;
    }

    // 720p target ~2.5 Mbps; 480p target ~1.0 Mbps
    const targetBitrateBps = preset === VIDEO_QUALITY_PRESETS.BALANCED_720P ? 2500 * 1000 : 1000 * 1000;
    const estimatedBytes = Math.round((targetBitrateBps * (durationSeconds || 30)) / 8);

    // Never return larger than original
    return Math.min(estimatedBytes, originalFile.size);
}

/**
 * Transcode or downscale video client-side.
 * If preset is ORIGINAL, immediately returns the unaltered File object.
 */
export async function processVideoForTransfer(file, preset = VIDEO_QUALITY_PRESETS.ORIGINAL, onProgress = () => {}) {
    if (preset === VIDEO_QUALITY_PRESETS.ORIGINAL) {
        onProgress(100);
        return file;
    }

    const maxDim = preset === VIDEO_QUALITY_PRESETS.BALANCED_720P ? { w: 1280, h: 720, bitrate: 2500000 } : { w: 854, h: 480, bitrate: 1000000 };

    return new Promise((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;
        const videoUrl = URL.createObjectURL(file);
        video.src = videoUrl;

        video.onloadedmetadata = async () => {
            const originalW = video.videoWidth || 1280;
            const originalH = video.videoHeight || 720;

            // Avoid upscaling
            if (originalW <= maxDim.w && originalH <= maxDim.h) {
                URL.revokeObjectURL(videoUrl);
                onProgress(100);
                resolve(file);
                return;
            }

            // Calculate target dimensions preserving aspect ratio
            const ratio = originalW / originalH;
            let targetW = maxDim.w;
            let targetH = Math.round(targetW / ratio);

            if (targetH > maxDim.h) {
                targetH = maxDim.h;
                targetW = Math.round(targetH * ratio);
            }

            // Enforce even dimensions for video encoders
            targetW = targetW % 2 === 0 ? targetW : targetW - 1;
            targetH = targetH % 2 === 0 ? targetH : targetH - 1;

            // Check MediaRecorder canvas support
            if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
                console.warn("[VideoTranscoder] MediaRecorder captureStream unsupported, using original.");
                URL.revokeObjectURL(videoUrl);
                resolve(file);
                return;
            }

            try {
                const canvas = document.createElement("canvas");
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext("2d");

                const stream = canvas.captureStream(30);

                // Add audio track if present
                try {
                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const source = audioCtx.createMediaElementSource(video);
                    const dest = audioCtx.createMediaStreamDestination();
                    source.connect(dest);
                    source.connect(audioCtx.destination);
                    dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
                } catch (audioErr) {
                    // Audio capture fallback
                }

                const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
                    ? "video/webm;codecs=vp8,opus"
                    : MediaRecorder.isTypeSupported("video/mp4")
                    ? "video/mp4"
                    : "video/webm";

                const recorder = new MediaRecorder(stream, {
                    mimeType,
                    videoBitsPerSecond: maxDim.bitrate
                });

                const recordedChunks = [];
                recorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
                };

                recorder.onstop = () => {
                    URL.revokeObjectURL(videoUrl);
                    const outBlob = new Blob(recordedChunks, { type: mimeType });
                    const extension = mimeType.includes("mp4") ? ".mp4" : ".webm";
                    const newName = file.name.replace(/\.[^/.]+$/, "") + `_${preset.toLowerCase()}` + extension;
                    const transcodedFile = new File([outBlob], newName, { type: mimeType });
                    onProgress(100);
                    resolve(transcodedFile);
                };

                recorder.start(100);
                video.currentTime = 0;
                await video.play();

                const drawFrame = () => {
                    if (video.paused || video.ended) return;
                    ctx.drawImage(video, 0, 0, targetW, targetH);
                    const prog = Math.min(Math.round((video.currentTime / video.duration) * 100), 99);
                    onProgress(prog);
                    requestAnimationFrame(drawFrame);
                };

                drawFrame();

                video.onended = () => {
                    if (recorder.state === "recording") {
                        recorder.stop();
                    }
                };
            } catch (err) {
                console.warn("[VideoTranscoder] Transcoding error, falling back to original:", err);
                URL.revokeObjectURL(videoUrl);
                resolve(file);
            }
        };

        video.onerror = () => {
            URL.revokeObjectURL(videoUrl);
            resolve(file);
        };
    });
}
