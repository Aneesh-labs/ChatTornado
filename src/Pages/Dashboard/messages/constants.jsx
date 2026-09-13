import React, { createContext, useContext } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";

export const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

export const THEMES = {
    dark: {
        name: "Dark",
        bg: "from-[#0d0d0f] via-[#111114] to-[#0d0d0f]",
        sidebar: "bg-[#111114]/90",
        chat: "bg-[#0d0d0f]/60",
        glass: "bg-white/[0.025] border-white/[0.06]",
        glassHover: "hover:bg-white/[0.04] hover:border-white/[0.1]",
        accent: "from-violet-500 to-indigo-500",
        accentSolid: "bg-violet-500",
        accentText: "text-violet-400",
        text: "text-white",
        subtext: "text-white/40",
        border: "border-white/[0.06]",
        input: "bg-white/[0.03] border-white/[0.07]",
        bubble: {
            me: "bg-gradient-to-br from-violet-600/60 to-indigo-600/40 border-violet-500/20",
            them: "bg-white/[0.04] border-white/[0.07]",
        },
    },
    amoled: {
        name: "AMOLED",
        bg: "from-black via-black to-black",
        sidebar: "bg-black/95",
        chat: "bg-black/80",
        glass: "bg-white/[0.015] border-white/[0.05]",
        glassHover: "hover:bg-white/[0.03] hover:border-white/[0.08]",
        accent: "from-cyan-400 to-sky-500",
        accentSolid: "bg-cyan-400",
        accentText: "text-cyan-400",
        text: "text-white",
        subtext: "text-white/30",
        border: "border-white/[0.05]",
        input: "bg-white/[0.02] border-white/[0.05]",
        bubble: {
            me: "bg-gradient-to-br from-cyan-500/40 to-sky-600/30 border-cyan-500/20",
            them: "bg-white/[0.03] border-white/[0.05]",
        },
    },
    aurora: {
        name: "Aurora",
        bg: "from-[#080c1a] via-[#0d1225] to-[#080c1a]",
        sidebar: "bg-[#080c1a]/90",
        chat: "bg-[#080c1a]/60",
        glass: "bg-violet-500/[0.04] border-violet-400/[0.08]",
        glassHover: "hover:bg-violet-500/[0.07] hover:border-violet-400/[0.15]",
        accent: "from-fuchsia-500 to-violet-500",
        accentSolid: "bg-fuchsia-500",
        accentText: "text-fuchsia-400",
        text: "text-white",
        subtext: "text-violet-200/40",
        border: "border-violet-400/[0.08]",
        input: "bg-violet-500/[0.04] border-violet-400/[0.08]",
        bubble: {
            me: "bg-gradient-to-br from-fuchsia-600/50 to-violet-600/40 border-fuchsia-500/20",
            them: "bg-violet-500/[0.06] border-violet-400/[0.1]",
        },
    },
    cyberpunk: {
        name: "Cyberpunk",
        bg: "from-[#05000f] via-[#08000f] to-[#05000f]",
        sidebar: "bg-[#05000f]/90",
        chat: "bg-[#05000f]/60",
        glass: "bg-yellow-400/[0.02] border-yellow-400/[0.1]",
        glassHover: "hover:bg-yellow-400/[0.04] hover:border-yellow-400/[0.2]",
        accent: "from-yellow-400 to-orange-500",
        accentSolid: "bg-yellow-400",
        accentText: "text-yellow-400",
        text: "text-white",
        subtext: "text-yellow-200/30",
        border: "border-yellow-400/[0.1]",
        input: "bg-yellow-400/[0.02] border-yellow-400/[0.08]",
        bubble: {
            me: "bg-gradient-to-br from-yellow-500/40 to-orange-600/30 border-yellow-400/20",
            them: "bg-yellow-400/[0.03] border-yellow-400/[0.08]",
        },
    },
};

export const WALLPAPERS = {
    none: { name: "None", style: {} },
    aurora: {
        name: "Aurora",
        component: React.memo(() => (
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <motion.div
                    className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full opacity-10"
                    style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)" }}
                    animate={{ x: [0, 50, 0], y: [0, 25, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                    className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full opacity-10"
                    style={{ background: "radial-gradient(circle, #4f46e5 0%, transparent 70%)" }}
                    animate={{ x: [0, -40, 0], y: [0, -30, 0] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                />
            </div>
        )),
    },
    mesh: {
        name: "Mesh",
        component: React.memo(() => (
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
                style={{
                    backgroundImage:
                        "radial-gradient(circle at 25% 25%, #fff 1px, transparent 1px), radial-gradient(circle at 75% 75%, #fff 1px, transparent 1px)",
                    backgroundSize: "32px 32px sm:40px 40px",
                }}
            />
        )),
    },
    noise: {
        name: "Noise",
        component: React.memo(() => (
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.015] z-0"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                    backgroundSize: "200px 200px",
                }}
            />
        )),
    },
};

export const getMyUserId = () => {
    try {
        const token = sessionStorage.getItem("token");
        if (!token) return null;
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.user_id ?? null;
    } catch {
        return null;
    }
};

export const AVATARS = ["🧑", "👩", "🧔", "👱", "🧕", "👨", "🧑‍💻", "👩‍💻", "🧑‍🎨", "👩‍🎨"];
export const avatarFor = (id) => AVATARS[Number(id || 0) % AVATARS.length];

export const fmtTime = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

    return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

/* ==========================================================================
   SEMANTIC REUSABLE INTERACTIVE COMPONENTS
   ========================================================================== */

export const Glass = React.memo(({ children, className = "", hover = false, onClick, as: Tag = "div" }) => {
    const theme = useTheme() || THEMES.dark;
    return (
        <Tag
            onClick={onClick}
            className={`${theme.glass} ${hover ? theme.glassHover : ""} backdrop-blur-xl sm:backdrop-blur-2xl border rounded-xl sm:rounded-2xl relative overflow-hidden transition-all duration-200 ${hover && onClick ? "cursor-pointer select-none touch-manipulation" : ""} ${className}`}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
            {children}
        </Tag>
    );
});
Glass.displayName = "Glass";

export const StatusDot = React.memo(({ status, size = "sm" }) => {
    const sz = size === "sm" ? "w-1.5 h-1.5 sm:w-2 sm:h-2" : size === "md" ? "w-2 h-2 sm:w-2.5 sm:h-2.5" : "w-2.5 h-2.5 sm:w-3 sm:h-3";
    const color = status === "online" ? "bg-emerald-400 shadow-emerald-400/50 shadow-sm" : "bg-white/20";
    return (
        <span
            className={`${sz} ${color} rounded-full flex-shrink-0 ${status === "online" ? "animate-[pulse_2.5s_ease-in-out_infinite]" : ""}`}
        />
    );
});
StatusDot.displayName = "StatusDot";

export const Avatar = React.memo(({ user, size = "md", showStatus = true, className = "" }) => {
    const sizes = {
        xs: "w-6 h-6 sm:w-7 sm:h-7 text-xs sm:text-sm",
        sm: "w-8 h-8 sm:w-9 sm:h-9 text-sm sm:text-base",
        md: "w-10 h-10 sm:w-11 sm:h-11 text-lg sm:text-xl",
        lg: "w-14 h-14 sm:w-16 sm:h-16 text-2xl sm:text-3xl",
        xl: "w-16 h-16 sm:w-20 sm:h-20 text-3xl sm:text-4xl"
    };
    const dotSz = { xs: "sm", sm: "sm", md: "md", lg: "lg", xl: "lg" };
    const dotPos = { xs: "-bottom-0.5 -right-0.5", sm: "bottom-0 right-0", md: "bottom-0.5 right-0.5", lg: "bottom-0.5 right-0.5", xl: "bottom-0.5 right-0.5 sm:bottom-1 sm:right-1" };

    return (
        <div className={`relative flex-shrink-0 ${sizes[size] || sizes.md} rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center select-none ${className}`}>
            <span>{user?.avatar || "🧑"}</span>
            {showStatus && (
                <span className={`absolute ${dotPos[size] || dotPos.md} border sm:border-2 border-[#111114] bg-[#111114] rounded-full flex items-center justify-center`}>
                    <StatusDot status={user?.status} size={dotSz[size] || "sm"} />
                </span>
            )}
        </div>
    );
});
Avatar.displayName = "Avatar";

export const IconBtn = React.memo(({ children, onClick, active = false, title, danger = false, small = false, className = "" }) => {
    const theme = useTheme() || THEMES.dark;
    return (
        <motion.button
            type="button"
            title={title}
            onClick={onClick}
            whileHover={window.innerWidth >= 640 ? { scale: 1.05 } : {}}
            whileTap={{ scale: 0.95 }}
            className={`${small ? "w-7 h-7 sm:w-8 sm:h-8 text-sm sm:text-base" : "w-8.5 h-8.5 sm:w-9 sm:h-9 text-base sm:text-lg"} rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-150 flex-shrink-0 focus:outline-none touch-manipulation select-none ${className} ${active
                ? `bg-gradient-to-br ${theme.accent} text-white shadow-md`
                : danger
                    ? "hover:bg-red-500/10 text-red-400 focus:ring-2 focus:ring-red-500/20"
                    : "hover:bg-white/[0.07] text-white/40 hover:text-white/80 focus:ring-2 focus:ring-white/10"
                }`}
        >
            {children}
        </motion.button>
    );
});
IconBtn.displayName = "IconBtn";

export const Badge = React.memo(({ count }) => {
    const theme = useTheme() || THEMES.dark;
    if (!count || count <= 0) return null;
    return (
        <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className={`min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] px-1 rounded-full bg-gradient-to-r ${theme.accent} text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center leading-none select-none tabular-nums`}
        >
            {count > 99 ? "99+" : count}
        </motion.span>
    );
});
Badge.displayName = "Badge";

export const TypingBubble = React.memo(() => {
    const theme = useTheme() || THEMES.dark;
    return (
        <div className={`flex items-center gap-1 px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl rounded-bl-sm ${theme.glass} border backdrop-blur-xl w-fit select-none`}>
            {[0, 1, 2].map((i) => (
                <motion.span
                    key={i}
                    className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-white/50"
                    animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.1, delay: i * 0.15, repeat: Infinity, ease: "easeInOut" }}
                />
            ))}
        </div>
    );
});
TypingBubble.displayName = "TypingBubble";

export const DateDivider = React.memo(({ label }) => (
    <div className="flex items-center gap-2 sm:gap-3 my-3 sm:my-4 px-1 sm:px-2 select-none" role="separator">
        <div className="flex-1 h-[1px] bg-white/[0.06]" />
        <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-white/20 uppercase tabular-nums">{label}</span>
        <div className="flex-1 h-[1px] bg-white/[0.06]" />
    </div>
));
DateDivider.displayName = "DateDivider";

export const Section = React.memo(({ title, children }) => (
    <div className="space-y-1 sm:space-y-1.5">
        <p className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-white/20 px-2 sm:px-3 select-none">
            {title}
        </p>
        {children}
    </div>
));
Section.displayName = "Section";

/* ==========================================================================
   PROPTYPES VALIDATION ENGINES
   ========================================================================== */

Glass.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
    hover: PropTypes.bool,
    onClick: PropTypes.func,
    as: PropTypes.elementType,
};

StatusDot.propTypes = {
    status: PropTypes.string,
    size: PropTypes.oneOf(["sm", "md", "lg"]),
};

Avatar.propTypes = {
    user: PropTypes.shape({
        avatar: PropTypes.string,
        status: PropTypes.string,
    }),
    size: PropTypes.oneOf(["xs", "sm", "md", "lg", "xl"]),
    showStatus: PropTypes.bool,
    className: PropTypes.string,
};

IconBtn.propTypes = {
    children: PropTypes.node.isRequired,
    onClick: PropTypes.func,
    active: PropTypes.bool,
    title: PropTypes.string,
    danger: PropTypes.bool,
    small: PropTypes.bool,
};

Badge.propTypes = {
    count: PropTypes.number,
};

DateDivider.propTypes = {
    label: PropTypes.string.isRequired,
};

Section.propTypes = {
    title: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,
};