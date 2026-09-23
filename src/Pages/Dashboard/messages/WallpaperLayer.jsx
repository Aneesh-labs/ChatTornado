import React from "react";
import PropTypes from "prop-types";
import { WALLPAPERS } from "./constants";

const WallpaperLayer = React.memo(({ wallpaper, isLowPerformance }) => {
    // 1. Safe dynamic lookup with optional chaining to prevent runtime exceptions
    const currentWallpaperConfig = WALLPAPERS?.[wallpaper];
    // Disable animated component if in low performance mode to save RAM/CPU
    const TargetWallpaperComponent = isLowPerformance ? null : currentWallpaperConfig?.component;

    return (
        <div
            className="absolute inset-0 w-full h-full select-none pointer-events-none overflow-hidden z-0"
            style={{
                // 2. Pure frontend fallback: If it's a raw image URL or hex color string instead of a component
                backgroundImage: !TargetWallpaperComponent && currentWallpaperConfig?.value
                    ? `url(${currentWallpaperConfig.value})`
                    : undefined,
                backgroundColor: !TargetWallpaperComponent && currentWallpaperConfig?.color
                    ? currentWallpaperConfig.color
                    : "transparent",
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}
        >
            {/* 3. If a complex animated component is provided, render it safely */}
            {TargetWallpaperComponent ? (
                <TargetWallpaperComponent />
            ) : (
                // 4. Elegant pure CSS default glass mesh gradient if everything else is missing
                !currentWallpaperConfig?.value && (
                    <div className="absolute inset-0 bg-neutral-950">
                        {!isLowPerformance && (
                            <>
                                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[140px] pointer-events-none" />
                                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[130px] pointer-events-none" />
                            </>
                        )}
                    </div>
                )
            )}
        </div>
    );
});

WallpaperLayer.propTypes = {
    wallpaper: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    isLowPerformance: PropTypes.bool,
};

WallpaperLayer.displayName = "WallpaperLayer";

export default WallpaperLayer;