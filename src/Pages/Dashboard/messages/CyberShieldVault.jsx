import React, { useState, useEffect, useRef } from 'react';
import { Shield, Lock, Unlock } from 'lucide-react';
import { playLaserScanSound } from '../../../Services/audioFx';

const CyberShieldVault = ({
    children,
    shieldMode,
    unlockAt,
    isLocked,
    messageId,
    token,
    onUnlocked
}) => {
    const [revealed, setRevealed] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    const [locallyLocked, setLocallyLocked] = useState(isLocked);

    // Sync prop changes
    useEffect(() => {
        setLocallyLocked(isLocked);
    }, [isLocked]);

    // Countdown logic for timelocked
    useEffect(() => {
        if (shieldMode !== 'timelock' || !unlockAt || !locallyLocked) return;

        const updateTimer = () => {
            const now = new Date();
            const target = new Date(unlockAt);
            const diff = target - now;

            if (diff <= 0) {
                setTimeLeft('00h 00m 00s');
                return;
            }

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(
                `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
            );
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [shieldMode, unlockAt, locallyLocked]);

    const handleReveal = async () => {
        if (shieldMode === 'timelock' && locallyLocked) return; // Cannot manually reveal locked capsule
        if (revealed || scanning) return;

        if (shieldMode === 'timelock' && onUnlocked) {
            try {
                const success = await onUnlocked();
                if (success === false) return; // If explicitly failed
            } catch (e) {
                return;
            }
        }

        playLaserScanSound();
        setScanning(true);
        setTimeout(() => {
            setScanning(false);
            setRevealed(true);
        }, 600); // 600ms laser animation
    };

    const handleReshield = (e) => {
        e.stopPropagation();
        setRevealed(false);
    };

    // Style variations based on mode
    const isTimelock = shieldMode === 'timelock';
    const themeColor = isTimelock ? 'violet' : 'cyan';
    const bgOpacity = revealed ? 'bg-transparent' : (isTimelock ? 'bg-violet-900/60' : 'bg-cyan-900/60');
    const borderColor = revealed ? 'border-transparent' : (isTimelock ? 'border-violet-500/50' : 'border-cyan-500/50');
    const backdropBlur = revealed ? 'backdrop-blur-none' : 'backdrop-blur-md';

    return (
        <div
            className={`relative rounded-xl overflow-hidden transition-all duration-500 border ${bgOpacity} ${borderColor} ${backdropBlur}`}
            onClick={!revealed ? handleReveal : undefined}
            style={{ minHeight: revealed ? 'auto' : '80px', minWidth: '150px' }}
        >
            {/* Holographic Mesh Background when shielded */}
            {!revealed && (
                <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                        backgroundImage: `linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px)`,
                        backgroundSize: '10px 10px'
                    }}
                />
            )}

            {/* Inner Content (hidden if locked or shielded) */}
            <div className={`transition-all duration-300 ${revealed ? 'opacity-100 scale-100' : 'opacity-0 scale-95 blur-md hidden'}`}>
                {children}
            </div>

            {/* Shield Front Face */}
            {!revealed && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-3 cursor-pointer group hover:bg-black/20 transition-colors">
                    {isTimelock ? (
                        <>
                            {locallyLocked ? (
                                <Lock size={24} className={`text-${themeColor}-400 mb-1 group-hover:scale-110 transition-transform`} />
                            ) : (
                                <Unlock size={24} className={`text-${themeColor}-400 mb-1 animate-bounce`} />
                            )}

                            {locallyLocked && timeLeft ? (
                                <span className={`text-xs font-mono font-bold text-${themeColor}-300 tracking-widest bg-black/40 px-2 py-1 rounded shadow-[0_0_10px_rgba(139,92,246,0.3)]`}>
                                    {timeLeft}
                                </span>
                            ) : (
                                <span className={`text-xs font-bold text-${themeColor}-300 tracking-wider uppercase`}>
                                    {locallyLocked ? 'Locked' : 'Capsule Ready'}
                                </span>
                            )}
                        </>
                    ) : (
                        <>
                            <Shield size={28} className={`text-${themeColor}-400 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] transition-all`} />
                            <span className="text-[10px] uppercase tracking-[0.2em] mt-2 font-semibold text-cyan-300/80">Tap to Scan</span>
                        </>
                    )}
                </div>
            )}

            {/* Re-shield Button */}
            {revealed && (
                <button
                    onClick={handleReshield}
                    className={`absolute top-1 right-1 p-1.5 rounded-full bg-gray-900/80 hover:bg-black text-${themeColor}-400 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center group/btn shadow-lg backdrop-blur`}
                    style={{ opacity: 1 }} // Ensure it's somewhat visible or purely on hover parent? We will rely on CSS group-hover in parent if we added it, but let's just make it visible
                >
                    <Shield size={14} />
                </button>
            )}

            {/* Laser Scanning Animation Element */}
            {scanning && (
                <div
                    className={`absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-xl`}
                >
                    <div
                        className={`absolute top-0 bottom-0 w-2 bg-${themeColor}-400 shadow-[0_0_20px_4px_rgba(6,182,212,0.8)] animate-[laserSweep_0.6s_ease-in-out_forwards]`}
                        style={{
                            boxShadow: `0 0 20px 4px ${isTimelock ? 'rgba(139,92,246,0.8)' : 'rgba(6,182,212,0.8)'}`
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default CyberShieldVault;
