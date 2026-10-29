import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";

const ScrollBar = React.memo(({ show, currentTheme = {}, scrollToBottom, isMobile = false }) => {
    const themeAccent = currentTheme?.accent || "from-sky-500 to-indigo-600";

    return (
        <AnimatePresence>
            {show && (
                <motion.button
                    type="button"
                    initial={{ opacity: 0, scale: 0.7, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.7, y: 10 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        scrollToBottom?.();
                    }}
                    aria-label="Scroll to latest messages"
                    title="Scroll to bottom"
                    className={`
                        absolute right-3.5 sm:right-6
                        bottom-20 sm:bottom-24
                        w-9 h-9 sm:w-10 sm:h-10
                        rounded-full bg-gradient-to-br ${themeAccent}
                        shadow-2xl border border-white/20
                        flex items-center justify-center z-30 pointer-events-auto
                        focus:outline-none focus:ring-2 focus:ring-sky-400
                        touch-manipulation select-none active:scale-90 transition-transform
                    `}
                >
                    <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                    </svg>
                </motion.button>
            )}
        </AnimatePresence>
    );
});

ScrollBar.displayName = "ScrollBar";

ScrollBar.propTypes = {
    show: PropTypes.bool.isRequired,
    currentTheme: PropTypes.object,
    scrollToBottom: PropTypes.func.isRequired,
    isMobile: PropTypes.bool,
};

export default ScrollBar;
