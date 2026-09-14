import React, { useState, useRef, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, useTheme, fmtTime, getMyUserId } from "./constants";
import { getLocalMediaUrl } from "../../../Services/db";
import { requestP2PDownload } from "../../../Services/p2p";
import API from "../../../Services/API";
import CyberShieldVault from "./CyberShieldVault";
import { soundEngine } from "../../../utils/soundEffects";
import InChatGameBoard from "./InChatGameBoard";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🥸", "👮🏿‍♀️"];

/* ═══════════════════════════════════════════════════════════════
   IMAGE, VIDEO & AUDIO DETECTION HELPERS
   ═══════════════════════════════════════════════════════════════ */

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|heic|heif)(\?.*)?$/i;
const VIDEO_EXTENSIONS = /\.(mp4|mov|mkv|avi|wmv|flv|m4v|webm|3gp|ogv|ts)(\?.*)?$/i;
const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|aac|m4a|opus|flac|wma|webm)(\?.*)?$/i;

const extractUrls = (text) => {
    if (!text || typeof text !== "string") return [];
    return text.match(/https?:\/\/[^\s<>"']+/g) || [];
};

const isImageUrl = (url) => typeof url === "string" && IMAGE_EXTENSIONS.test(url);
const isVideoUrl = (url, text) => (typeof url === "string" && VIDEO_EXTENSIONS.test(url)) || (typeof url === "string" && url.toLowerCase().includes('.webm') && (!text || typeof text !== "string" || !text.includes('🎤 Voice')));
const isAudioUrl = (url, text) => typeof url === "string" && AUDIO_EXTENSIONS.test(url) && !isVideoUrl(url, text);

const extractImageUrls = (text) => extractUrls(text).filter(isImageUrl);
const extractVideoUrls = (text) => extractUrls(text).filter(url => isVideoUrl(url, text));
const extractAudioUrls = (text) => extractUrls(text).filter(url => isAudioUrl(url, text));
const extractNonImageUrls = (text) =>
    extractUrls(text).filter((url) => !isImageUrl(url) && !isVideoUrl(url, text) && !isAudioUrl(url, text));
const extractCaption = (text) => {
    if (!text || typeof text !== "string") return "";
    return text.replace(/https?:\/\/[^\s<>"']+/g, "").trim();
};

const getFilenameFromUrl = (url) => {
    try {
        const pathname = new URL(url).pathname;
        return pathname.split("/").pop() || "download";
    } catch {
        return url.split("/").pop() || "download";
    }
};

/* ═══════════════════════════════════════════════════════════════
   DOWNLOAD HELPER
   ═══════════════════════════════════════════════════════════════ */
const downloadFile = async (fileUrl, filename) => {
    try {
        const response = await fetch(fileUrl, { mode: "cors" });
        if (!response.ok) throw new Error("Network response was not ok");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename || getFilenameFromUrl(fileUrl);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        window.open(fileUrl, "_blank");
    }
};

const downloadImage = downloadFile;

const decodeHtmlEntities = (text) => {
    if (!text || typeof text !== "string") return "";
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
};

/* ═══════════════════════════════════════════════════════════════
   LIGHTBOX COMPONENT (for images)
   ═══════════════════════════════════════════════════════════════ */
const ImageLightbox = ({ imageUrl, onClose }) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    const handleDownload = useCallback(() => {
        downloadImage(imageUrl, getFilenameFromUrl(imageUrl));
    }, [imageUrl]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92 backdrop-blur-sm"
            onClick={onClose}
        >
            {/* Close button */}
            <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                onClick={onClose}
                className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur-xl transition hover:bg-white/20 hover:text-white"
            >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </motion.button>

            {/* Download button */}
            <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                className="absolute top-4 right-16 z-10 flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-xs font-bold text-white/70 backdrop-blur-xl transition hover:bg-white/20 hover:text-white"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
            </motion.button>

            {/* Image container */}
            <div className="relative max-h-[90vh] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
                {!loaded && !error && (
                    <div className="flex h-64 w-96 items-center justify-center">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white/60"
                        />
                    </div>
                )}
                {error && (
                    <div className="flex h-64 w-96 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5">
                        <svg className="h-10 w-10 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <p className="text-sm text-white/50">Failed to load image</p>
                    </div>
                )}
                <img
                    src={imageUrl}
                    alt="Full size"
                    className={`max-h-[90vh] max-w-[95vw] rounded-xl object-contain shadow-2xl transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0 absolute"}`}
                    onLoad={() => setLoaded(true)}
                    onError={() => { setError(true); setLoaded(true); }}
                />
            </div>

            {/* Filename at bottom */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-xs text-white/50 backdrop-blur-xl"
            >
                {getFilenameFromUrl(imageUrl)}
            </motion.div>
        </motion.div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   IMAGE PREVIEW COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const ImagePreview = ({ imageUrl, onOpenLightbox }) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const [hover, setHover] = useState(false);

    if (error) {
        return (
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2">
                <svg className="h-4 w-4 text-red-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span className="text-xs text-red-300/70">Failed to load image</span>
            </div>
        );
    }

    return (
        <motion.div
            className="relative mt-1.5 cursor-pointer overflow-hidden rounded-xl"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onClick={(e) => { e.stopPropagation(); onOpenLightbox(imageUrl); }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
        >
            {!loaded && (
                <div className="flex h-40 w-full items-center justify-center rounded-xl bg-white/[0.03]">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white/50"
                    />
                </div>
            )}
            <img
                src={imageUrl}
                alt="Message attachment"
                className={`max-h-[400px] w-full rounded-xl object-cover transition-all duration-300 ${loaded ? "opacity-100" : "opacity-0 absolute inset-0"} ${hover ? "brightness-90" : ""}`}
                loading="lazy"
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
            />

            {/* Hover overlay with download */}
            <AnimatePresence>
                {hover && loaded && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-end justify-end rounded-xl bg-gradient-to-t from-black/60 via-transparent to-transparent p-3"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <motion.button
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            onClick={(e) => { e.stopPropagation(); downloadImage(imageUrl, getFilenameFromUrl(imageUrl)); }}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white/80 backdrop-blur-xl transition hover:bg-white/25 hover:text-white"
                            title="Download"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   VIDEO PREVIEW COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const VideoPreview = ({ videoUrl }) => {
    const [error, setError] = useState(false);

    if (error) {
        return (
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2">
                <svg className="h-4 w-4 text-red-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span className="text-xs text-red-300/70">Failed to load video</span>
            </div>
        );
    }

    const filename = getFilenameFromUrl(videoUrl);

    return (
        <div className="mt-1.5 rounded-xl overflow-hidden border border-white/[0.08] bg-black/30">
            <video
                controls
                preload="metadata"
                className="w-full max-h-[400px] object-contain bg-black/40"
                playsInline
                onError={() => setError(true)}
            >
                <source src={videoUrl} />
                Your browser doesn't support video playback.
            </video>
            <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.03]">
                <span className="text-[10px] text-white/30 font-medium truncate">
                    {filename}
                </span>
                <button
                    onClick={(e) => { e.stopPropagation(); downloadFile(videoUrl, filename); }}
                    className="text-[10px] text-white/30 hover:text-white/70 transition-colors flex items-center gap-1"
                >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                </button>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   AUDIO PREVIEW COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const AudioPreview = ({ audioUrl, isVoiceNote = false }) => {
    return (
        <div className={`mt-1.5 rounded-2xl overflow-hidden border border-white/[0.08] bg-black/30 p-2 ${isVoiceNote ? 'w-full' : ''}`}>
            <audio
                controls
                preload="metadata"
                className={`h-10 ${isVoiceNote ? 'w-full min-w-[200px]' : 'w-full max-w-[260px]'}`}
                style={{
                    filter: "sepia(100%) hue-rotate(190deg) saturate(90%) brightness(80%)",
                    outline: "none"
                }}
            >
                <source src={audioUrl} />
                Your browser doesn't support audio playback.
            </audio>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   FILE LINK COMPONENT (for non-image, non-video attachments)
   ═══════════════════════════════════════════════════════════════ */
const FileLink = ({ url }) => {
    const filename = getFilenameFromUrl(url);
    const ext = filename.split(".").pop()?.toUpperCase() || "FILE";

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 transition-all hover:border-white/[0.15] hover:bg-white/[0.06]"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                <svg className="h-4 w-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white/80">{filename}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">{ext}</p>
            </div>
        </a>
    );
};

/* ═══════════════════════════════════════════════════════════════
   P2P ZERO-SERVER MEDIA PREVIEW COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const P2PMediaPreview = ({ rawMessage, senderId, socket, onOpenLightbox }) => {
    const [meta, setMeta] = useState(null);
    const [localUrl, setLocalUrl] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        try {
            // Decode any escaped HTML entities like &quot; or &#x27;
            const decoded = decodeHtmlEntities(rawMessage) || "";
            if (!decoded) return;
            const jsonPart = decoded.replace(/^⚡ P2P_MEDIA\s*/, "").trim();
            const parsed = JSON.parse(jsonPart);
            setMeta(parsed);

            // Check if file is already saved in local IndexedDB or cache
            getLocalMediaUrl(parsed.fileId).then((url) => {
                if (url) {
                    setLocalUrl(url);
                } else if (socket && socket.readyState === WebSocket.OPEN) {
                    // Auto-start download if recipient doesn't have it yet
                    setDownloading(true);
                    requestP2PDownload(
                        parsed.fileId,
                        senderId,
                        socket,
                        (p) => setProgress(p),
                        (blob) => {
                            setDownloading(false);
                            const objectUrl = URL.createObjectURL(blob);
                            setLocalUrl(objectUrl);
                        }
                    );
                }
            });
        } catch (e) {
            console.error("Failed to parse P2P media metadata:", e, rawMessage);
            // Fallback object so bubble is never blank
            setMeta({
                name: "Photo Attachment",
                type: "image/jpeg",
                size: 0,
                fileId: "unknown"
            });
        }
    }, [rawMessage, senderId, socket]);

    const isImage = !meta || meta.type?.startsWith("image/") || IMAGE_EXTENSIONS.test(meta?.name || "");

    const handleDownload = () => {
        if (!meta?.fileId) return;
        setDownloading(true);
        requestP2PDownload(
            meta.fileId,
            senderId,
            socket,
            (percent) => setProgress(percent),
            (blob) => {
                setDownloading(false);
                const url = URL.createObjectURL(blob);
                setLocalUrl(url);
            }
        );
    };

    if (localUrl && isImage) {
        return (
            <div className="mt-1 flex flex-col gap-1">
                <ImagePreview imageUrl={localUrl} onOpenLightbox={onOpenLightbox} />
                {meta?.name && (
                    <div className="flex items-center justify-between text-[10px] text-white/40 px-1">
                        <span className="truncate max-w-[160px]">{meta.name}</span>
                        <span className="font-mono text-amber-400/80">⚡ P2P Vault</span>
                    </div>
                )}
            </div>
        );
    }

    const formatBytes = (bytes) => {
        if (!bytes) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    return (
        <div className="mt-1.5 rounded-2xl border border-white/[0.08] bg-black/40 p-3 flex flex-col gap-2 min-w-[220px]">
            <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-400 text-sm">⚡</span>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white/90 truncate">{meta?.name || "Photo"}</p>
                    <p className="text-[10px] text-amber-300/60 font-mono">{formatBytes(meta?.size)} • P2P Vault</p>
                </div>
            </div>

            {localUrl ? (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        downloadFile(localUrl, meta?.name || "photo");
                    }}
                    className="w-full py-1.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-colors"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Saved Locally</span>
                </button>
            ) : (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!downloading) handleDownload();
                    }}
                    disabled={downloading}
                    className="w-full py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium border border-amber-500/30 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                    {downloading ? (
                        <span>Downloading photo... {progress}%</span>
                    ) : (
                        <>
                            <span>⚡ Download from Peer</span>
                        </>
                    )}
                </button>
            )}
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   DELETE DIALOG COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const DeleteDialog = ({ isOpen, isMe, onClose, onDelete }) => {
    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative w-[min(400px,90vw)] rounded-2xl border border-white/[0.08] bg-[#0a0a12] p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-lg font-bold text-white">Delete Message?</h3>
                <p className="mt-2 text-sm text-white/50">Choose how you want to delete this message.</p>

                <div className="mt-4 flex flex-col gap-2">
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => { onDelete("me"); onClose(); }}
                        className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left text-sm text-white/80 transition hover:bg-white/[0.06]"
                    >
                        <span className="font-medium text-white">Delete for me</span>
                        <p className="text-[10px] text-white/30">Message will be hidden from your view</p>
                    </motion.button>

                    {isMe && (
                        <>
                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => { onDelete("both"); onClose(); }}
                                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left text-sm text-white/80 transition hover:bg-white/[0.06]"
                            >
                                <span className="font-medium text-red-400">Delete for everyone</span>
                                <p className="text-[10px] text-white/30">Message will be permanently deleted from both sides</p>
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => { onDelete("receiver"); onClose(); }}
                                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left text-sm text-white/80 transition hover:bg-white/[0.06]"
                            >
                                <span className="font-medium text-amber-400">Delete for receiver</span>
                                <p className="text-[10px] text-white/30">Message will be hidden from the recipient</p>
                            </motion.button>
                        </>
                    )}
                </div>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className="mt-4 w-full rounded-xl border border-white/[0.06] py-2.5 text-sm font-medium text-white/40 transition hover:bg-white/[0.04]"
                >
                    Cancel
                </motion.button>
            </div>
        </motion.div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   SOUND BUBBLE COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const SoundBubble = ({ rawMessage }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    let soundObj = { name: "Cartoon Sound", emoji: "🔊", id: "tada", desc: "Sound effect" };
    try {
        soundObj = JSON.parse(rawMessage.replace(/^🔊 SOUND:\s*/, ""));
    } catch (e) {
        console.warn("Failed to parse sound metadata:", e);
    }

    const playSound = () => {
        setIsPlaying(true);
        soundEngine.play(soundObj.id);
        setTimeout(() => setIsPlaying(false), 700);
    };

    return (
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-fuchsia-950/60 to-violet-950/60 border border-fuchsia-500/30 min-w-[200px] shadow-lg select-none">
            <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={playSound}
                className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-violet-600 text-2xl flex items-center justify-center shadow-lg text-white flex-shrink-0"
            >
                {soundObj.emoji || "🔊"}
            </motion.button>
            <div className="flex-1 min-w-0">
                <div className="text-xs font-black text-white truncate flex items-center gap-1.5">
                    <span>{soundObj.name}</span>
                    {isPlaying && <span className="animate-pulse text-[10px] text-amber-300 font-normal">Playing…</span>}
                </div>
                <button
                    type="button"
                    onClick={playSound}
                    className="text-[11px] text-fuchsia-300 font-bold hover:text-white transition-colors block mt-0.5"
                >
                    Tap to play 🔊
                </button>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN MESSAGE BUBBLE COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const MessageBubble = React.memo(({
    msg,
    isMe,
    showAvatar,
    user,
    socket,
    onReaction,
    onReply,
    onSelect,
    onLongPress,
    onDelete,
    selected,
    isMobile = false,
    onSend,
}) => {
    const theme = useTheme();
    const myId = getMyUserId();
    const [hover, setHover] = useState(false);
    const [lightboxImage, setLightboxImage] = useState(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const longPressTimer = useRef(null);

    // Cyber Shield state
    const [unlockedPayload, setUnlockedPayload] = useState(null);

    const handleUnlockCapsule = async () => {
        if (msg.shield_mode !== 'timelock') return true;
        try {
            const token = sessionStorage.getItem("token");
            const res = await API.post(`/messages/${msg.id}/unlock?token=${encodeURIComponent(token || '')}`);
            if (!res.data.is_locked) {
                setUnlockedPayload(res.data.message);
                return true;
            }
        } catch (e) {
            console.error("Unlock failed", e);
        }
        return false;
    };

    const bubbleClass = isMe ? theme.bubble.me : theme.bubble.them;

    const readStateConfig = (() => {
        const state = msg.readState || msg.read_state || "sent";
        if (state === "read") {
            return { label: "Read", marks: "✓✓", className: theme.accentText };
        }
        if (state === "delivered") {
            return { label: "Delivered", marks: "✓✓", className: "text-white/30" };
        }
        return { label: "Sent", marks: "✓", className: "text-white/20" };
    })();

    const handleTouchStart = useCallback(() => {
        if (!isMobile || onSelect) return;
        longPressTimer.current = setTimeout(() => {
            onLongPress?.(msg);
        }, 450);
    }, [isMobile, onSelect, onLongPress, msg]);

    const handleTouchEnd = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    const handleContextMenu = useCallback((e) => {
        if (isMobile) {
            e.preventDefault();
            onLongPress?.(msg);
        }
    }, [isMobile, onLongPress, msg]);

    const handleDeleteClick = useCallback(() => {
        setShowDeleteDialog(true);
    }, []);

    // Detect content types
    const actualMessage = unlockedPayload !== null ? unlockedPayload : (msg.message || "");
    const isP2P = typeof actualMessage === "string" && actualMessage.startsWith('⚡ P2P_MEDIA');
    const isGame = typeof actualMessage === "string" && actualMessage.startsWith('🎮 GAME:');
    const isSound = typeof actualMessage === "string" && actualMessage.startsWith('🔊 SOUND:');
    let parsedGame = null;
    if (isGame) {
        try {
            parsedGame = JSON.parse(actualMessage.replace(/^🎮 GAME:\s*/, ""));
        } catch (e) {
            console.warn("Failed to parse game data:", e);
        }
    }

    const imageUrls = !isP2P && !isGame && !isSound ? extractImageUrls(actualMessage) : [];
    const videoUrls = !isP2P && !isGame && !isSound ? extractVideoUrls(actualMessage) : [];
    const audioUrls = !isP2P && !isGame && !isSound ? extractAudioUrls(actualMessage) : [];
    const nonImageUrls = !isP2P && !isGame && !isSound ? extractNonImageUrls(actualMessage) : [];
    const caption = !isP2P && !isGame && !isSound ? extractCaption(actualMessage) : "";
    const hasImages = imageUrls.length > 0;
    const hasVideos = videoUrls.length > 0;
    const hasAudio = audioUrls.length > 0;
    const hasFiles = nonImageUrls.length > 0;
    const isVoiceNote = !isP2P && !isGame && !isSound && typeof actualMessage === "string" && actualMessage.includes('🎤 Voice Message');

    const renderMessageContent = () => {
        if (isGame && parsedGame) {
            return (
                <InChatGameBoard
                    gameData={parsedGame}
                    myUserId={myId}
                    senderId={msg.sender_id}
                    onUpdateGame={(updatedGame) => {
                        onSend?.("🎮 GAME:" + JSON.stringify(updatedGame));
                    }}
                />
            );
        }

        if (isSound) {
            return <SoundBubble rawMessage={actualMessage} />;
        }

        return (
            <>
                {/* Caption text */}
                {(hasImages || hasVideos || hasAudio || hasFiles) && caption && !isVoiceNote && (
                    <p className="text-[13px] sm:text-sm text-white/90 leading-relaxed whitespace-pre-wrap break-words selection:bg-white/20 mb-1">
                        {decodeHtmlEntities(caption)}
                    </p>
                )}
            {/* Special voice note styling for caption */}
            {isVoiceNote && (
                <div className="flex items-center gap-2 mb-2 text-white/90">
                    <span className="text-xl">🎤</span>
                    <span className="text-sm font-semibold tracking-wide uppercase text-white/70">Voice Message</span>
                </div>
            )}

            {/* ✅ IMAGE PREVIEWS */}
            {hasImages && imageUrls.map((url, idx) => (
                <ImagePreview
                    key={`${msg.id}-img-${idx}`}
                    imageUrl={url}
                    onOpenLightbox={setLightboxImage}
                />
            ))}

            {/* ✅ VIDEO PREVIEWS */}
            {hasVideos && videoUrls.map((url, idx) => (
                <VideoPreview
                    key={`${msg.id}-video-${idx}`}
                    videoUrl={url}
                />
            ))}

            {/* ✅ AUDIO PREVIEWS */}
            {hasAudio && audioUrls.map((url, idx) => (
                <AudioPreview
                    key={`${msg.id}-audio-${idx}`}
                    audioUrl={url}
                    isVoiceNote={isVoiceNote}
                />
            ))}

            {/* ✅ P2P ZERO-SERVER MEDIA */}
            {isP2P && (
                <P2PMediaPreview
                    rawMessage={actualMessage}
                    senderId={msg.sender_id}
                    socket={socket}
                    onOpenLightbox={setLightboxImage}
                />
            )}

            {/* ✅ FILE LINKS */}
            {hasFiles && nonImageUrls.map((url, idx) => (
                <FileLink key={`${msg.id}-file-${idx}`} url={url} />
            ))}

            {/* Plain text fallback */}
            {!hasImages && !hasVideos && !hasAudio && !hasFiles && !isP2P && actualMessage && (
                <p className="text-[13px] sm:text-sm text-white/90 leading-relaxed whitespace-pre-wrap break-words selection:bg-white/20">
                    {decodeHtmlEntities(actualMessage)}
                </p>
            )}
        </>
    );
};

    return (
        <>
            <motion.div
                layout
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className={`flex ${isMe ? "justify-end" : "justify-start"} group relative px-1 sm:px-4 my-0.5 sm:my-1.5`}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
                onContextMenu={handleContextMenu}
            >
                {!isMe && (
                    <div className="w-7 sm:w-8 flex-shrink-0 mr-1 sm:mr-2 self-end mb-0.5 sm:mb-1 select-none">
                        {showAvatar && user ? (
                            <Avatar user={user} size="xs" showStatus={false} />
                        ) : (
                            <div className="w-6 h-6" aria-hidden="true" />
                        )}
                    </div>
                )}

                <div className={`min-w-0 w-full max-w-[90%] sm:max-w-[85%] lg:max-w-[420px] flex flex-col ${isMe ? "items-end" : "items-start"} relative`}>
                    {/* Reply preview */}
                    {msg.reply_to && (
                        <div
                            className={`mb-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] text-white/40 border ${theme.border} ${theme.glass} backdrop-blur-sm max-w-[200px] sm:max-w-[260px] truncate select-none`}
                            title={msg.reply_to.message}
                        >
                            <span className="font-semibold text-white/20 mr-1">↳</span> {decodeHtmlEntities(msg.reply_to.message)}
                        </div>
                    )}

                    {/* Desktop hover actions */}
                    <AnimatePresence>
                        {hover && !isMobile && (
                            <motion.div
                                initial={{ opacity: 0, y: 4, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 4, scale: 0.9 }}
                                transition={{ duration: 0.12 }}
                                className={`absolute ${isMe ? "right-1" : "left-1"} -top-10 sm:-top-11 z-20 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg sm:rounded-xl ${theme.glass} border ${theme.border} backdrop-blur-xl shadow-2xl select-none`}
                                role="toolbar"
                                aria-label="Message action options"
                            >
                                {QUICK_REACTIONS.map((emoji) => (
                                    <motion.button
                                        key={emoji}
                                        type="button"
                                        whileHover={{ scale: 1.25 }}
                                        whileTap={{ scale: 0.85 }}
                                        onClick={() => onReaction?.(msg.id, emoji)}
                                        className="text-sm sm:text-base p-1 leading-none transition-transform"
                                        aria-label={`React with ${emoji}`}
                                    >
                                        {emoji}
                                    </motion.button>
                                ))}
                                <div className="w-[1px] h-3.5 bg-white/10 mx-1" role="separator" />
                                <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => onReply?.(msg)}
                                    className="text-[11px] text-white/50 hover:text-white/90 px-1.5 py-0.5 rounded-md hover:bg-white/[0.08] transition-colors font-medium"
                                    aria-label="Reply to message"
                                >
                                    Reply
                                </motion.button>
                                <div className="w-[1px] h-3.5 bg-white/10 mx-1" role="separator" />
                                <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleDeleteClick}
                                    className="text-[11px] text-red-400/60 hover:text-red-400 px-1.5 py-0.5 rounded-md hover:bg-red-500/10 transition-colors font-medium"
                                    aria-label="Delete message"
                                >
                                    Delete
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Message bubble */}
                    <motion.div
                        whileHover={!isMobile ? { scale: 1.002 } : {}}
                        onClick={() => onSelect?.(msg.id)}
                        className={`
                            ${isGame ? "p-0 bg-transparent border-transparent shadow-none" : "px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl border backdrop-blur-xl " + bubbleClass}
                            ${!isGame && (isMe ? "rounded-br-md" : "rounded-bl-md")}
                            transition-all duration-100 touch-manipulation
                            ${selected ? "ring-2 ring-violet-400/80 border-transparent shadow-lg" : "shadow-sm"}
                        `}
                    >
                        {msg.is_shielded ? (
                            <CyberShieldVault
                                shieldMode={msg.shield_mode}
                                unlockAt={msg.unlock_at}
                                isLocked={msg.is_locked}
                                messageId={msg.id}
                                token={sessionStorage.getItem("token")}
                                onUnlocked={handleUnlockCapsule}
                            >
                                {renderMessageContent()}
                            </CyberShieldVault>
                        ) : (
                            renderMessageContent()
                        )}

                        {/* Timestamp */}
                        <div className={`flex items-center gap-1 mt-0.5 sm:mt-1 ${isMe ? "justify-end" : "justify-start"} select-none`}>
                            <span className="text-[9px] sm:text-[10px] text-white/30 font-medium tabular-nums">
                                {fmtTime(msg.created_at)}
                            </span>
                            {isMe && (
                                <span className={`text-[9px] sm:text-[10px] font-bold ${readStateConfig.className}`} title={readStateConfig.label}>
                                    <span className="sr-only">{readStateConfig.label}</span>
                                    {readStateConfig.marks}
                                </span>
                            )}
                        </div>
                    </motion.div>

                    {/* Reactions */}
                    {msg.reactions && msg.reactions.length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 select-none ${isMe ? "justify-end" : "justify-start"}`} role="group" aria-label="Message reactions">
                            {msg.reactions.map((r) => {
                                if (!r.glyph) return null;
                                const reactorCount = r.users?.length || 0;
                                const hasMyReaction = Boolean(myId && r.users?.includes(myId));
                                return (
                                    <motion.button
                                        key={r.glyph}
                                        type="button"
                                        whileTap={{ scale: 0.92 }}
                                        onClick={() => onReaction?.(msg.id, r.glyph)}
                                        className={`${hasMyReaction ? "bg-sky-500/20 border-sky-400/50 text-sky-200 shadow-sm" : `${theme.glass} border ${theme.border} hover:border-white/20`} transition-all flex items-center gap-1 px-2 py-0.5 sm:px-2.5 rounded-full text-xs sm:text-sm font-medium touch-manipulation`}
                                        aria-label={`${reactorCount} users reacted with ${r.glyph}${hasMyReaction ? " (including you, click to remove)" : ""}`}
                                        title={hasMyReaction ? "Click to remove your reaction" : "Click to react"}
                                    >
                                        <span className="text-xs sm:text-sm leading-none">{r.glyph}</span>
                                        <span className={`text-[9px] sm:text-[10px] font-bold tabular-nums ${hasMyReaction ? "text-sky-300" : "text-white/50"}`}>
                                            {reactorCount}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Lightbox */}
            <AnimatePresence>
                {lightboxImage && (
                    <ImageLightbox
                        imageUrl={lightboxImage}
                        onClose={() => setLightboxImage(null)}
                    />
                )}
            </AnimatePresence>

            {/* Delete Dialog */}
            <DeleteDialog
                isOpen={showDeleteDialog}
                isMe={isMe}
                onClose={() => setShowDeleteDialog(false)}
                onDelete={(mode) => onDelete?.(msg.id, mode)}
            />
        </>
    );
});

MessageBubble.propTypes = {
    msg: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        message: PropTypes.string.isRequired,
        created_at: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
        readState: PropTypes.oneOf(["sent", "delivered", "read"]),
        reply_to: PropTypes.shape({ message: PropTypes.string }),
        reactions: PropTypes.arrayOf(
            PropTypes.shape({ glyph: PropTypes.string, users: PropTypes.array })
        ),
    }).isRequired,
    isMe: PropTypes.bool.isRequired,
    showAvatar: PropTypes.bool.isRequired,
    user: PropTypes.object,
    onReaction: PropTypes.func,
    onReply: PropTypes.func,
    onSelect: PropTypes.func,
    onLongPress: PropTypes.func,
    onDelete: PropTypes.func,
    selected: PropTypes.bool,
    isMobile: PropTypes.bool,
};

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;