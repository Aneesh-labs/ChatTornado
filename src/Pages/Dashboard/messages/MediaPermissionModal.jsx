import React from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Video, ShieldCheck, X } from "lucide-react";

/**
 * MediaPermissionModal
 * Prompts user for camera/microphone consent before initiating or answering high-definition calls.
 */
export default function MediaPermissionModal({
    isOpen,
    onClose,
    onGrant,
    isVideo = false,
}) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-neutral-900/95 p-6 shadow-2xl backdrop-blur-2xl text-white"
                >
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                            {isVideo ? <Video className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">
                                {isVideo ? "Camera & Microphone Access" : "Microphone Access Required"}
                            </h3>
                            <p className="text-xs text-white/60">
                                End-to-end encrypted {isVideo ? "video" : "audio"} call
                            </p>
                        </div>
                    </div>

                    <p className="text-xs text-white/80 leading-relaxed mb-4">
                        ChatTornado streams high-fidelity 48kHz Opus audio and adaptive HD video peer-to-peer.
                        Please grant browser permission to activate your {isVideo ? "camera and microphone" : "microphone"}.
                    </p>

                    <div className="rounded-xl bg-white/5 border border-white/10 p-3 mb-6 space-y-2 text-[11px] text-white/70">
                        <div className="flex items-center gap-2 text-emerald-400">
                            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                            <span>100% Peer-to-peer encrypted signaling</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>🔒 Zero audio or video frames are stored on the server</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onGrant}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white font-bold text-sm py-2.5 px-4 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                        >
                            <span>Grant & Connect</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl bg-white/10 hover:bg-white/15 text-white/70 active:scale-95 font-medium text-sm py-2.5 px-4 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

MediaPermissionModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onGrant: PropTypes.func.isRequired,
    isVideo: PropTypes.bool,
};
