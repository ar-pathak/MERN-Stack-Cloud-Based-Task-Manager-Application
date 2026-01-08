import { useEffect, useRef, useState } from "react";

export const useScrollDirection = (ref) => {
    const lastScrollY = useRef(0);
    const [direction, setDirection] = useState("up");

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const handleScroll = () => {
            const currentY = el.scrollTop;
            
            // IGNORE tiny movements (threshold) to prevent jitter
            if (Math.abs(currentY - lastScrollY.current) < 10) return;

            // Determine direction
            if (currentY > lastScrollY.current) {
                setDirection("down");
            } else {
                // setDirection("up");
            }

            lastScrollY.current = currentY;
        };

        el.addEventListener("scroll", handleScroll);
        return () => el.removeEventListener("scroll", handleScroll);
    }, [ref]);

    return direction;
};