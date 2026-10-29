import React from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { Phone, PhoneCall, PhoneOff, Video, Radio } from "lucide-react";

/**
 * InChatLiveCallBanner
 * Displays a permanent live ringing call banner at the top of the chat
 * when the other person is calling / waiting on the line.
 */
export default function InChatLiveCallBanner({
    incomingCall,
    onLiftCall,
    onDeclineCall,
    isAlreadyInCall = false,
}) {
    if (!incomingCall) return null;

    const callerName = incomingCall.user?.name || incomingCall.user?.username || "Friend";
    const isVideo = Boolean(incomingCall.video);

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full bg-gradient-to-r from-emerald-950/90 via-neutral-900 to-emerald-950/90 border-b border-emerald-500/30 px-4 py-2.5 shadow-lg backdrop-blur-xl z-20"
        >
            <div className="flex flex-wrap items-center justify-between gap-3 max-w-5xl mx-auto">
                {/* Left: Pulsing Ringing Indicator & Call Info */}
                <div className="flex items-center gap-3 min-w-0">
                    <span className="relative flex h-3.5 w-3.5 flex-shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                    </span>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                                {isVideo ? (
                                    <>
                                        <Video className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                                        <span>Live Video Call from {callerName}</span>
                                    </>
                                ) : (
                                    <>
                                        <PhoneCall className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                        <span>Live Voice Call from {callerName}</span>
                                    </>
                                )}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded-full uppercase tracking-wider animate-pulse">
                                <Radio className="w-2.5 h-2.5" />
                                Ringing
                            </span>
                        </div>
                        <p className="text-[11px] text-white/60 truncate mt-0.5">
                            {isAlreadyInCall
                                ? "Waiting on line • Answering will switch from your active call"
                                : "Caller is waiting on the line • Pick up anytime"}
                        </p>
                    </div>
                </div>

                {/* Right: Pick Up and Decline Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => onLiftCall(incomingCall.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs py-1.5 px-3.5 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                    >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{isAlreadyInCall ? "Switch & Pick Up" : "Pick Up Call"}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => onDeclineCall(incomingCall.id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:text-rose-300 text-white/70 active:scale-95 font-medium text-xs py-1.5 px-2.5 transition-all cursor-pointer border border-white/10"
                    >
                        <PhoneOff className="w-3.5 h-3.5 text-rose-400" />
                        <span>Decline</span>
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

InChatLiveCallBanner.propTypes = {
    incomingCall: PropTypes.object,
    onLiftCall: PropTypes.func.isRequired,
    onDeclineCall: PropTypes.func.isRequired,
    isAlreadyInCall: PropTypes.bool,
};
