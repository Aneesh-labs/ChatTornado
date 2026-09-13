import React, { useState, useEffect } from 'react';
import { Shield, Clock, Eye, X } from 'lucide-react';
import { playShieldActivateSound } from '../../../Services/audioFx';

const CyberShieldModal = ({ isOpen, onClose, onApply }) => {
    const [mode, setMode] = useState('scan'); // 'scan' | 'timelock'
    const [unlockTime, setUnlockTime] = useState('');
    const [customDate, setCustomDate] = useState('');
    const [customTime, setCustomTime] = useState('');

    useEffect(() => {
        if (isOpen) {
            setMode('scan');
            setUnlockTime('');
            setCustomDate('');
            setCustomTime('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleApply = () => {
        playShieldActivateSound();
        if (mode === 'scan') {
            onApply({ is_shielded: true, shield_mode: 'scan', unlock_at: null });
        } else {
            let unlockAt = null;
            const now = new Date();

            if (unlockTime === '15m') unlockAt = new Date(now.getTime() + 15 * 60000);
            else if (unlockTime === '1h') unlockAt = new Date(now.getTime() + 60 * 60000);
            else if (unlockTime === '6h') unlockAt = new Date(now.getTime() + 6 * 60 * 60000);
            else if (unlockTime === 'tonight') {
                unlockAt = new Date();
                unlockAt.setHours(20, 0, 0, 0);
                if (unlockAt <= now) unlockAt.setDate(unlockAt.getDate() + 1);
            }
            else if (unlockTime === 'tomorrow') {
                unlockAt = new Date();
                unlockAt.setDate(unlockAt.getDate() + 1);
                unlockAt.setHours(9, 0, 0, 0);
            } else if (unlockTime === 'custom' && customDate && customTime) {
                unlockAt = new Date(`${customDate}T${customTime}`);
            }

            if (!unlockAt || isNaN(unlockAt.getTime())) {
                alert("Please select a valid unlock time.");
                return;
            }

            onApply({ is_shielded: true, shield_mode: 'timelock', unlock_at: unlockAt.toISOString() });
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-cyan-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.15)] animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50">
                    <div className="flex items-center gap-2 text-cyan-400">
                        <Shield size={20} className="drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                        <h2 className="font-bold tracking-wide uppercase text-sm">Cyber Shield Configuration</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-6">
                    {/* Mode Selector */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setMode('scan')}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${mode === 'scan'
                                    ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]'
                                    : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-800'
                                }`}
                        >
                            <Eye size={24} className="mb-2" />
                            <span className="font-medium">Laser Reveal</span>
                            <span className="text-[10px] opacity-70 mt-1">Tap to decrypt</span>
                        </button>

                        <button
                            onClick={() => setMode('timelock')}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${mode === 'timelock'
                                    ? 'bg-violet-500/10 border-violet-500 text-violet-400 shadow-[inset_0_0_20px_rgba(139,92,246,0.1)]'
                                    : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-800'
                                }`}
                        >
                            <Clock size={24} className="mb-2" />
                            <span className="font-medium">Timelocked Capsule</span>
                            <span className="text-[10px] opacity-70 mt-1">Server-enforced secrecy</span>
                        </button>
                    </div>

                    {/* Timelock Options */}
                    {mode === 'timelock' && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-200">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Unlock Preset</h3>
                            <div className="flex flex-wrap gap-2">
                                {['15m', '1h', '6h', 'tonight', 'tomorrow', 'custom'].map((preset) => (
                                    <button
                                        key={preset}
                                        onClick={() => setUnlockTime(preset)}
                                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors border ${unlockTime === preset
                                                ? 'bg-violet-500/20 border-violet-500 text-violet-300'
                                                : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                                            }`}
                                    >
                                        {preset === '15m' && '15 Mins'}
                                        {preset === '1h' && '1 Hour'}
                                        {preset === '6h' && '6 Hours'}
                                        {preset === 'tonight' && 'Tonight 8 PM'}
                                        {preset === 'tomorrow' && 'Tomorrow 9 AM'}
                                        {preset === 'custom' && 'Custom...'}
                                    </button>
                                ))}
                            </div>

                            {unlockTime === 'custom' && (
                                <div className="grid grid-cols-2 gap-3 mt-4 animate-in fade-in">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Date</label>
                                        <input
                                            type="date"
                                            value={customDate}
                                            onChange={(e) => setCustomDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Time</label>
                                        <input
                                            type="time"
                                            value={customTime}
                                            onChange={(e) => setCustomTime(e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-800 flex justify-end gap-3 bg-gray-900/80">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={mode === 'timelock' && !unlockTime}
                        className={`px-5 py-2 rounded-lg text-sm font-bold shadow-lg transition-all ${mode === 'timelock'
                                ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed'
                                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-500/25'
                            }`}
                    >
                        Activate Shield
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CyberShieldModal;

