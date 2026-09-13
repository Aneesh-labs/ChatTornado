import React from "react";
import { motion } from "framer-motion";
import PropTypes from "prop-types";
import { useTheme } from "./constants";

const EmptyState = ({ onOpenSearch }) => {
    const theme = useTheme();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08, delayChildren: 0.05 },
        },
    };

    const itemVariants = {
        hidden: { scale: 0.92, y: 12, opacity: 0 },
        visible: {
            scale: 1,
            y: 0,
            opacity: 1,
            transition: { type: "spring", stiffness: 350, damping: 26 },
        },
    };

    const isMac = typeof window !== "undefined" && window.navigator?.platform?.toLowerCase().includes("mac");

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex-1 flex flex-col items-center justify-center h-full p-6 sm:p-8 overflow-hidden relative select-none text-center min-h-0"
        >
            <motion.div
                variants={itemVariants}
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-[24px] sm:rounded-[28px] bg-gradient-to-br ${theme.accent || "from-indigo-500 to-violet-600"} flex items-center justify-center shadow-2xl relative mb-6 sm:mb-8 flex-shrink-0`}
            >
                <div className="absolute inset-0 rounded-[24px] sm:rounded-[28px] bg-inherit opacity-40 blur-xl" />
                <svg
                    className="w-9 h-9 sm:w-10 sm:h-10 text-white relative z-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                </svg>
            </motion.div>

            <motion.div variants={itemVariants} className="max-w-xs sm:max-w-sm space-y-2 mb-6 sm:mb-8">
                <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white/90">
                    No Conversation Selected
                </h2>
                <p className="text-xs sm:text-sm text-white/40 leading-relaxed font-medium px-2">
                    Pick someone from the list or search to start chatting.
                </p>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-3">
                {onOpenSearch && (
                    <button
                        type="button"
                        onClick={onOpenSearch}
                        className={`px-5 py-2.5 rounded-xl bg-gradient-to-r ${theme.accent || "from-violet-500 to-indigo-500"} text-sm font-semibold text-white shadow-lg active:scale-95 transition-transform touch-manipulation`}
                    >
                        Search People
                    </button>
                )}

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.05] text-[10px] sm:text-[11px] text-white/20 font-semibold uppercase tracking-wider">
                    <span className="hidden sm:inline">Press</span>
                    <kbd className="px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-white/40 font-mono text-[9px] normal-case">
                        {isMac ? "⌘" : "Ctrl"}
                    </kbd>
                    <span>+</span>
                    <kbd className="px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-white/40 font-mono text-[9px] normal-case">
                        K
                    </kbd>
                </div>
            </motion.div>
        </motion.div>
    );
};

EmptyState.propTypes = {
    onOpenSearch: PropTypes.func,
};

EmptyState.displayName = "EmptyState";

export default EmptyState;
