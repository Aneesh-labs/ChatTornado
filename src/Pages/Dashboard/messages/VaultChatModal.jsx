import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock, Eye, EyeOff, X, Shield, ShieldAlert, CheckCircle2 } from "lucide-react";
import { toggleVaultChat, isVaultChat } from "../../../Services/vaultService";
import { soundEngine } from "../../../utils/soundEffects";

export default function VaultChatModal({ isOpen, onClose, user, onStatusChanged, isFriend = true }) {
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    const [successNotice, setSuccessNotice] = useState("");
    const [showPin, setShowPin] = useState(false);

    if (!isOpen || !user || typeof document === "undefined") return null;

    const isProtected = isVaultChat(user.id);
    const username = user.name || user.username || "User";
    const canLock = isProtected || isFriend;

    const handleSubmit = (e) => {
        e.preventDefault();
        setError("");
        setSuccessNotice("");

        if (!canLock) {
            setError(`Only accepted friends can be locked into the Ghost Vault. Connect with @${username} first.`);
            return;
        }

        if (!pin.trim()) {
            setError("Please enter your 4-digit Vault PIN.");
            return;
        }

        const res = toggleVaultChat(user.id, pin);
        if (res.success) {
            setPin("");
            soundEngine.play(res.isVault ? "quantum_ping" : "coin");
            const notice = res.isVault
                ? `🔒 @${username} is now locked in Ghost Vault. Visible in Normal Mode, 100% hidden in Decoy Mode.`
                : `🔓 @${username} removed from Ghost Vault.`;
            setSuccessNotice(notice);
            onStatusChanged?.(res.isVault);
            setTimeout(() => {
                onClose();
                setSuccessNotice("");
            }, 1200);
        } else {
            setError(res.error || "Incorrect Secret Vault PIN");
            soundEngine.play("laser");
        }
    };

    return createPortal(
        <AnimatePresence>
            <div
                className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.93, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.93, y: 10 }}
                    className="relative w-full max-w-sm max-h-[88dvh] overflow-y-auto overflow-x-hidden custom-scrollbar rounded-2xl border border-purple-500/30 bg-[#0b0e17]/95 p-5 sm:p-6 shadow-2xl text-white select-none"
                >
                    {/* Top ambient holographic beam */}
                    <div className="pointer-events-none absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-75" />

                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-3 rounded-xl border ${
                            isProtected 
                                ? "bg-purple-500/20 border-purple-400/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.4)]" 
                                : "bg-white/5 border-white/10 text-white/70"
                        }`}>
                            {isProtected ? <Lock className="w-6 h-6 animate-pulse" /> : <Shield className="w-6 h-6" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-white">Ghost Vault Chat Lock</h3>
                            <p className="text-[11px] text-purple-300/80">Decoy Mode Concealment</p>
                        </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8 mb-4">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-white/60">Target Chat:</span>
                            <span className="font-bold text-white">@{username}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-white/60">Connection:</span>
                            <span className={`text-[11px] font-semibold ${isFriend ? "text-emerald-400" : "text-amber-400"}`}>
                                {isFriend ? "Accepted Friend ✅" : "Not Connected"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-white/60">Vault Status:</span>
                            <span className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded-full ${
                                isProtected 
                                    ? "bg-purple-500/25 border border-purple-400/40 text-purple-200" 
                                    : "bg-white/10 text-white/50"
                            }`}>
                                {isProtected ? "🔒 LOCKED IN VAULT" : "NORMAL (VISIBLE)"}
                            </span>
                        </div>
                    </div>

                    {!canLock ? (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-medium flex items-center gap-2 mb-4">
                            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                            <span>Only accepted friends can be locked into the Ghost Vault. Connect with @{username} in the Global tab first.</span>
                        </div>
                    ) : (
                        <p className="text-xs text-white/65 leading-relaxed mb-4">
                            {isProtected
                                ? `Enter your 4-digit Vault PIN to UNLOCK @${username} back to a standard visible chat.`
                                : `Enter your 4-digit Vault PIN to LOCK @${username}. This chat will be visible in Normal Mode, and 100% invisible with zero trace in Decoy Mode.`}
                        </p>
                    )}

                    {successNotice ? (
                        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 mb-2 animate-in fade-in">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>{successNotice}</span>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="relative">
                                <input
                                    type={showPin ? "text" : "password"}
                                    maxLength={6}
                                    value={pin}
                                    disabled={!canLock}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                                    placeholder={canLock ? "Enter 4-digit PIN" : "Friend required"}
                                    autoFocus={canLock}
                                    className={`w-full bg-black/50 border border-white/15 focus:border-purple-400 rounded-xl px-4 py-2.5 text-center tracking-[0.3em] font-mono text-xl text-white outline-none shadow-inner ${
                                        !canLock ? "opacity-40 cursor-not-allowed" : ""
                                    }`}
                                />
                                {canLock && (
                                    <button
                                        type="button"
                                        onClick={() => setShowPin(!showPin)}
                                        className="absolute right-3 top-3 text-white/40 hover:text-white"
                                    >
                                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>

                            {error && <p className="text-xs text-red-400 text-center font-medium">{error}</p>}

                            <button
                                type="submit"
                                disabled={!canLock}
                                className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg active:scale-98 ${
                                    !canLock 
                                        ? "bg-white/10 text-white/30 cursor-not-allowed border border-white/10"
                                        : isProtected
                                            ? "bg-gradient-to-r from-neutral-700 to-neutral-800 text-white hover:from-neutral-600 hover:to-neutral-700 border border-white/20 cursor-pointer"
                                            : "bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-white hover:shadow-purple-500/25 border border-purple-400/40 cursor-pointer"
                                }`}
                            >
                                {!canLock
                                    ? "Friend Required to Lock"
                                    : isProtected 
                                        ? "Remove from Ghost Vault" 
                                        : "Lock Chat in Ghost Vault"}
                            </button>
                        </form>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
