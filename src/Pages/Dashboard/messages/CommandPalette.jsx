import React, { useState, useEffect, useRef, useMemo } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import API from "../../../Services/API.js";
import { Glass, Avatar, StatusDot, useTheme } from "./constants";

const CommandPalette = React.memo(({ open, onClose, users = [], onSelectUser }) => {
    const theme = useTheme();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [focused, setFocused] = useState(0);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const activeRowRef = useRef(null);

    useEffect(() => {
        if (open) {
            setQuery("");
            setFocused(0);
            const rafId = requestAnimationFrame(() => {
                inputRef.current?.focus();
            });
            return () => cancelAnimationFrame(rafId);
        }
    }, [open]);

    useEffect(() => {
        if (activeRowRef.current) {
            activeRowRef.current.scrollIntoView({ block: "nearest" });
        }
    }, [focused]);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }
        setLoading(true);
        const controller = new AbortController();
        const delayDebounce = setTimeout(async () => {
            try {
                const token = sessionStorage.getItem("token");
                const res = await API.get("/search-users", {
                    params: { q: query, token },
                    signal: controller.signal,
                });
                setResults(res.data || []);
            } catch (err) {
                if (err.name !== "CanceledError") setResults([]);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 180);
        return () => {
            clearTimeout(delayDebounce);
            controller.abort();
        };
    }, [query]);

    const displayed = useMemo(() => {
        return query.trim() ? results : users.slice(0, 8);
    }, [query, results, users]);

    const handleKeyDown = (e) => {
        if (!displayed.length) {
            if (e.key === "Escape") onClose();
            return;
        }
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setFocused((prev) => Math.min(prev + 1, displayed.length - 1));
                break;
            case "ArrowUp":
                e.preventDefault();
                setFocused((prev) => Math.max(prev - 1, 0));
                break;
            case "Enter":
                e.preventDefault();
                if (displayed[focused]) {
                    onSelectUser(displayed[focused]);
                    onClose();
                }
                break;
            case "Escape":
                e.preventDefault();
                onClose();
                break;
            default:
                break;
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overscroll-contain" />
                    <motion.div initial={{ opacity: 0, scale: 0.96, y: window.innerWidth < 640 ? 0 : -16, x: "-50%" }} animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, scale: 0.96, y: window.innerWidth < 640 ? 0 : -16, x: "-50%" }} transition={{ type: "spring", stiffness: 420, damping: 30 }} className="fixed top-0 sm:top-[15%] left-1/2 w-full max-w-[540px] h-[100dvh] sm:h-auto z-50 px-0 sm:px-4 flex flex-col justify-end sm:justify-start">
                        <Glass className="overflow-hidden shadow-2xl shadow-black/60 rounded-t-2xl sm:rounded-2xl max-h-[85vh] sm:max-h-none flex flex-col w-full border-t border-white/10 sm:border-t-0">
                            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mt-2.5 mb-1 sm:hidden flex-shrink-0" />
                            <div className={`flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b ${theme.border} flex-shrink-0`}>
                                <svg className="w-4 h-4 text-white/30 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                <input ref={inputRef} type="text" value={query} onChange={(e) => { setQuery(e.target.value); setFocused(0); }} onKeyDown={handleKeyDown} placeholder="Search people, messages…" className="flex-1 bg-transparent text-white placeholder-white/25 text-xs sm:text-sm outline-none" />
                                {loading && <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full flex-shrink-0" />}
                                <kbd className="hidden sm:flex text-[10px] text-white/20 border border-white/10 rounded px-1.5 py-0.5 select-none font-mono">ESC</kbd>
                            </div>
                            <div className="overflow-y-auto py-1 sm:py-2 flex-1 overscroll-contain custom-scrollbar">
                                {!query.trim() && <p className="px-4 sm:px-5 py-1.5 text-[9px] sm:text-[10px] font-semibold tracking-widest uppercase text-white/20 select-none">Recent / Suggestions</p>}
                                {displayed.length === 0 && query.trim() && !loading && <div className="px-5 py-8 text-center text-white/25 text-xs sm:text-sm select-none">No results for &ldquo;{query}&rdquo;</div>}
                                {displayed.map((user, i) => {
                                    const isFocused = i === focused;
                                    return (
                                        <button key={user.id} ref={isFocused ? activeRowRef : null} type="button" onClick={() => { onSelectUser(user); onClose(); }} onMouseEnter={() => window.innerWidth >= 640 && setFocused(i)} className={`w-full flex items-center gap-3 px-4 sm:px-5 py-2.5 sm:py-3 transition-colors text-left outline-none touch-manipulation ${isFocused ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"}`}>
                                            <Avatar user={user} size="sm" className="scale-90 sm:scale-100" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs sm:text-sm font-medium text-white truncate">{user.username}</p>
                                                <p className="text-[11px] sm:text-xs text-white/30 truncate">{user.email || (user.status === "online" ? "Active now" : "Offline")}</p>
                                            </div>
                                            {user.status === "online" && <StatusDot status="online" />}
                                            {isFocused && <kbd className="hidden sm:inline-block text-[10px] text-white/20 border border-white/10 rounded px-1.5 py-0.5 select-none font-mono">↵</kbd>}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className={`hidden sm:flex items-center gap-4 px-5 py-2.5 border-t ${theme.border} select-none flex-shrink-0`}>
                                {[["↑↓", "Navigate"], ["↵", "Open"], ["ESC", "Close"]].map(([key, label]) => (
                                    <span key={key} className="flex items-center gap-1.5 text-[10px] text-white/20">
                                        <kbd className="border border-white/10 rounded px-1 py-0.5 font-mono">{key}</kbd>{label}
                                    </span>
                                ))}
                            </div>
                        </Glass>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});

CommandPalette.displayName = "CommandPalette";

CommandPalette.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    users: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
            username: PropTypes.string.isRequired,
            email: PropTypes.string,
            status: PropTypes.string,
            avatar: PropTypes.string,
        })
    ),
    onSelectUser: PropTypes.func.isRequired,
};

export default CommandPalette;
