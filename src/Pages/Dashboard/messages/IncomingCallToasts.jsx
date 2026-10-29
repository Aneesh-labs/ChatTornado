import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneCall, PhoneOff, Video, Clock } from "lucide-react";

/**
 * Top-right in-app notification toasts for incoming calls.
 * Displays for 30 seconds with an animated countdown timer.
 * If dismissed or timed out, the call remains live inside the chat.
 */
export default function IncomingCallToasts({
    incomingCalls = [],
    onLiftCall,
    onDeclineCall,
    onDismissToast,
    isAlreadyInCall = false,
}) {
    // Render only calls where toast has not been dismissed
    const activeToasts = incomingCalls.filter((c) => !c.toastDismissed);

    if (activeToasts.length === 0) return null;

    return (
        <aside aria-label="Incoming call notifications" className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
            <AnimatePresence>
                {activeToasts.map((incomingCall) => (
                    <SingleCallToast
                        key={incomingCall.id}
                        call={incomingCall}
                        onLift={() => onLiftCall(incomingCall.id)}
                        onDecline={() => onDeclineCall(incomingCall.id)}
                        onTimeout={() => onDismissToast(incomingCall.id)}
                        isAlreadyInCall={isAlreadyInCall}
                    />
                ))}
            </AnimatePresence>
        </aside>
    );
}

function SingleCallToast({ call, onLift, onDecline, onTimeout, isAlreadyInCall }) {
    const TOTAL_SECONDS = 30;
    const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);

    useEffect(() => {
        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.round((call.expiresAt - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining <= 0) {
                clearInterval(interval);
                onTimeout();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [call.expiresAt, onTimeout]);

    const callerName = call.user?.name || call.user?.username || "Someone";
    const isVideo = Boolean(call.video);
    const progressPercent = Math.max(0, Math.min(100, (timeLeft / TOTAL_SECONDS) * 100));

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="pointer-events-auto overflow-hidden rounded-2xl border border-white/20 bg-neutral-900/95 p-4 shadow-2xl backdrop-blur-2xl text-white relative"
        >
            {/* 30-Second Countdown Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
                <motion.div
                    className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-400"
                    style={{ width: `${progressPercent}%` }}
                    transition={{ ease: "linear", duration: 1 }}
                />
            </div>

            <div className="flex items-start gap-3">
                {/* Caller Avatar with Animated Beacon */}
                <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md border border-white/20">
                        {call.user?.profile_pic ? (
                            <img src={call.user.profile_pic} alt={callerName} className="w-full h-full object-cover" />
                        ) : (
                            <span>{callerName.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-neutral-900" />
                    </span>
                </div>

                {/* Call Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-white truncate">{callerName}</h4>
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-white/50 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            <span>{timeLeft}s</span>
                        </span>
                    </div>

                    <p className="text-xs text-white/70 flex items-center gap-1 mt-0.5">
                        {isVideo ? (
                            <>
                                <Video className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Incoming Video Call</span>
                            </>
                        ) : (
                            <>
                                <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Incoming Voice Call</span>
                            </>
                        )}
                    </p>

                    {/* Call Waiting Badge if receiver is currently on another call */}
                    {(isAlreadyInCall || call.isCallWaiting) && (
                        <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                            <span>🟡 Call Waiting</span>
                            <span className="text-white/50">(You're on another call)</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-3.5 flex items-center gap-2 pt-2 border-t border-white/10">
                <button
                    type="button"
                    onClick={onLift}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs py-2 px-3 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                    <Phone className="w-4 h-4" />
                    <span>{isAlreadyInCall ? "Switch & Lift" : "Lift Call"}</span>
                </button>

                <button
                    type="button"
                    onClick={onDecline}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:text-rose-300 text-white/70 active:scale-95 font-medium text-xs py-2 px-3 transition-all cursor-pointer border border-white/10"
                >
                    <PhoneOff className="w-4 h-4 text-rose-400" />
                    <span>Decline</span>
                </button>
            </div>
        </motion.div>
    );
}

IncomingCallToasts.propTypes = {
    incomingCalls: PropTypes.array.isRequired,
    onLiftCall: PropTypes.func.isRequired,
    onDeclineCall: PropTypes.func.isRequired,
    onDismissToast: PropTypes.func.isRequired,
    isAlreadyInCall: PropTypes.bool,
};

SingleCallToast.propTypes = {
    call: PropTypes.object.isRequired,
    onLift: PropTypes.func.isRequired,
    onDecline: PropTypes.func.isRequired,
    onTimeout: PropTypes.func.isRequired,
    isAlreadyInCall: PropTypes.bool,
};
