import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const usePerformanceMonitor = () => {
    const [isLowPerformance, setIsLowPerformance] = useState(false);

    useEffect(() => {
        const checkPerformance = async () => {
            // Check device memory (RAM) and CPU concurrency if available
            const memory = navigator.deviceMemory || 4; // Default to 4GB if unsupported
            const cores = navigator.hardwareConcurrency || 4;

            if (memory <= 2 || cores <= 2) {
                setIsLowPerformance(true);
                // Aggressively clear caches to free up memory for the chat
                try {
                    if ("caches" in window) {
                        const keys = await caches.keys();
                        await Promise.all(keys.map((key) => caches.delete(key)));
                        console.log("[PerformanceMonitor] Low memory detected. Caches cleared.");
                    }
                } catch (e) {
                    console.error("[PerformanceMonitor] Cache clear failed", e);
                }
            }
        };

        checkPerformance();
    }, []);

    return isLowPerformance;
};

const PerformanceMonitor = ({ isLowPerformance }) => {
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        if (isLowPerformance) {
            setShowBanner(true);
            const t = setTimeout(() => setShowBanner(false), 5000); // Hide after 5s
            return () => clearTimeout(t);
        }
    }, [isLowPerformance]);

    return (
        <AnimatePresence>
            {showBanner && (
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    className="fixed top-0 left-0 right-0 z-[200] bg-red-500/80 backdrop-blur-lg border-b border-red-500/50 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between shadow-xl"
                >
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>Low Memory Detected: Animations reduced for stability.</span>
                    </div>
                    <button onClick={() => setShowBanner(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PerformanceMonitor;
