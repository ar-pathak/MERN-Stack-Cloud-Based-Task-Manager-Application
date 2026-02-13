const FeedEmptyState = ({ activeTab, hasSearch }) => {
    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/55 px-4 py-10 text-center">
            <p className="text-base font-semibold text-slate-200">
                {activeTab === "bookmarks" ? "No saved posts yet" : "No posts found"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
                {hasSearch
                    ? "Try a different search term."
                    : "Create a post or follow more people to grow your feed."}
            </p>
        </div>
    );
};

export default FeedEmptyState;
