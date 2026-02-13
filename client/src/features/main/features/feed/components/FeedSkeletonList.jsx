const FeedSkeletonList = () => {
    return (
        <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
                <div
                    key={index}
                    className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
                >
                    <div className="mb-3 h-10 w-56 rounded bg-slate-800/80" />
                    <div className="mb-2 h-3 w-full rounded bg-slate-800/80" />
                    <div className="mb-4 h-3 w-4/5 rounded bg-slate-800/80" />
                    <div className="h-40 rounded-xl bg-slate-800/70" />
                </div>
            ))}
        </div>
    );
};

export default FeedSkeletonList;
