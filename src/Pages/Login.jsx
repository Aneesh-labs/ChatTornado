import React, { useEffect, useState } from "react";

import LoginDesktop1 from "./LoginDesktop";
import LoginDesktop2 from "./LoginDesktop2";
import LoginDesktop3 from "./LoginDesktop3";
import LoginDesktop4 from "./LoginDesktop4";

import LoginMobile from "./LoginMobile";

const desktopPages = [
  LoginDesktop1,
  LoginDesktop2,
  LoginDesktop3,
  LoginDesktop4,
];

export default function Login() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  );

  // Randomly pick one desktop page (supports ?v=1..4 or ?desktop=1..4 override)
  const [DesktopComponent] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const override = parseInt(params.get("v") || params.get("desktop") || "", 10);
      if (!isNaN(override) && override >= 1 && override <= desktopPages.length) {
        return desktopPages[override - 1];
      }
    }
    const randomIndex = Math.floor(Math.random() * desktopPages.length);
    return desktopPages[randomIndex];
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleChange = (e) => setIsMobile(e.matches);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isMobile ? <LoginMobile /> : <DesktopComponent />;
}