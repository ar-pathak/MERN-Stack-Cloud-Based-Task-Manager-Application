import { Sparkles } from "lucide-react";

const PostMediaPreview = ({ post, compact = false }) => {
    const media = Array.isArray(post?.media) ? post.media : [];
    if (!media.length) return null;

    const first = media[0];
    const isVideo = String(first?.type || "").toLowerCase() === "video";

    if (media.length === 1) {
        return (
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
                {isVideo ? (
                    <video
                        src={first?.url}
                        controls
                        className={`${compact ? "max-h-64" : "max-h-[32rem]"} w-full object-cover`}
                    />
                ) : (
                    <img
                        src={first?.url}
                        alt={post?.content || "Post media"}
                        className={`${compact ? "max-h-64" : "max-h-[32rem]"} w-full object-cover`}
                    />
                )}
            </div>
        );
    }

    const gridCount = Math.min(media.length, 4);

    return (
        <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
            {media.slice(0, 4).map((item, index) => {
                const itemIsVideo = String(item?.type || "").toLowerCase() === "video";
                const isLastOverlay = index === 3 && media.length > 4;

                return (
                    <div
                        key={`${item?.url}-${index}`}
                        className={`relative ${gridCount === 3 && index === 0 ? "col-span-2" : ""}`}
                    >
                        {itemIsVideo ? (
                            <video src={item?.url} className="h-32 w-full object-cover sm:h-44" />
                        ) : (
                            <img
                                src={item?.url}
                                alt={post?.content || "Post media"}
                                className="h-32 w-full object-cover sm:h-44"
                            />
                        )}
                        {itemIsVideo && (
                            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
                                <Sparkles className="h-3 w-3" />
                                Video
                            </span>
                        )}
                        {isLastOverlay && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                                <span className="rounded-full bg-black/70 px-3 py-1 text-sm font-semibold text-white">
                                    +{media.length - 4}
                                </span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default PostMediaPreview;
