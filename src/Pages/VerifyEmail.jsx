import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Mail, CheckCircle2, XCircle, RefreshCw, Loader2, LogOut } from "lucide-react";

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();
    
    const [status, setStatus] = useState(token ? "verifying" : "prompt"); // verifying, success, error, prompt
    const [message, setMessage] = useState("");
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resending, setResending] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL;

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
            const res = await axios.get(`${API_URL}/verify-email?token=${t}`);
            setStatus("success");
            setMessage(res.data.message || "Email verified successfully!");
            // Update session storage
            sessionStorage.setItem("emailVerified", "true");
        } catch (err) {
            setStatus("error");
            setMessage(err.response?.data?.detail || "Invalid or expired token.");
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0 || resending) return;
        
        setResending(true);
        try {
            // Need to get email from somewhere, either stored locally during signup/login or from backend.
            // Let's assume the user is logged in if they are on the prompt page. 
            // In a real app, they would provide it, or we infer it from the JWT session.
            const userEmail = sessionStorage.getItem("email") || prompt("Please enter your email to resend:");
            if (!userEmail) return;

            const res = await axios.post(`${API_URL}/resend-verification`, { email: userEmail });
            alert("Verification email resent! Check your inbox.");
            setResendCooldown(60); // 60s cooldown
        } catch (err) {
            alert(err.response?.data?.detail || "Error resending email.");
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
                        <h2 className="text-xl font-bold">Check your email</h2>
                        <p className="mt-2 text-sm text-white/60">
                            We've sent a verification link to your email address. Please click it to continue.
                        </p>
                        
                        <button 
                            onClick={handleResend}
                            disabled={resendCooldown > 0 || resending}
                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 font-bold text-white transition hover:bg-blue-400 disabled:opacity-50"
                        >
                            {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Email"}
                        </button>

                        <button 
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
