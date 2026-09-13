import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Reusable Premium Controls ---

const PremiumSwitch = memo(({ checked, onChange }) => (
    <motion.button
        layout
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${checked ? 'bg-blue-500' : 'bg-white/10'
            }`}
    >
        <motion.span
            layout
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'
                }`}
        />
    </motion.button>
));

const GlowingSlider = memo(({ value, min, max, onChange, unit = '' }) => (
    <div className="relative flex w-full items-center group">
        <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute z-20 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
                layout
                className="absolute top-0 left-0 h-full bg-blue-500 group-hover:bg-blue-400 transition-colors shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                style={{ width: `${((value - min) / (max - min)) * 100}%` }}
            />
        </div>
        <span className="ml-4 text-xs text-white/50 w-8 text-right font-mono">
            {value}{unit}
        </span>
    </div>
));

const ColorCircle = memo(({ color, selected, onClick }) => (
    <button
        onClick={onClick}
        className={`relative h-8 w-8 rounded-full transition-transform hover:scale-110 ${selected ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent' : ''
            }`}
        style={{ backgroundColor: color }}
    />
));

const VisualBgCard = memo(({ name, gradient, selected, onClick }) => (
    <button
        onClick={onClick}
        className={`relative h-24 w-full rounded-xl overflow-hidden group transition-all duration-300 ${selected ? 'ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'ring-1 ring-white/10 hover:ring-white/30'
            }`}
    >
        <div className={`absolute inset-0 ${gradient} opacity-80 group-hover:opacity-100 transition-opacity`} />
        <div className="absolute bottom-2 left-2 text-xs font-medium text-white drop-shadow-md">
            {name}
        </div>
        {selected && (
            <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
            </div>
        )}
    </button>
));

const Accordion = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border border-white/5 rounded-xl bg-white/5 overflow-hidden backdrop-blur-md">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-white hover:bg-white/5 transition-colors"
            >
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                    {title}
                </span>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="text-white/50">
                    ▼
                </motion.span>
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        <div className="p-4 border-t border-white/5 space-y-4">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Main Studio Panel ---

export default function SettingsStudio({ isOpen, onClose, settings, updateSetting, resetDefaults }) {
    const backgrounds = [
        { name: 'Aurora', gradient: 'bg-gradient-to-br from-green-400 to-blue-500' },
        { name: 'Galaxy', gradient: 'bg-gradient-to-br from-purple-600 to-blue-900' },
        { name: 'Ocean', gradient: 'bg-gradient-to-br from-cyan-500 to-blue-600' },
        { name: 'Matrix', gradient: 'bg-gradient-to-br from-black to-green-900' },
        { name: 'Minimal', gradient: 'bg-zinc-900' },
        { name: 'Gradient', gradient: 'bg-gradient-to-tr from-rose-400 to-orange-300' },
    ];

    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#ffffff'];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, x: '100%', scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: '100%', scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-2 right-2 bottom-2 w-[420px] z-50 flex flex-col rounded-3xl bg-black/40 backdrop-blur-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/[0.02]">
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-wide">Experience Studio</h2>
                                <p className="text-xs text-white/50 mt-1">Live interface customization</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6 custom-scrollbar">

                            {/* Appearance */}
                            <section className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">Appearance</h3>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-white/80">Theme</span>
                                    <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                                        {['Dark', 'Light', 'System'].map(t => (
                                            <button
                                                key={t}
                                                onClick={() => updateSetting('theme', t)}
                                                className={`px-3 py-1 text-xs rounded-md transition-all ${settings.theme === t ? 'bg-white/20 text-white shadow-sm' : 'text-white/50 hover:text-white'
                                                    }`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-sm text-white/80">Accent Color</span>
                                    <div className="flex gap-3">
                                        {colors.map(c => (
                                            <ColorCircle key={c} color={c} selected={settings.accentColor === c} onClick={() => updateSetting('accentColor', c)} />
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center"><span className="text-sm text-white/80">Glass Intensity</span></div>
                                    <GlowingSlider min={0} max={100} value={settings.glassIntensity} onChange={(v) => updateSetting('glassIntensity', v)} unit="%" />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center"><span className="text-sm text-white/80">Blur Strength</span></div>
                                    <GlowingSlider min={0} max={50} value={settings.blurStrength} onChange={(v) => updateSetting('blurStrength', v)} unit="px" />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center"><span className="text-sm text-white/80">Bubble Roundness</span></div>
                                    <GlowingSlider min={0} max={32} value={settings.bubbleRoundness} onChange={(v) => updateSetting('bubbleRoundness', v)} unit="px" />
                                </div>
                            </section>

                            {/* Background */}
                            <section className="space-y-4 pt-4 border-t border-white/10">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">Environment</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {backgrounds.map(bg => (
                                        <VisualBgCard
                                            key={bg.name}
                                            name={bg.name}
                                            gradient={bg.gradient}
                                            selected={settings.background === bg.name}
                                            onClick={() => updateSetting('background', bg.name)}
                                        />
                                    ))}
                                </div>
                            </section>

                            {/* Chat Toggles */}
                            <section className="space-y-4 pt-4 border-t border-white/10">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">Chat Elements</h3>
                                {[
                                    { id: 'showTimestamps', label: 'Show Timestamps' },
                                    { id: 'showAvatars', label: 'Show Avatars' },
                                    { id: 'showOnline', label: 'Online Indicators' },
                                    { id: 'typingIndicator', label: 'Typing Indicators' },
                                    { id: 'readReceipts', label: 'Read Receipts' },
                                    { id: 'compactMode', label: 'Compact Mode' },
                                ].map(item => (
                                    <div key={item.id} className="flex items-center justify-between">
                                        <span className="text-sm text-white/80">{item.label}</span>
                                        <PremiumSwitch checked={settings[item.id]} onChange={(v) => updateSetting(item.id, v)} />
                                    </div>
                                ))}
                            </section>

                            {/* Layout */}
                            <section className="space-y-4 pt-4 border-t border-white/10">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">Geometry</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center"><span className="text-sm text-white/80">Sidebar Width</span></div>
                                    <GlowingSlider min={200} max={400} value={settings.leftSidebarWidth} onChange={(v) => updateSetting('leftSidebarWidth', v)} unit="px" />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center"><span className="text-sm text-white/80">Font Size</span></div>
                                    <GlowingSlider min={12} max={20} value={settings.fontSize} onChange={(v) => updateSetting('fontSize', v)} unit="px" />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center"><span className="text-sm text-white/80">Bubble Width Limit</span></div>
                                    <GlowingSlider min={40} max={90} value={settings.bubbleWidth} onChange={(v) => updateSetting('bubbleWidth', v)} unit="%" />
                                </div>
                            </section>

                            {/* Experimental */}
                            <section className="pt-4 pb-8">
                                <Accordion title="🧪 Experimental Features">
                                    {[
                                        { id: 'neonMode', label: 'Neon Glow Mode' },
                                        { id: 'glassUltra', label: 'Ultra Glass Dispersion' },
                                        { id: 'rainbowCursor', label: 'RGB Rainbow Cursor' },
                                        { id: 'floatingParticles', label: 'Ambient Particles' },
                                        { id: 'liquidHover', label: 'Liquid Hover Dynamics' },
                                    ].map(item => (
                                        <div key={item.id} className="flex items-center justify-between">
                                            <span className="text-sm text-amber-500/90 drop-shadow-md">{item.label}</span>
                                            <PremiumSwitch checked={settings[item.id]} onChange={(v) => updateSetting(item.id, v)} />
                                        </div>
                                    ))}
                                </Accordion>
                            </section>

                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-xl flex gap-3">
                            <button
                                onClick={resetDefaults}
                                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors border border-white/10"
                            >
                                Reset
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                            >
                                Done
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}