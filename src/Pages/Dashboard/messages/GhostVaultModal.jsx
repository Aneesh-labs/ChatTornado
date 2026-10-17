import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Lock, Unlock, Eye, EyeOff, X } from "lucide-react";
import { unlockVault, lockVault, isVaultUnlocked, isDecoyMode } from "../../../Services/vaultService";

export default function GhostVaultModal({ isOpen, onClose, onVaultStateChange }) {
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    const [showPin, setShowPin] = useState(false);
    const unlocked = isVaultUnlocked();
    const decoy = isDecoyMode();

    if (!isOpen || typeof document === "undefined") return null;

    const handleUnlock = (e) => {
        e.preventDefault();
        setError("");
        const res = unlockVault(pin);
        if (res.success) {
            setPin("");
            onVaultStateChange?.(res.decoy ? "decoy" : "unlocked");
            onClose();
        } else {
            setError(res.error || "Invalid PIN");
        }
    };

    const handleTriggerDecoy = () => {
        lockVault();
        onVaultStateChange?.("decoy");
        onClose();
    };

    return createPortal(
        <AnimatePresence>
            <div 
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0c1017] p-6 shadow-2xl text-white select-none"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                            {unlocked ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Ghost Vault & Decoy</h3>
                            <p className="text-xs text-white/50">Zero-Trace Private Workspace</p>
                        </div>
                    </div>

                    <p className="text-xs text-white/60 leading-relaxed mb-5">
                        Enter your private PIN to reveal secret chats. Enter decoy PIN <code className="text-purple-300">0000</code> or tap Decoy Mode to show safe innocent dummy conversations.
                    </p>

                    <form onSubmit={handleUnlock} className="space-y-4">
                        <div className="relative">
                            <input
                                type={showPin ? "text" : "password"}
                                maxLength={6}
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                placeholder="Enter 4-digit Vault PIN"
                                autoFocus
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center tracking-[0.3em] font-mono text-xl text-white outline-none focus:border-purple-500/50"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPin(!showPin)}
                                className="absolute right-3 top-3.5 text-white/40 hover:text-white"
                            >
                                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        {error && <p className="text-xs text-red-400 text-center font-medium">{error}</p>}

                        <button
                            type="submit"
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-purple-500/20 hover:opacity-95 transition"
                        >
                            Unlock Secret Vault
                        </button>
                    </form>

                    <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                        <button
                            type="button"
                            onClick={handleTriggerDecoy}
                            className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-medium border border-white/10 transition"
                        >
                            🛡️ Switch to Decoy Mode
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
