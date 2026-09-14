import React, { useState } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { soundEngine, SOUND_EFFECTS_LIST } from "../../../utils/soundEffects";
import { Volume2, Send, X, Sparkles } from "lucide-react";

export default function SoundboardModal({ isOpen, onClose, onSendSound, recipientName = "Friend" }) {
    const [activeSoundId, setActiveSoundId] = useState(null);

    if (!isOpen) return null;

    const handlePlay = (sound) => {
        setActiveSoundId(sound.id);
        soundEngine.play(sound.id);
        setTimeout(() => {
            setActiveSoundId((prev) => (prev === sound.id ? null : prev));
        }, 600);
    };

    const handleSend = (sound) => {
        handlePlay(sound);
        if (onSendSound) {
            onSendSound(sound);
            onClose?.();
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-[#16122a] to-[#0b0914] p-6 shadow-2xl"
                    style={{ boxShadow: "0 0 50px rgba(168,85,247,0.25)" }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 shadow-lg text-white">
                                <Volume2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                                    Kids Soundboard <Sparkles className="h-4 w-4 text-amber-300" />
                                </h3>
                                <p className="text-[11px] text-white/50">Tap to play, or send funny sounds to {recipientName}!</p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full p-2 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Sound Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[58vh] overflow-y-auto pr-1 custom-scrollbar">
                        {SOUND_EFFECTS_LIST.map((sound) => {
                            const isPlaying = activeSoundId === sound.id;

                            return (
                                <motion.div
                                    key={sound.id}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.96 }}
                                    className={`relative flex flex-col justify-between rounded-2xl border p-3 transition-all ${
                                        isPlaying
                                            ? "border-amber-400 bg-amber-400/20 shadow-[0_0_20px_rgba(251,191,36,0.3)] ring-1 ring-amber-300"
                                            : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.08]"
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => handlePlay(sound)}
                                        className="text-left w-full focus:outline-none"
                                    >
                                        <div className="text-2xl mb-1 flex items-center justify-between">
                                            <span>{sound.emoji}</span>
                                            {isPlaying && (
                                                <motion.span
                                                    animate={{ scale: [1, 1.4, 1] }}
                                                    transition={{ repeat: Infinity, duration: 0.4 }}
                                                    className="text-xs text-amber-300"
                                                >
                                                    🔊
                                                </motion.span>
                                            )}
                                        </div>
                                        <div className="font-bold text-xs text-white truncate">{sound.name}</div>
                                        <div className="text-[10px] text-white/40 truncate">{sound.desc}</div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSend(sound)}
                                        className="mt-2.5 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl bg-violet-600/60 hover:bg-violet-600 text-violet-100 hover:text-white text-[10px] font-bold transition-all active:scale-95 border border-violet-400/30"
                                    >
                                        <Send className="h-3 w-3" />
                                        Send
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/40">
                        <span>✨ Real-time stereo sounds</span>
                        <span className="text-violet-300 font-semibold">100% Kid Safe 🎈</span>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

SoundboardModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSendSound: PropTypes.func,
    recipientName: PropTypes.string,
};
