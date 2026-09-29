import React from "react";
import { motion } from "framer-motion";
import PropTypes from "prop-types";
import { BadgeCheck } from "lucide-react";
import { Avatar, useTheme } from "./constants";

const UserProfilePanel = React.memo(({ user }) => {
    const theme = useTheme();

    if (!user || !user.username) {
        return null;
    }

    const isOnline = user.status === "online";

    return (
        <div
            className={`flex flex-col items-center gap-2 px-4 sm:px-6 pt-6 sm:pt-8 pb-4 sm:pb-5 border-b select-none ${theme?.border || "border-white/10"}`}
        >
            {/* User Avatar Representation */}
            <Avatar user={user} size="xl" />

            {/* User Information Summary Card */}
            <div className="text-center mt-1">
                <h3 className="text-sm font-semibold text-white flex items-center justify-center gap-1.5">
                    <span>{user.username}</span>
                    {(Boolean(user?.is_verified) || Boolean(user?.email_verified)) && (
                        <span title="Verified User" className="inline-flex items-center text-sky-400">
                            <BadgeCheck className="h-4 w-4 fill-sky-400/20 text-sky-400" />
                        </span>
                    )}
                </h3>

                <p
                    aria-live="polite"
                    className={`text-xs mt-0.5 font-medium ${isOnline ? "text-emerald-400" : "text-white/25"
                        }`}
                >
                    {isOnline ? "Active now" : "Offline"}
                </p>
                {user.custom_status && (
                    <p className="text-[11px] text-white/50 mt-1 italic max-w-xs truncate">
                        "{user.custom_status}"
                    </p>
                )}
            </div>

            {/* Primary Interaction Controls */}
            <div className="flex gap-2 mt-1.5 w-full sm:w-auto px-2 sm:px-0">
                <motion.button
                    type="button"
                    whileHover={window.innerWidth >= 640 ? { scale: 1.05 } : {}}
                    whileTap={{ scale: 0.95 }}
                    aria-label={`Start a call with ${user.username}`}
                    className={`flex-1 sm:flex-initial text-center px-4 py-2 sm:py-1.5 rounded-lg text-xs font-medium text-white bg-gradient-to-r ${theme?.accent || "from-violet-500 to-indigo-500"} shadow focus:outline-none focus:ring-2 focus:ring-violet-500/50 touch-manipulation`}
                >
                    Call
                </motion.button>

                <motion.button
                    type="button"
                    whileHover={window.innerWidth >= 640 ? { scale: 1.05 } : {}}
                    whileTap={{ scale: 0.95 }}
                    aria-label={`View full profile details for ${user.username}`}
                    className={`flex-1 sm:flex-initial text-center px-4 py-2 sm:py-1.5 rounded-lg text-xs font-medium text-white/60 ${theme?.glass || "bg-white/[0.03]"} border ${theme?.border || "border-white/10"} focus:outline-none focus:ring-2 focus:ring-white/20 touch-manipulation`}
                >
                    Profile
                </motion.button>
            </div>
        </div>
    );
});

UserProfilePanel.propTypes = {
    user: PropTypes.shape({
        username: PropTypes.string.isRequired,
        status: PropTypes.string,
        avatar_url: PropTypes.string,
    }),
};

UserProfilePanel.displayName = "UserProfilePanel";

export default UserProfilePanel;