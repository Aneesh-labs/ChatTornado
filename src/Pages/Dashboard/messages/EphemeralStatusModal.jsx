import React, { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Camera, Shield, AlertTriangle, ChevronLeft, ChevronRight, Eye, Sparkles } from "lucide-react";
import { soundEngine } from "../../../utils/soundEffects";
import { saveLocalStatusStory, getLocalStatusStory, clearLocalStatusStory } from "../../../Services/db";

export default function EphemeralStatusModal({
    isOpen,
    onClose,
    mode = "view", // "create" | "view"
    targetUser = null, // user to view story for
    myUser = null,
    socket = null,
}) {
    // Creator state
    const [selectedImages, setSelectedImages] = useState([]); // [{ id, dataUrl, caption }]
    const [myStory, setMyStory] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef(null);

    // Viewer state
    const [activeStoryIndex, setActiveStoryIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const [storyItems, setStoryItems] = useState([]);
    const [isLoadingStory, setIsLoadingStory] = useState(true);
    const [isOwnerOffline, setIsOwnerOffline] = useState(false);
    const [screenshotAlert, setScreenshotAlert] = useState(false);
    const timerRef = useRef(null);

    const isViewingSelf = targetUser?.id === myUser?.id || !targetUser;

    /* ── Load user's own status story from IndexedDB ─────────────────────── */
    const loadMyStatus = useCallback(async () => {
        const stored = await getLocalStatusStory();
        setMyStory(stored);
        if (stored && stored.items) {
            setSelectedImages(stored.items);
        } else {
            setSelectedImages([]);
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        if (mode === "create" || isViewingSelf) {
            loadMyStatus();
        }
    }, [isOpen, mode, isViewingSelf, loadMyStatus]);

    /* ── Request peer's ephemeral status over P2P WebSocket ─────────────── */
    useEffect(() => {
        if (!isOpen || mode !== "view") return;

        if (isViewingSelf) {
            getLocalStatusStory().then((rec) => {
                setIsLoadingStory(false);
                if (rec && rec.items && rec.items.length > 0) {
                    setStoryItems(rec.items);
                    setIsOwnerOffline(false);
                } else {
                    setStoryItems([]);
                }
            });
            return;
        }

        setIsLoadingStory(true);
        setIsOwnerOffline(false);
        setStoryItems([]);

        // Send P2P fetch request to target user via real-time WebSocket
        if (socket && socket.readyState === WebSocket.OPEN && targetUser?.id) {
            socket.send(JSON.stringify({
                type: "status_p2p_request",
                target_user_id: targetUser.id
            }));
        } else {
            setIsLoadingStory(false);
            setIsOwnerOffline(true);
        }

        const handleMessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "status_p2p_response" && String(data.owner_id) === String(targetUser?.id)) {
                    setIsLoadingStory(false);
                    if (data.status === "offline") {
                        setIsOwnerOffline(true);
                        setStoryItems([]);
                    } else if (data.items && data.items.length > 0) {
                        setStoryItems(data.items);
                        setIsOwnerOffline(false);
                    } else {
                        setStoryItems([]);
                    }
                }
            } catch { }
        };

        if (socket) {
            socket.addEventListener("message", handleMessage);
        }

        // Safety timeout: if target doesn't respond in 4 seconds, mark as offline/inactive
        const timeout = setTimeout(() => {
            setIsLoadingStory(false);
            if (storyItems.length === 0) {
                setIsOwnerOffline(true);
            }
        }, 4000);

        return () => {
            clearTimeout(timeout);
            if (socket) socket.removeEventListener("message", handleMessage);
        };
    }, [isOpen, mode, targetUser?.id, isViewingSelf, socket, storyItems.length]);

    /* ── Respond to P2P Status Requests from other viewers ───────────────── */
    useEffect(() => {
        if (!socket) return;
        const handlePeerRequest = async (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "status_p2p_request" && data.requester_id) {
                    const stored = await getLocalStatusStory();
                    socket.send(JSON.stringify({
                        type: "status_p2p_response",
                        requester_id: data.requester_id,
                        status: "online",
                        items: stored?.items || []
                    }));
                }
            } catch { }
        };

        socket.addEventListener("message", handlePeerRequest);
        return () => socket.removeEventListener("message", handlePeerRequest);
    }, [socket]);

    /* ── Anti-Screenshot & Screen Capture Detection ─────────────────────── */
    useEffect(() => {
        if (!isOpen || mode !== "view") return;

        const handleKey = (e) => {
            if (e.key === "PrintScreen") {
                setScreenshotAlert(true);
                soundEngine.play("drum");
                setTimeout(() => setScreenshotAlert(false), 4000);
            }
        };

        window.addEventListener("keyup", handleKey);
        return () => window.removeEventListener("keyup", handleKey);
    }, [isOpen, mode]);

    /* ── Viewer Progress Bar Timer (5s per slide) ───────────────────────── */
    useEffect(() => {
        if (!isOpen || mode !== "view" || storyItems.length === 0 || isPaused) return;

        const DURATION = 5000; // 5 seconds per slide
        const INTERVAL = 50;

        timerRef.current = setInterval(() => {
            setProgress((prev) => {
                const next = prev + (INTERVAL / DURATION) * 100;
                if (next >= 100) {
                    // Advance slide
                    setActiveStoryIndex((curr) => {
                        if (curr + 1 < storyItems.length) {
                            return curr + 1;
                        }
                        onClose();
                        return curr;
                    });
                    return 0;
                }
                return next;
            });
        }, INTERVAL);

        return () => clearInterval(timerRef.current);
    }, [isOpen, mode, storyItems.length, isPaused, activeStoryIndex, onClose]);

    // Reset progress when slide changes
    useEffect(() => {
        setProgress(0);
    }, [activeStoryIndex]);

    if (!isOpen) return null;

    /* ── Handle Image File Selection (Max 6) ────────────────────────────── */
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const remainingSlots = 6 - selectedImages.length;
        if (remainingSlots <= 0) {
            alert("Maximum of 6 status photos allowed.");
            return;
        }

        const validFiles = files.slice(0, remainingSlots);

        validFiles.forEach((file) => {
            const reader = new FileReader();
            reader.onload = () => {
                setSelectedImages((prev) => {
                    if (prev.length >= 6) return prev;
                    return [
                        ...prev,
                        {
                            id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                            dataUrl: reader.result,
                            caption: "",
                            timestamp: Date.now(),
                        }
                    ];
                });
            };
            reader.readAsDataURL(file);
        });

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    /* ── Save and Broadcast Status ──────────────────────────────────────── */
    const handleSaveStatus = async () => {
        if (selectedImages.length === 0) return;
        setIsSaving(true);
        try {
            await saveLocalStatusStory(selectedImages);
            soundEngine.play("coin");

            // Broadcast lightweight beacon to contacts
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: "status_story_beacon",
                    has_story: true,
                    story_count: selectedImages.length
                }));
            }

            loadMyStatus();
            onClose();
        } catch (err) {
            console.error("Failed to save status:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteStatus = async () => {
        if (window.confirm("Are you sure you want to clear your current status story?")) {
            await clearLocalStatusStory();
            soundEngine.play("whoosh");
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: "status_story_beacon",
                    has_story: false,
                    story_count: 0
                }));
            }
            setSelectedImages([]);
            setMyStory(null);
            onClose();
        }
    };

    const handleNextSlide = () => {
        if (activeStoryIndex + 1 < storyItems.length) {
            setActiveStoryIndex((prev) => prev + 1);
            setProgress(0);
        } else {
            onClose();
        }
    };

    const handlePrevSlide = () => {
        if (activeStoryIndex > 0) {
            setActiveStoryIndex((prev) => prev - 1);
            setProgress(0);
        }
    };

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-xl p-0 sm:p-4 select-none touch-none"
                onContextMenu={(e) => e.preventDefault()}
            >
                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90"
                    title="Close"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Screenshot Warning Banner */}
                {screenshotAlert && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-16 z-50 px-4 py-2 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-200 text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md"
                    >
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>📸 Screenshot Detected! Ephemeral Status is device-only.</span>
                    </motion.div>
                )}

                {/* ==============================================================
                    MODE 1: STORY CREATOR (Local Device-Only Upload)
                   ============================================================== */}
                {mode === "create" ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-[#100c1e] p-6 text-white shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                            <div className="flex items-center gap-2.5">
                                <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-lg">
                                    <Camera className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black">Ephemeral Status Story</h3>
                                    <p className="text-[11px] text-white/50">Upload 1 to 6 photos • Pure P2P device-to-device</p>
                                </div>
                            </div>
                            {myStory && (
                                <button
                                    type="button"
                                    onClick={handleDeleteStatus}
                                    className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1 transition-all"
                                    title="Delete Current Story"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Delete</span>
                                </button>
                            )}
                        </div>

                        {/* Explanatory Cyber Notice */}
                        <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs flex items-start gap-2.5 leading-relaxed">
                            <Shield className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold block text-white">Zero Server Database Footprint</span>
                                <span>
                                    These photos are saved <strong>only on your local device</strong>. When someone views your status, they are streamed live from your phone/browser. They vanish after 24 hours.
                                </span>
                            </div>
                        </div>

                        {/* Image Preview Carousel / Grid */}
                        <div className="grid grid-cols-3 gap-2.5">
                            {selectedImages.map((img, idx) => (
                                <div key={img.id} className="relative aspect-square rounded-2xl overflow-hidden border border-white/15 bg-black/40 group">
                                    <img src={img.dataUrl} alt="" className="w-full h-full object-cover" draggable={false} />
                                    <button
                                        type="button"
                                        onClick={() => setSelectedImages((prev) => prev.filter((_, i) => i !== idx))}
                                        className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-rose-600 text-white transition-all opacity-80 hover:opacity-100"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="absolute bottom-1 left-1.5 text-[9px] font-mono font-bold bg-black/60 px-1.5 py-0.5 rounded text-white/80">
                                        #{idx + 1}
                                    </span>
                                </div>
                            ))}

                            {selectedImages.length < 6 && (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square rounded-2xl border-2 border-dashed border-white/20 hover:border-pink-500/60 bg-white/[0.02] hover:bg-pink-500/5 flex flex-col items-center justify-center gap-1 text-white/50 hover:text-white transition-all"
                                >
                                    <Plus className="w-6 h-6" />
                                    <span className="text-[10px] font-bold">Add Photo</span>
                                    <span className="text-[8px] text-white/40">{selectedImages.length}/6</span>
                                </button>
                            )}
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {/* Caption for first image or selected */}
                        {selectedImages.length > 0 && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-white/70 block">
                                    Caption for Story
                                </label>
                                <input
                                    type="text"
                                    maxLength={80}
                                    placeholder="Add an optional caption (e.g. Working on hackathon!)..."
                                    value={selectedImages[0]?.caption || ""}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setSelectedImages((prev) =>
                                            prev.map((item, idx) => (idx === 0 ? { ...item, caption: val } : item))
                                        );
                                    }}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-pink-500 focus:outline-none"
                                />
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-2">
                            <span className="text-xs text-white/40">
                                {selectedImages.length} of 6 selected
                            </span>
                            <button
                                type="button"
                                disabled={selectedImages.length === 0 || isSaving}
                                onClick={handleSaveStatus}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg ${
                                    selectedImages.length > 0 && !isSaving
                                        ? "bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white active:scale-95 shadow-pink-500/25"
                                        : "bg-white/10 text-white/30 cursor-not-allowed"
                                }`}
                            >
                                <Sparkles className="w-4 h-4" />
                                <span>{isSaving ? "Saving..." : "Publish P2P Story"}</span>
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    /* ==============================================================
                        MODE 2: STORY VIEWER (Instant Fullscreen Stories)
                       ============================================================== */
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative w-full max-w-sm sm:max-w-md h-[85vh] max-h-[720px] rounded-[2.5rem] overflow-hidden border border-white/15 bg-black flex flex-col justify-between shadow-2xl"
                    >
                        {/* Segmented Top Progress Bars */}
                        <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-1.5">
                            {storyItems.map((_, idx) => {
                                let fillPercent = 0;
                                if (idx < activeStoryIndex) fillPercent = 100;
                                else if (idx === activeStoryIndex) fillPercent = progress;
                                return (
                                    <div key={idx} className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden">
                                        <div
                                            className="h-full bg-white transition-all ease-linear"
                                            style={{ width: `${fillPercent}%` }}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Header: User Profile Info */}
                        <div className="absolute top-6 left-4 right-16 z-30 flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-pink-500 shadow-md">
                                <img
                                    src={targetUser?.avatar || targetUser?.avatar_url || "/default-avatar.png"}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    draggable={false}
                                />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-white drop-shadow">
                                    {targetUser?.username || "You"}
                                </h4>
                                <span className="text-[10px] text-white/70 block drop-shadow">
                                    {isViewingSelf ? "Your Ephemeral Story" : "Live Device Stream"}
                                </span>
                            </div>
                        </div>

                        {/* Story Content Area */}
                        <div
                            className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden"
                            onMouseDown={() => setIsPaused(true)}
                            onMouseUp={() => setIsPaused(false)}
                            onTouchStart={() => setIsPaused(true)}
                            onTouchEnd={() => setIsPaused(false)}
                        >
                            {isLoadingStory ? (
                                <div className="flex flex-col items-center gap-3 text-white/60">
                                    <div className="h-8 w-8 rounded-full border-2 border-pink-500 border-t-transparent animate-spin" />
                                    <span className="text-xs">Fetching P2P story from device...</span>
                                </div>
                            ) : isOwnerOffline ? (
                                <div className="p-6 text-center max-w-xs space-y-3">
                                    <div className="h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 mx-auto flex items-center justify-center">
                                        <AlertTriangle className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-sm font-bold text-white">Device Currently Inactive</h4>
                                    <p className="text-xs text-white/60 leading-relaxed">
                                        This status story is stored locally on <strong>@{targetUser?.username}</strong>'s device.
                                        It will become viewable once their app or background sync reconnects.
                                    </p>
                                </div>
                            ) : storyItems.length > 0 ? (
                                <div className="relative w-full h-full">
                                    <img
                                        src={storyItems[activeStoryIndex]?.dataUrl}
                                        alt=""
                                        draggable={false}
                                        className="w-full h-full object-cover pointer-events-none select-none"
                                    />
                                    {/* Tap zones for previous / next */}
                                    <div
                                        className="absolute top-0 bottom-0 left-0 w-1/3 cursor-pointer z-20"
                                        onClick={handlePrevSlide}
                                    />
                                    <div
                                        className="absolute top-0 bottom-0 right-0 w-2/3 cursor-pointer z-20"
                                        onClick={handleNextSlide}
                                    />
                                </div>
                            ) : (
                                <div className="text-center p-6 text-white/50 text-xs">
                                    No status story active right now.
                                </div>
                            )}
                        </div>

                        {/* Bottom Caption Overlay */}
                        {storyItems[activeStoryIndex]?.caption && (
                            <div className="absolute bottom-4 left-4 right-4 z-30 p-3.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 text-center">
                                <p className="text-xs font-semibold text-white leading-relaxed">
                                    {storyItems[activeStoryIndex].caption}
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </AnimatePresence>
    );
}

EphemeralStatusModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    mode: PropTypes.oneOf(["create", "view"]),
    targetUser: PropTypes.object,
    myUser: PropTypes.object,
    socket: PropTypes.object,
};
