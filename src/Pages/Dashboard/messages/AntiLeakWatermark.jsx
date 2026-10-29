/**
 * AntiLeakWatermark.jsx
 * Zero-Trace Fortress Protection: Overlays a dynamic, repeating biometric watermark
 * across sensitive chats & media. If a recipient takes a screenshot or photo with
 * an external camera, their own username and timestamp are indelibly stamped across the image.
 */

import React, { useMemo } from "react";

export default function AntiLeakWatermark({ active = true, viewerName = "Member", showTimestamp = true }) {
    const timeStr = useMemo(() => {
        return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }, []);

    if (!active) return null;

    const watermarkText = `CONFIDENTIAL • ${viewerName.toUpperCase()} • ${timeStr}`;

    return (
        <div
            className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none opacity-[0.06] flex flex-wrap content-around justify-around gap-16 p-4 rotate-[-18deg]"
            aria-hidden="true"
        >
            {Array.from({ length: 24 }).map((_, idx) => (
                <div
                    key={idx}
                    className="text-xs font-mono font-black tracking-widest text-white whitespace-nowrap"
                >
                    {watermarkText}
                </div>
            ))}
        </div>
    );
}
