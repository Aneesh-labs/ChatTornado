import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X, Shield, Crown, UserMinus, UserPlus, LogOut, Trash2, Loader2, AlertCircle } from "lucide-react";
import API from "../../../Services/API";
import { Avatar, getMyUserId } from "./constants";

export default function GroupInfoModal({ isOpen, onClose, group, availableUsers = [], onGroupUpdated, onGroupLeft }) {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showAddMember, setShowAddMember] = useState(false);
    const [selectedUserToAdd, setSelectedUserToAdd] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    const myId = getMyUserId();

    const fetchDetails = async () => {
        if (!group?.id) return;
        setLoading(true);
        try {
            const token = sessionStorage.getItem("token");
            const res = await API.get(`/api/groups/${group.id}`, { params: { token } });
            setDetails(res.data);
        } catch (err) {
            console.error("Failed to fetch group details:", err);
            setError(err.response?.data?.detail || "Failed to load group details.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && group?.id) {
            fetchDetails();
        }
    }, [isOpen, group?.id]);

    if (!isOpen || !group) return null;

    const myRole = details?.my_role || group.my_role || "MEMBER";
    const canManageMembers = myRole === "OWNER" || myRole === "ADMIN";
    const isOwner = myRole === "OWNER";

    const handleAddMember = async () => {
        if (!selectedUserToAdd) return;
        setActionLoading(true);
        try {
            const token = sessionStorage.getItem("token");
            await API.post(
                `/api/groups/${group.id}/members`,
                { user_ids: [parseInt(selectedUserToAdd)] },
                { params: { token } }
            );
            setSelectedUserToAdd("");
            setShowAddMember(false);
            await fetchDetails();
            onGroupUpdated?.();
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to add member.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!confirm("Are you sure you want to remove this member?")) return;
        setActionLoading(true);
        try {
            const token = sessionStorage.getItem("token");
            await API.delete(`/api/groups/${group.id}/members/${userId}`, { params: { token } });
            await fetchDetails();
            onGroupUpdated?.();
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to remove member.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleChangeRole = async (userId, newRole) => {
        setActionLoading(true);
        try {
            const token = sessionStorage.getItem("token");
            await API.put(
                `/api/groups/${group.id}/members/${userId}/role`,
                { role: newRole },
                { params: { token } }
            );
            await fetchDetails();
            onGroupUpdated?.();
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to change role.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleLeaveGroup = async () => {
        if (!confirm("Leave this group? You will need to be re-added to rejoin.")) return;
        setActionLoading(true);
        try {
            const token = sessionStorage.getItem("token");
            await API.delete(`/api/groups/${group.id}/members/${myId}`, { params: { token } });
            onGroupLeft?.(group.id);
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to leave group.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!confirm("Are you sure you want to permanently delete this group? All messages will be erased.")) return;
        setActionLoading(true);
        try {
            const token = sessionStorage.getItem("token");
            await API.delete(`/api/groups/${group.id}`, { params: { token } });
            onGroupLeft?.(group.id);
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to delete group.");
        } finally {
            setActionLoading(false);
        }
    };

    const existingMemberIds = (details?.members || []).map((m) => m.user?.id);
    const nonMembers = availableUsers.filter((u) => !existingMemberIds.includes(u.id) && !u.is_bot);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative w-full max-w-lg bg-[#0e121b] border border-white/10 rounded-2xl p-6 shadow-2xl text-white overflow-hidden flex flex-col max-h-[85vh]"
                >
                    <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-violet-500/20">
                                👥
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">{details?.name || group.name}</h3>
                                <p className="text-xs text-white/50">{details?.members?.length || 0} members • Your role: {myRole}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {error && (
                        <div className="my-3 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 flex-shrink-0">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {loading ? (
                        <div className="py-12 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                        </div>
                    ) : (
                        <div className="mt-4 flex-1 min-h-0 flex flex-col space-y-4">
                            {/* Member list header & add button */}
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-white/60">
                                    Members
                                </h4>
                                {canManageMembers && !showAddMember && (
                                    <button
                                        onClick={() => setShowAddMember(true)}
                                        className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1.5 transition-colors"
                                    >
                                        <UserPlus className="w-3.5 h-3.5" />
                                        <span>Add Member</span>
                                    </button>
                                )}
                            </div>

                            {/* Add Member inline form */}
                            {showAddMember && (
                                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2">
                                    <select
                                        value={selectedUserToAdd}
                                        onChange={(e) => setSelectedUserToAdd(e.target.value)}
                                        className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none"
                                    >
                                        <option value="">Select a connection to add...</option>
                                        {nonMembers.map((u) => (
                                            <option key={u.id} value={u.id} className="bg-[#111624]">
                                                {u.username}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        disabled={!selectedUserToAdd || actionLoading}
                                        onClick={handleAddMember}
                                        className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition-colors disabled:opacity-50"
                                    >
                                        Add
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddMember(false)}
                                        className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Member list */}
                            <div className="flex-1 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-2 space-y-1.5 custom-scrollbar">
                                {(details?.members || []).map((m) => {
                                    const u = m.user;
                                    const role = m.role;
                                    const isMe = u?.id === myId;
                                    return (
                                        <div
                                            key={m.id}
                                            className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <Avatar user={u} size="xs" />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-white truncate">
                                                        {u?.username} {isMe && <span className="text-white/40 text-[10px]">(You)</span>}
                                                    </p>
                                                    <p className="text-[10px] text-white/40">{u?.status || "offline"}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {/* Role Pill */}
                                                <span
                                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                                                        role === "OWNER"
                                                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                                            : role === "ADMIN"
                                                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                                            : "bg-white/10 text-white/50"
                                                    }`}
                                                >
                                                    {role === "OWNER" && <Crown className="w-3 h-3 text-amber-400" />}
                                                    {role === "ADMIN" && <Shield className="w-3 h-3 text-cyan-400" />}
                                                    {role}
                                                </span>

                                                {/* Role management controls if Owner */}
                                                {isOwner && !isMe && (
                                                    <select
                                                        value={role}
                                                        disabled={actionLoading}
                                                        onChange={(e) => handleChangeRole(u.id, e.target.value)}
                                                        className="px-2 py-1 rounded bg-black/40 border border-white/10 text-[10px] text-white/70"
                                                    >
                                                        <option value="MEMBER">MEMBER</option>
                                                        <option value="ADMIN">ADMIN</option>
                                                    </select>
                                                )}

                                                {/* Remove member button */}
                                                {canManageMembers && !isMe && role !== "OWNER" && (
                                                    <button
                                                        type="button"
                                                        disabled={actionLoading}
                                                        onClick={() => handleRemoveMember(u.id)}
                                                        title="Remove from group"
                                                        className="p-1 rounded-lg hover:bg-red-500/20 text-red-400/70 hover:text-red-300 transition-colors"
                                                    >
                                                        <UserMinus className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Danger actions: Leave or Delete Group */}
                            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3 flex-shrink-0">
                                {!isOwner && (
                                    <button
                                        type="button"
                                        disabled={actionLoading}
                                        onClick={handleLeaveGroup}
                                        className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold flex items-center gap-2 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>Leave Group</span>
                                    </button>
                                )}

                                {isOwner && (
                                    <button
                                        type="button"
                                        disabled={actionLoading}
                                        onClick={handleDeleteGroup}
                                        className="px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-2 transition-colors ml-auto"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span>Delete Group</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
