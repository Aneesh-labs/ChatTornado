import React from "react";
import PropTypes from "prop-types";

/**
 * Custom vector sci-fi SVG emblems for Vortex Bastion turret cards and HUD.
 */
export const TurretEmblem = ({ type, className = "w-7 h-7" }) => {
  if (type === "pulse") {
    return (
      <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
        <rect x="6" y="18" width="24" height="10" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
        <rect x="11" y="6" width="5" height="14" rx="2" fill="#38bdf8" />
        <rect x="20" y="6" width="5" height="14" rx="2" fill="#38bdf8" />
        <circle cx="18" cy="23" r="2.5" fill="#e0f2fe" />
      </svg>
    );
  }
  if (type === "cryo") {
    return (
      <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
        <polygon points="18,4 28,15 18,26 8,15" fill="#083344" stroke="#22d3ee" strokeWidth="2" />
        <polygon points="18,9 23,15 18,21 13,15" fill="#67e8f9" />
        <rect x="8" y="26" width="20" height="5" rx="2.5" fill="#0f172a" stroke="#22d3ee" strokeWidth="1.5" />
      </svg>
    );
  }
  if (type === "tesla") {
    return (
      <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
        <circle cx="18" cy="10" r="5" fill="#fbbf24" />
        <ellipse cx="18" cy="18" rx="9" ry="2.5" stroke="#f59e0b" strokeWidth="2" />
        <ellipse cx="18" cy="23" rx="11" ry="2.5" stroke="#f59e0b" strokeWidth="2" />
        <path d="M9 9L14 13M27 9L22 13" stroke="#fef08a" strokeWidth="2" strokeLinecap="round" />
        <rect x="10" y="27" width="16" height="4" rx="2" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.5" />
      </svg>
    );
  }
  // Rail Spire
  return (
    <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
      <rect x="10" y="5" width="4" height="20" rx="1.5" fill="#334155" stroke="#c084fc" strokeWidth="1.5" />
      <rect x="22" y="5" width="4" height="20" rx="1.5" fill="#334155" stroke="#c084fc" strokeWidth="1.5" />
      <line x1="18" y1="3" x2="18" y2="23" stroke="#e9d5ff" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="8" y="24" width="20" height="7" rx="3" fill="#0f172a" stroke="#c084fc" strokeWidth="2" />
    </svg>
  );
};

TurretEmblem.propTypes = {
  type: PropTypes.oneOf(["pulse", "cryo", "tesla", "rail"]).isRequired,
  className: PropTypes.string,
};
