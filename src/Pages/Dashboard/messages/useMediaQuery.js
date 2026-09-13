import { useState, useEffect } from "react";

export function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => {
        if (typeof window === "undefined") return false;
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        const mql = window.matchMedia(query);
        const handler = (e) => setMatches(e.matches);
        mql.addEventListener("change", handler);
        setMatches(mql.matches);
        return () => mql.removeEventListener("change", handler);
    }, [query]);

    return matches;
}

export const useIsMobile = () => useMediaQuery("(max-width: 1023px)");
export const useIsSmall = () => useMediaQuery("(max-width: 639px)");
