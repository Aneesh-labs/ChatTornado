/**
 * In-Phone / In-Browser Local Image Processor
 * Leverages client-side device CPU & RAM using Canvas and Web Workers
 * Supports both "⚡ Fast WebP" (client-optimized) and "💎 HD Lossless" (uncompressed original studio quality).
 */

/**
 * Calculates optimal dimensions while maintaining aspect ratio
 */
export const calculateOptimalDimensions = (width, height, maxDimension = 1600) => {
    if (width <= maxDimension && height <= maxDimension) {
        return { width, height };
    }
    const ratio = width / height;
    if (width > height) {
        return {
            width: maxDimension,
            height: Math.round(maxDimension / ratio),
        };
    }
    return {
        width: Math.round(maxDimension * ratio),
        height: maxDimension,
    };
};

/**
 * Formats bytes to human-readable size
 */
export const formatBytes = (bytes, decimals = 1) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

/**
 * Processes an image file locally in client-side RAM using Canvas
 * Supports "webp" (RAM optimized) or "hd" (Full original zero-loss studio mode)
 */
export const processImageLocally = async (file, options = {}) => {
    const {
        mode = "webp", // 'webp' | 'hd'
        maxDimension = 1600,
        quality = 0.86,
        format = "image/webp",
    } = options;

    if (!file || !file.type.startsWith("image/")) {
        throw new Error("File must be an image");
    }

    const startTime = performance.now();
    const originalSize = file.size;

    // IF HD MODE: Preserve exact original raw bytes without any compression or resizing
    if (mode === "hd") {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);

            img.onload = () => {
                const processingTime = Math.round(performance.now() - startTime);
                resolve({
                    file,
                    rawFile: file,
                    blob: file,
                    previewUrl: objectUrl,
                    originalSize,
                    processedSize: originalSize,
                    savingsPercent: 0,
                    isHd: true,
                    mode: "hd",
                    formattedOriginal: formatBytes(originalSize),
                    formattedProcessed: formatBytes(originalSize),
                    dimensions: { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height },
                    processingTimeMs: processingTime,
                });
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error("Failed to decode image locally"));
            };

            img.src = objectUrl;
        });
    }

    // WEBP / OPTIMIZED MODE:
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = async () => {
            try {
                const { width: targetWidth, height: targetHeight } = calculateOptimalDimensions(
                    img.width,
                    img.height,
                    maxDimension
                );

                const canvas = document.createElement("canvas");
                canvas.width = targetWidth;
                canvas.height = targetHeight;

                const ctx = canvas.getContext("2d", { willReadFrequently: false });
                if (!ctx) {
                    throw new Error("Could not acquire 2D canvas context");
                }

                // Apply high-quality image smoothing on device CPU/GPU
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";

                // Draw resized image
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                // Determine target MIME (fallback to jpeg if webp unsupported)
                const targetMime = format === "image/webp" && canvas.toDataURL("image/webp").startsWith("data:image/webp")
                    ? "image/webp"
                    : "image/jpeg";

                // Convert canvas to compressed Blob in local RAM
                canvas.toBlob(
                    (blob) => {
                        URL.revokeObjectURL(objectUrl);
                        if (!blob) {
                            reject(new Error("Canvas toBlob failed"));
                            return;
                        }

                        const processingTime = Math.round(performance.now() - startTime);
                        const processedSize = blob.size;
                        const savingsPercent = Math.max(0, Math.round(((originalSize - processedSize) / originalSize) * 100));

                        const ext = targetMime === "image/webp" ? ".webp" : ".jpg";
                        const baseName = file.name.replace(/\.[^/.]+$/, "");
                        const optimizedFile = new File([blob], `${baseName}_opt${ext}`, {
                            type: targetMime,
                            lastModified: Date.now(),
                        });

                        const previewUrl = URL.createObjectURL(blob);

                        resolve({
                            file: optimizedFile,
                            rawFile: file,
                            blob,
                            previewUrl,
                            originalSize,
                            processedSize,
                            savingsPercent,
                            isHd: false,
                            mode: "webp",
                            formattedOriginal: formatBytes(originalSize),
                            formattedProcessed: formatBytes(processedSize),
                            dimensions: { width: targetWidth, height: targetHeight },
                            processingTimeMs: processingTime,
                        });
                    },
                    targetMime,
                    quality
                );
            } catch (err) {
                URL.revokeObjectURL(objectUrl);
                reject(err);
            }
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Failed to decode image locally"));
        };

        img.src = objectUrl;
    });
};
