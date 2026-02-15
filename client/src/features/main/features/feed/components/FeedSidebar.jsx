const FeedSidebar = ({  topHashtags, onPickTag }) => {
    return (
        <aside className="hidden lg:block">
            <div className="sticky top-4 space-y-3">

                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/55 p-4">
                    <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                        Trending Tags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {topHashtags.length > 0 ? (
                            topHashtags.map(([tag, count]) => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => onPickTag(tag)}
                                    className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 hover:border-slate-600"
                                >
                                    #{tag} - {count}
                                </button>
                            ))
                        ) : (
                            <p className="text-xs text-slate-500">
                                Create posts with hashtags to see trends.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default FeedSidebar;
