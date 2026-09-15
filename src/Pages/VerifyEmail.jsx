import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import API from "../Services/API";
import { Mail, CheckCircle2, XCircle, RefreshCw, Loader2, LogOut, Send } from "lucide-react";

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();
    
    const [status, setStatus] = useState(token ? "verifying" : "prompt"); // verifying, success, error, prompt
    const [message, setMessage] = useState("");
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resending, setResending] = useState(false);
    const [emailInput, setEmailInput] = useState(() => sessionStorage.getItem("email") || "");
    const [resendNotice, setResendNotice] = useState("");

    useEffect(() => {
        if (token) {
            verifyToken(token);
        }
    }, [token]);

    useEffect(() => {
        let timer;
        if (resendCooldown > 0) {
            timer = setInterval(() => setResendCooldown(c => c - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const verifyToken = async (t) => {
        try {
            const res = await API.get(`/verify-email?token=${t}`);
            setStatus("success");
            setMessage(res.data.message || "Email verified successfully!");
            sessionStorage.setItem("emailVerified", "true");
        } catch (err) {
            setStatus("error");
            if (!err.response) {
                // Network error, CORS, or VITE_API_URL missing
                const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
                if (apiUrl.includes("localhost") && window.location.hostname !== "localhost") {
                    setMessage("Network Error: The frontend is trying to connect to localhost. Please set VITE_API_URL in your Vercel deployment settings.");
                } else {
                    setMessage(`Fetch Failed [${err.name}: ${err.message}]. Backend URL: ${apiUrl}`);
                }
            } else {
                // Backend responded with an error (could be JSON or HTML string)
                let errorMsg = "Invalid or expired token.";
                if (err.response?.data?.detail) {
                    errorMsg = err.response.data.detail;
                } else if (typeof err.response?.data === 'string' && err.response.data.length < 100) {
                    errorMsg = `Server Error: ${err.response.data}`;
                }
                setMessage(errorMsg);
            }
        }
    };

    const handleResend = async (e) => {
        if (e) e.preventDefault();
        if (resendCooldown > 0 || resending) return;

        const targetEmail = (emailInput || sessionStorage.getItem("email") || "").trim();
        if (!targetEmail) {
            setResendNotice("Please enter your email address.");
            return;
        }
        
        setResending(true);
        setResendNotice("");
        try {
            const res = await API.post("/resend-verification", { email: targetEmail });
            sessionStorage.setItem("email", targetEmail);
            setResendNotice(res.data.message || "Verification link sent to your email!");
            setResendCooldown(60); // 60s cooldown
        } catch (err) {
            setResendNotice(err.response?.data?.detail || "Error resending verification email.");
        } finally {
            setResending(false);
        }
    };

    const handleLogout = () => {
        sessionStorage.clear();
        navigate("/", { replace: true });
    };

    const handleContinue = () => {
        navigate("/home", { replace: true });
    };

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-[#07090d] text-white">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(125,211,252,0.08),transparent_34%,rgba(248,196,113,0.07)_68%,transparent)]" />
            
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#090c12]/88 p-8 shadow-2xl backdrop-blur-2xl">
                
                {status === "verifying" && (
                    <div className="flex flex-col items-center text-center">
                        <Loader2 className="mb-4 h-12 w-12 animate-spin text-blue-400" />
                        <h2 className="text-xl font-bold">Verifying Email...</h2>
                        <p className="mt-2 text-sm text-white/60">Please wait while we check your token.</p>
                    </div>
                )}

                {status === "success" && (
                    <div className="flex flex-col items-center text-center">
                        <CheckCircle2 className="mb-4 h-12 w-12 text-emerald-400" />
                        <h2 className="text-xl font-bold text-emerald-400">Verified!</h2>
                        <p className="mt-2 text-sm text-white/60">{message}</p>
                        <button 
                            onClick={handleContinue}
                            className="mt-6 w-full rounded-xl bg-emerald-500 py-3 font-bold text-black transition hover:bg-emerald-400"
                        >
                            Continue to ChatTornado
                        </button>
                    </div>
                )}

                {status === "error" && (
                    <div className="flex flex-col items-center text-center">
                        <XCircle className="mb-4 h-12 w-12 text-red-400" />
                        <h2 className="text-xl font-bold text-red-400">Verification Failed</h2>
                        <p className="mt-2 text-sm text-white/60">{message}</p>
                        <button 
                            onClick={() => setStatus("prompt")}
                            className="mt-6 w-full rounded-xl bg-white/10 py-3 font-bold text-white transition hover:bg-white/20"
                        >
                            Try Resending
                        </button>
                    </div>
                )}

                {status === "prompt" && (
                    <div className="flex flex-col items-center text-center">
                        <Mail className="mb-4 h-12 w-12 text-blue-400" />
                        <h2 className="text-xl font-bold">Verify Your Email</h2>
                        <p className="mt-2 text-sm text-white/60">
                            We've sent a verification link. Please click the link in your inbox or request a new one below:
                        </p>

                        <form onSubmit={handleResend} className="mt-5 w-full space-y-3">
                            <input
                                type="email"
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                placeholder="Enter your email"
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-blue-400/50"
                                required
                            />

                            {resendNotice && (
                                <p className={`text-xs ${resendNotice.includes("sent") ? "text-emerald-400" : "text-amber-300"}`}>
                                    {resendNotice}
                                </p>
                            )}
                            
                            <button 
                                type="submit"
                                disabled={resendCooldown > 0 || resending}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 font-bold text-white transition hover:bg-blue-400 disabled:opacity-50"
                            >
                                {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Verification Email"}
                            </button>
                        </form>

                        <button 
                            type="button"
                            onClick={handleLogout}
                            className="mt-4 flex items-center justify-center gap-2 text-sm text-red-400 hover:text-red-300"
                        >
                            <LogOut className="h-4 w-4" />
                            Logout
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
