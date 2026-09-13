import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { Avatar, TypingBubble } from "./constants";

const TypingIndicator = React.memo(({ user }) => {
    return (
        <AnimatePresence>
            {user && user.username ? (
                <motion.div
                    key="typing-indicator"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="flex items-center gap-1.5 px-3 sm:px-4 pb-2 select-none touch-manipulation"
                    role="status"
                    aria-live="polite"
                >
                    {/* Accessible helper for screen readers */}
                    <span className="sr-only">{user.username} is typing...</span>

                    <div className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 flex items-center justify-center" aria-hidden="true">
                        <Avatar
                            user={user}
                            size="xs"
                            showStatus={false}
                        />
                    </div>

                    <TypingBubble aria-hidden="true" />
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
});

TypingIndicator.propTypes = {
    user: PropTypes.shape({
        username: PropTypes.string,
        avatar_url: PropTypes.string,
    }),
};

TypingIndicator.displayName = "TypingIndicator";

export default TypingIndicator;