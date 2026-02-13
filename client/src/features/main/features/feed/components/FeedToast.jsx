const FeedToast = ({ toast, mobile }) => {
    if (!toast) return null;

    return (
        <div
            className={`fixed right-5 z-50 rounded-xl px-4 py-2 text-sm text-white ${
                toast.kind === "error" ? "bg-rose-500/90" : "bg-emerald-500/90"
            } ${mobile ? "bottom-24 left-5 sm:left-auto" : "bottom-5"}`}
        >
            {toast.message}
        </div>
    );
};

export default FeedToast;
