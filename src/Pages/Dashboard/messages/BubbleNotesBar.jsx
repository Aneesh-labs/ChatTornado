import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Music, X, Send, Sparkles, Trash2, Heart, MessageCircle } from "lucide-react";
import { getActiveNotes, saveUserNote, deleteUserNote } from "../../../Services/notesService";
import { getMyUserId } from "./constants";

const MOOD_EMOJIS = ["✨", "🔥", "🎧", "😴", "🚀", "💡", "🍣", "☕", "💭", "🎮", "🏖️", "⚡"];

export default function BubbleNotesBar({ onSelectUser, users = [], onSendDirectReply }) {
    const [notes, setNotes] = useState(() => getActiveNotes());
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [selectedNote, setSelectedNote] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [noteText, setNoteText] = useState("");
    const [selectedEmoji, setSelectedEmoji] = useState("✨");
    const [songTitle, setSongTitle] = useState("");
    const [songArtist, setSongArtist] = useState("");
    const scrollContainerRef = useRef(null);

    const myUserId = getMyUserId();
    const myNote = useMemo(() => {
        return notes.find(n => String(n.userId) === String(myUserId));
    }, [notes, myUserId]);

    const otherNotes = useMemo(() => {
        return notes.filter(n => String(n.userId) !== String(myUserId));
    }, [notes, myUserId]);

    useEffect(() => {
        const handleUpdate = (e) => {
            if (e.detail) setNotes(e.detail);
        };
        window.addEventListener("chattornado_notes_updated", handleUpdate);
        return () => window.removeEventListener("chattornado_notes_updated", handleUpdate);
    }, []);

    const handleCreateNote = (e) => {
        e.preventDefault();
        if (!noteText.trim()) return;

        saveUserNote({
            userId: myUserId,
            username: "You",
            text: noteText.trim(),
            emoji: selectedEmoji,
            songTitle: songTitle.trim(),
            songArtist: songArtist.trim()
        });

        setNoteText("");
        setSongTitle("");
        setSongArtist("");
        setCreateModalOpen(false);
    };

    const handleDeleteMyNote = () => {
        deleteUserNote(myUserId);
        setCreateModalOpen(false);
    };

    const handleSendReply = (e) => {
        e.preventDefault();
        if (!replyText.trim() || !selectedNote) return;

        const targetUser = users.find(u => String(u.id) === String(selectedNote.userId)) || {
            id: selectedNote.userId,
            username: selectedNote.username
        };

        // Open chat and send reply
        if (onSelectUser) {
            onSelectUser(targetUser);
        }

        if (onSendDirectReply) {
            const formattedMsg = `💭 *Replying to note: "${selectedNote.text}"*\n${replyText.trim()}`;
            onSendDirectReply(targetUser, formattedMsg);
        }

        setReplyText("");
        setSelectedNote(null);
    };

    return (
        <div className="w-full border-b border-white/[0.06] bg-black/20 backdrop-blur-md px-3 pt-5 pb-3 overflow-hidden">
            {/* Horizontal Scroll Track */}
            <div
                ref={scrollContainerRef}
                className="flex items-start gap-4 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {/* 1. "Your Note" Bubble */}
                <div 
                    className="flex flex-col items-center flex-shrink-0 w-[72px] cursor-pointer group relative"
                    onClick={() => setCreateModalOpen(true)}
                >
                    {/* Floating Speech Bubble preview if note exists */}
                    <div className="h-6 flex items-center justify-center mb-1.5 w-full">
                        {myNote ? (
                            <div className="relative flex items-center justify-center max-w-[72px]">
                                <div className="bg-[#19192c]/95 backdrop-blur-md border border-violet-400/30 px-2 py-0.5 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.4)] text-[10px] text-white/90 font-medium whitespace-nowrap truncate flex items-center gap-1 group-hover:scale-105 transition-transform">
                                    <span className="text-[11px] shrink-0">{myNote.emoji}</span>
                                    <span className="truncate max-w-[48px]">{myNote.text}</span>
                                </div>
                                <div className="w-1.5 h-1.5 bg-[#19192c] border-r border-b border-violet-400/30 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
                            </div>
                        ) : (
                            <span className="text-[9px] font-semibold tracking-wider uppercase text-violet-400/70 group-hover:text-violet-300 transition-colors">
                                New Note
                            </span>
                        )}
                    </div>

                    {/* Avatar & Story Ring */}
                    <div className="relative">
                        <div className="w-13 h-13 rounded-full p-[2px] bg-gradient-to-tr from-violet-500 via-indigo-500 to-cyan-400 shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform duration-200">
                            <div className="w-full h-full rounded-full bg-[#0d0d18] p-[2px] flex items-center justify-center overflow-hidden">
                                <span className="text-xl font-bold text-white/90">
                                    {myNote ? myNote.emoji : "👤"}
                                </span>
                            </div>
                        </div>

                        {!myNote && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 border-2 border-[#0d0d18] flex items-center justify-center text-white shadow">
                                <Plus className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                        )}
                    </div>

                    <span className="text-[11px] font-medium text-white/70 group-hover:text-white mt-1.5 truncate max-w-[68px] text-center transition-colors">
                        {myNote ? "Your Note" : "Share Note"}
                    </span>
                </div>

                {/* 2. Friends' Notes */}
                {otherNotes.map((note) => (
                    <motion.div
                        key={note.id}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedNote(note)}
                        className="flex flex-col items-center flex-shrink-0 w-[72px] cursor-pointer group relative"
                    >
                        {/* Floating Speech Bubble */}
                        <div className="h-6 flex items-center justify-center mb-1.5 w-full">
                            <div className="relative flex items-center justify-center max-w-[72px]">
                                <div className="bg-[#19192c]/95 backdrop-blur-md border border-violet-400/35 px-2 py-0.5 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.4)] text-[10px] text-white font-medium whitespace-nowrap truncate flex items-center gap-1 group-hover:scale-105 transition-transform">
                                    <span className="text-[11px] shrink-0">{note.emoji}</span>
                                    <span className="truncate max-w-[48px]">{note.text}</span>
                                </div>
                                <div className="w-1.5 h-1.5 bg-[#19192c] border-r border-b border-violet-400/35 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
                            </div>
                        </div>

                        {/* Avatar with Story Ring */}
                        <div className="relative">
                            <div className="w-13 h-13 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform duration-200">
                                <div className="w-full h-full rounded-full bg-[#0c0d18] p-[2px] overflow-hidden flex items-center justify-center">
                                    {note.avatar ? (
                                        <img src={note.avatar} alt={note.username} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        <span className="text-xs font-bold text-white/80">{note.username.slice(0, 2).toUpperCase()}</span>
                                    )}
                                </div>
                            </div>

                            {/* Music Badge with Equalizer */}
                            {note.songTitle && (
                                <div 
                                    title={`${note.songTitle} • ${note.songArtist || ""}`}
                                    className="absolute -bottom-0.5 -right-0.5 flex items-center gap-0.5 bg-gradient-to-r from-pink-500 to-rose-500 px-1.5 py-0.5 rounded-full border-2 border-[#0c0d18] shadow-md"
                                >
                                    <Music className="w-2.5 h-2.5 text-white" />
                                    <div className="flex items-end gap-[1px] h-2">
                                        <span className="w-[1.5px] h-full bg-white rounded-full animate-pulse" />
                                        <span className="w-[1.5px] h-2/3 bg-white rounded-full animate-bounce" />
                                        <span className="w-[1.5px] h-1/2 bg-white rounded-full animate-pulse" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Username */}
                        <span className="text-[11px] font-medium text-white/70 group-hover:text-white mt-1.5 truncate max-w-[68px] text-center transition-colors">
                            {note.username}
                        </span>
                    </motion.div>
                ))}
            </div>

            {/* Modal: Create or Edit My Note */}
            {typeof document !== "undefined" && createPortal(
                <AnimatePresence>
                    {createModalOpen && (
                        <div 
                            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                            onClick={(e) => {
                                if (e.target === e.currentTarget) setCreateModalOpen(false);
                            }}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#141427] to-[#090912] border border-violet-500/30 p-5 shadow-2xl text-white"
                            >
                                <button
                                    onClick={() => setCreateModalOpen(false)}
                                    className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>

                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="w-4 h-4 text-violet-400" />
                                    <h3 className="text-sm font-bold text-white">
                                        {myNote ? "Edit Your 24h Note" : "Share a 24-Hour Note"}
                                    </h3>
                                </div>

                                <form onSubmit={handleCreateNote} className="space-y-3">
                                    {/* Mood Emoji Picker */}
                                    <div>
                                        <label className="text-[11px] font-semibold text-white/50 mb-1.5 block">Select Mood</label>
                                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                                            {MOOD_EMOJIS.map(emoji => (
                                                <button
                                                    key={emoji}
                                                    type="button"
                                                    onClick={() => setSelectedEmoji(emoji)}
                                                    className={`text-lg p-1.5 rounded-xl transition-all ${selectedEmoji === emoji ? "bg-violet-600 scale-110 shadow-lg shadow-violet-600/50" : "bg-white/5 hover:bg-white/10"}`}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Text input */}
                                    <div>
                                        <label className="text-[11px] font-semibold text-white/50 mb-1 block">What's on your mind? (60 chars)</label>
                                        <input
                                            type="text"
                                            maxLength={60}
                                            value={noteText}
                                            onChange={(e) => setNoteText(e.target.value)}
                                            placeholder={myNote ? myNote.text : "e.g. Grinding late tonight 💻"}
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors"
                                        />
                                        <div className="text-right text-[10px] text-white/40 mt-1">
                                            {noteText.length}/60
                                        </div>
                                    </div>

                                    {/* Optional Song Title */}
                                    <div>
                                        <label className="text-[11px] font-semibold text-white/50 mb-1 flex items-center gap-1.5">
                                            <Music className="w-3 h-3 text-pink-400" />
                                            Add Profile Track (Optional)
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                type="text"
                                                value={songTitle}
                                                onChange={(e) => setSongTitle(e.target.value)}
                                                placeholder="Song title"
                                                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500"
                                            />
                                            <input
                                                type="text"
                                                value={songArtist}
                                                onChange={(e) => setSongArtist(e.target.value)}
                                                placeholder="Artist"
                                                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2">
                                        {myNote && (
                                            <button
                                                type="button"
                                                onClick={handleDeleteMyNote}
                                                className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Delete
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={!noteText.trim()}
                                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 transition-all disabled:opacity-40 cursor-pointer"
                                        >
                                            Share Note
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Modal: View Friend's Note & Quick Reply */}
            {typeof document !== "undefined" && createPortal(
                <AnimatePresence>
                    {selectedNote && (
                        <div 
                            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                            onClick={(e) => {
                                if (e.target === e.currentTarget) setSelectedNote(null);
                            }}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#16162a] to-[#0a0a14] border border-cyan-500/30 p-5 shadow-2xl text-white"
                            >
                                <button
                                    onClick={() => setSelectedNote(null)}
                                    className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>

                                {/* Author info */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-violet-500 to-cyan-400 p-0.5">
                                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center font-bold text-sm">
                                            {selectedNote.username.slice(0, 2).toUpperCase()}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">@{selectedNote.username}</h4>
                                        <span className="text-[10px] text-white/40">24-hour Bubble Note</span>
                                    </div>
                                </div>

                                {/* Note content */}
                                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 mb-4">
                                    <div className="text-3xl mb-1">{selectedNote.emoji}</div>
                                    <p className="text-base font-semibold text-white tracking-wide">
                                        "{selectedNote.text}"
                                    </p>

                                    {selectedNote.songTitle && (
                                        <div className="mt-3 flex items-center gap-2 p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-300">
                                            <Music className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "4s" }} />
                                            <span className="text-xs font-medium truncate">
                                                {selectedNote.songTitle} {selectedNote.songArtist ? `• ${selectedNote.songArtist}` : ""}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Quick Reply Form */}
                                <form onSubmit={handleSendReply} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder={`Reply to @${selectedNote.username}...`}
                                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!replyText.trim()}
                                        className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold disabled:opacity-40 shadow transition-all cursor-pointer"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}

BubbleNotesBar.propTypes = {
    onSelectUser: PropTypes.func,
    users: PropTypes.array,
    onSendDirectReply: PropTypes.func
};
