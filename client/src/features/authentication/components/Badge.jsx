function Badge({ children }) {
    return (
        <span className="px-3 py-1 rounded-full border border-indigo-400/50 bg-indigo-500/10 text-[0.65rem] tracking-wide">
            {children}
        </span>
    );
}

export default Badge;