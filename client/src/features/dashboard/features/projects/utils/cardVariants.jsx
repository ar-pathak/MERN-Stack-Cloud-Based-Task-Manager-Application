
export const cardVariants = {
    initial: { opacity: 0, y: 18, scale: 0.98 },
    animate: (i) => ({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { delay: 0.04 * i, duration: 0.35, ease: "easeOut" },
    }),
    hover: {
        y: -4,
        scale: 1.01,
        boxShadow:
            "0 18px 45px rgba(15,23,42,0.40), 0 0 0 1px rgba(148,163,184,0.25)",
    },
};