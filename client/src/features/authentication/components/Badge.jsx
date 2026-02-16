function Badge({ children }) {
    return (
        <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-3 py-1 text-[0.65rem] tracking-wide text-sky-100">
            {children}
        </span>
    );
}

export default Badge;
