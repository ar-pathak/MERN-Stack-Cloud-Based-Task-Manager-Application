import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import {
    ArrowLeft,
    Heart,
    Loader2,
    MessageSquare,
    Repeat2,
    UserRound
} from "lucide-react";

import { useAuth } from "../../../../../context/AuthContext";
import MobileBottomNav from "../../../components/navigation/MobileBottomNav";
import { getPostById, getPostComments } from "../../../../../service/post.service";

const MOBILE_BREAKPOINT = 768;

const getMediaType = (mediaEntry) => {
    const mediaType = String(mediaEntry?.mediaType || mediaEntry?.type || "").toLowerCase();
    if (mediaType.includes("video")) return "video";
    return "image";
};

const toId = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (typeof value === "object" && value._id) return toId(value._id);
    if (typeof value?.toString === "function") {
        const normalized = value.toString();
        return normalized && normalized !== "[object Object]" ? normalized : "";
    }
    return "";
};

const formatRelativeTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
};

const PostDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isMobileViewport, setIsMobileViewport] = useState(() =>
        typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
    );

    const profileId = toId(user);
    const openedFromNotification = Boolean(location?.state?.fromNotification);
    const shouldShowBottomNav = Boolean(isMobileViewport && profileId);
    const bottomNavTab = openedFromNotification ? "notifications" : "feed";

    const authorId = useMemo(() => toId(post?.author), [post?.author]);

    useEffect(() => {
        const onResize = () => setIsMobileViewport(window.innerWidth < MOBILE_BREAKPOINT);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => {
        let cancelled = false;

        const loadPost = async () => {
            if (!id) return;
            setLoading(true);
            setErrorMessage("");
            try {
                const payload = await getPostById(id);
                if (!cancelled) setPost(payload?.post || payload);
            } catch (error) {
                if (!cancelled) {
                    setErrorMessage(error?.message || "Failed to load post");
                    setPost(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadPost();
        return () => {
            cancelled = true;
        };
    }, [id]);

    useEffect(() => {
        let cancelled = false;

        const loadComments = async () => {
            if (!id) return;
            setCommentsLoading(true);
            try {
                const payload = await getPostComments(id, { page: 1, limit: 20 });
                if (!cancelled) setComments(Array.isArray(payload?.comments) ? payload.comments : []);
            } catch {
                if (!cancelled) setComments([]);
            } finally {
                if (!cancelled) setCommentsLoading(false);
            }
        };

        loadComments();
        return () => {
            cancelled = true;
        };
    }, [id]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            </div>
        );
    }

    if (!post) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 text-center">
                    <p className="text-sm text-slate-300">{errorMessage || "Post not found"}</p>
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="mt-3 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                    >
                        Go back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`min-h-screen bg-slate-950 ${
                shouldShowBottomNav ? "pb-[5.25rem]" : "pb-8"
            }`}
        >
            <div className="mx-auto w-full max-w-3xl px-3 pt-3 sm:px-4 sm:pt-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back
                        </button>

                        <button
                            type="button"
                            onClick={() => authorId && navigate(`/profile/${authorId}`)}
                            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                        >
                            <UserRound className="h-3.5 w-3.5" />
                            @{post?.author?.username || "user"}
                        </button>
                    </div>

                    {post?.content && (
                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">
                            {post.content}
                        </p>
                    )}

                    {(post?.media || []).length > 0 && (
                        <div
                            className={`mt-3 grid gap-2 ${
                                post.media.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
                            }`}
                        >
                            {post.media.map((mediaEntry, index) => (
                                <div
                                    key={`${toId(post)}:${index}`}
                                    className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900"
                                >
                                    {getMediaType(mediaEntry) === "video" ? (
                                        <video
                                            controls
                                            src={mediaEntry?.url}
                                            className="max-h-[26rem] w-full bg-black object-contain"
                                        />
                                    ) : (
                                        <img
                                            src={mediaEntry?.url}
                                            alt="Post media"
                                            className="max-h-[26rem] w-full object-cover"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-1.5 text-xs text-slate-300">
                        <div className="inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2">
                            <Heart className="h-3.5 w-3.5" />
                            {Number(post?.likesCount || 0)}
                        </div>
                        <div className="inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {Number(post?.commentsCount || 0)}
                        </div>
                        <div className="inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2">
                            <Repeat2 className="h-3.5 w-3.5" />
                            {Number(post?.repostsCount || 0)}
                        </div>
                    </div>
                </div>

                <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/55 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Comments
                    </p>

                    {commentsLoading && (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                        </div>
                    )}

                    {!commentsLoading && comments.length === 0 && (
                        <p className="py-4 text-sm text-slate-500">No comments yet.</p>
                    )}

                    {!commentsLoading && comments.length > 0 && (
                        <div className="mt-2 space-y-2">
                            {comments.map((comment) => (
                                <div
                                    key={toId(comment)}
                                    className="rounded-lg border border-slate-800 bg-slate-900/65 p-2.5"
                                >
                                    <p className="text-xs text-slate-400">
                                        @{comment?.author?.username || "user"} -{" "}
                                        {formatRelativeTime(comment?.createdAt)}
                                    </p>
                                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">
                                        {comment?.content}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {shouldShowBottomNav && (
                <MobileBottomNav activeTab={bottomNavTab} profileId={profileId} />
            )}
        </div>
    );
};

export default PostDetailPage;
