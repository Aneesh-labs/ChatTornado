import React, { useState } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, Download, QrCode, ShieldCheck, X, Sparkles, Check, ExternalLink } from "lucide-react";
import { soundEngine } from "../utils/soundEffects";

export const AndroidAppDownloadModal = ({ isOpen, onClose }) => {
    const [copied, setCopied] = useState(false);
    if (!isOpen) return null;

    const apkUrl = `${window.location.origin}/ChatTornado.apk`;
    const githubReleaseUrl = "https://github.com/Aneesh-labs/ChatTornado/releases/latest";

    const handleCopyLink = () => {
        navigator.clipboard.writeText(apkUrl);
        setCopied(true);
        soundEngine?.play?.("quantum_ping");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="relative w-full max-w-md rounded-3xl border border-cyan-500/30 bg-[#090d18] p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-white select-none"
                >
                    {/* Glowing Header Beam */}
                    <div className="pointer-events-none absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

                    {/* Close Button */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Modal Title */}
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-lg">
                            <Smartphone className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-white leading-tight">ChatTornado for Android</h3>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                    Native APK
                                </span>
                            </div>
                            <p className="text-xs text-white/50 mt-0.5">Strict Zero-Cloud P2P Messaging</p>
                        </div>
                    </div>

                    {/* QR Code Card (Scan with Phone) */}
                    <div className="mt-5 p-4 rounded-2xl bg-black/50 border border-white/10 flex items-center gap-4">
                        <div className="w-24 h-24 rounded-xl bg-white p-2 flex items-center justify-center shrink-0 shadow-md">
                            {/* Embedded clean SVG QR representation */}
                            <svg viewBox="0 0 100 100" className="w-full h-full fill-black">
                                <rect x="0" y="0" width="30" height="30" />
                                <rect x="5" y="5" width="20" height="20" fill="white" />
                                <rect x="10" y="10" width="10" height="10" />
                                <rect x="70" y="0" width="30" height="30" />
                                <rect x="75" y="5" width="20" height="20" fill="white" />
                                <rect x="80" y="10" width="10" height="10" />
                                <rect x="0" y="70" width="30" height="30" />
                                <rect x="5" y="75" width="20" height="20" fill="white" />
                                <rect x="10" y="80" width="10" height="10" />
                                <rect x="40" y="10" width="8" height="8" />
                                <rect x="52" y="10" width="8" height="8" />
                                <rect x="40" y="25" width="8" height="8" />
                                <rect x="40" y="40" width="20" height="20" />
                                <rect x="70" y="40" width="10" height="10" />
                                <rect x="85" y="40" width="10" height="10" />
                                <rect x="70" y="55" width="10" height="10" />
                                <rect x="85" y="70" width="15" height="15" />
                                <rect x="40" y="70" width="10" height="10" />
                                <rect x="55" y="80" width="10" height="10" />
                            </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                                <QrCode className="w-4 h-4 text-cyan-400" />
                                Scan with Camera
                            </p>
                            <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
                                Point your Android phone camera to download & install the APK instantly during live demos.
                            </p>
                        </div>
                    </div>

                    {/* Feature Bullets */}
                    <div className="mt-4 space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-white/70">
                            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>100% Peer-to-Peer direct file streaming (0 cloud storage)</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/70">
                            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                            <span>Hardware back button & immersive dark mobile UI</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 flex flex-col gap-2.5">
                        <a
                            href="/ChatTornado.apk"
                            download="ChatTornado.apk"
                            onClick={() => soundEngine?.play?.("quantum_ping")}
                            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-bold text-sm shadow-[0_0_24px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                        >
                            <Download className="w-4 h-4" />
                            <span>Download APK (9.8 MB)</span>
                        </a>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleCopyLink}
                                className="flex-1 py-2.5 px-3 rounded-xl border border-white/10 hover:bg-white/5 text-white/70 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ExternalLink className="w-3.5 h-3.5" />}
                                <span>{copied ? "Link Copied!" : "Copy APK Link"}</span>
                            </button>

                            <a
                                href={githubReleaseUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 py-2.5 px-3 rounded-xl border border-white/10 hover:bg-white/5 text-white/70 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors text-center"
                            >
                                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                                <span>GitHub Release</span>
                            </a>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

AndroidAppDownloadModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired
};

export default AndroidAppDownloadModal;
