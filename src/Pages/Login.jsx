import React, { useEffect, useState } from "react";
import LoginDesktop from "./LoginDesktop";
import LoginMobile from "./LoginMobile";

export default function Login() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleChange = (e) => setIsMobile(e.matches);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isMobile ? <LoginMobile /> : <LoginDesktop />;
}