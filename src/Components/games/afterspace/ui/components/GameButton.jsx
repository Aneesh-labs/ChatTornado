import React from "react";
import PropTypes from "prop-types";

export const GameButton = ({
  children,
  onClick,
  variant = "secondary",
  disabled = false,
  className = "",
  ...rest
}) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[2px] border text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#E8E9E2]/60 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

  const styles =
    variant === "primary"
      ? "bg-[#202625] hover:bg-[#303735] border-[#E8E9E2]/30 text-[#F5F3ED] px-5 py-2.5"
      : variant === "light"
      ? "bg-[#EDEAE1] hover:bg-[#F5F3ED] border-[#BEBDB2] text-[#151A19] px-5 py-2.5"
      : variant === "ghost"
      ? "bg-transparent hover:bg-[#202625]/70 border-transparent text-[#8F938C] hover:text-[#F5F3ED] px-3 py-1.5"
      : "bg-transparent hover:bg-[#202625]/80 border-[#E8E9E2]/15 text-[#E8E9E2] px-4 py-2";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};

GameButton.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  variant: PropTypes.oneOf(["primary", "secondary", "light", "ghost"]),
  disabled: PropTypes.bool,
  className: PropTypes.string,
};
