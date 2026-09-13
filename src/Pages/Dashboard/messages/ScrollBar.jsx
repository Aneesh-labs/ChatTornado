import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";

const ScrollBar = React.memo(({ show, currentTheme = {}, scrollToBottom, isMobile = false }) => {
    const themeAccent = currentTheme?.accent || "from-violet-500 to-fuchsia-500";

    return (
        <AnimatePresence>
            {show && (
                <motion.button
                    type="button"
                    initial={{ opacity: 0, scale: 0.7, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.7, y: 10 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={scrollToBottom}
                    aria-label="Scroll to latest messages"
                    title="Scroll to bottom"
                    className={`
                        absolute right-3 sm:right-6
                        ${isMobile ? "bottom-4" : "bottom-20 sm:bottom-24"}
                        w-9 h-9 sm:w-10 sm:h-10
                        rounded-full bg-gradient-to-br ${themeAccent}
                        shadow-xl flex items-center justify-center z-10
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500
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

ScrollBar.propTypes = {
    show: PropTypes.bool.isRequired,
    currentTheme: PropTypes.object,
    scrollToBottom: PropTypes.func.isRequired,
    isMobile: PropTypes.bool,
};

ScrollBar.displayName = "ScrollBar";

export default ScrollBar;
