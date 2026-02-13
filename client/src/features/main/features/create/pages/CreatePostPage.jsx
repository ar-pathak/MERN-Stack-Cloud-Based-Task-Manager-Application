import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Loader2, Plus, Send, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router";

import { useAuth } from "../../../../../context/AuthContext";
import { createPost } from "../../../../../service/post.service";
import { createStory } from "../../../../../service/story.service";
import { uploadService } from "../../../../../service/upload.service";
import { searchMentionCandidates } from "../../../../../service/user.service";
import MobileBottomNav from "../../../components/navigation/MobileBottomNav";

const MOBILE_BREAKPOINT = 768;

const extractHashtags = (text = "") =>
    Array.from(
        new Set(
            (String(text).match(/#([a-z0-9_]+)/gi) || []).map((tag) =>
                tag.replace("#", "").toLowerCase()
            )
        )
    );

const getMediaTypeFromMime = (mime = "") => {
    const value = String(mime).toLowerCase();
    if (value.startsWith("video/")) return "video";
    if (value === "image/gif") return "gif";
    if (value.startsWith("image/")) return "image";
    return "document";
};

const CreatePostPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [isMobileViewport, setIsMobileViewport] = useState(() =>
        typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
    );
    const [mode, setMode] = useState("post");
    const [toast, setToast] = useState(null);
    const [publishing, setPublishing] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [content, setContent] = useState("");
    const [visibility, setVisibility] = useState("public");
    const [postFiles, setPostFiles] = useState([]);
    const [selectedMentionIds, setSelectedMentionIds] = useState([]);
    const [mentionCandidates, setMentionCandidates] = useState([]);
    const [showMentions, setShowMentions] = useState(false);

    const [storyCaption, setStoryCaption] = useState("");
    const [storyVisibility, setStoryVisibility] = useState("public");
    const [storyFile, setStoryFile] = useState(null);

    const textareaRef = useRef(null);

    useEffect(() => {
        const onResize = () => setIsMobileViewport(window.innerWidth < MOBILE_BREAKPOINT);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const showToast = (message) => {
        setToast(message);
        setTimeout(() => setToast(null), 2200);
    };

    const previewPostFiles = useMemo(
        () => postFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
        [postFiles]
    );
    const previewStoryUrl = useMemo(
        () => (storyFile ? URL.createObjectURL(storyFile) : null),
        [storyFile]
    );

    useEffect(() => {
        return () => {
            previewPostFiles.forEach((entry) => URL.revokeObjectURL(entry.url));
        };
    }, [previewPostFiles]);

    useEffect(() => {
        return () => {
            if (previewStoryUrl) URL.revokeObjectURL(previewStoryUrl);
        };
    }, [previewStoryUrl]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            const match = String(content).match(/(?:^|\s)@([a-z0-9_]{1,20})$/i);
            if (!match) {
                setMentionCandidates([]);
                setShowMentions(false);
                return;
            }

            try {
                const query = match[1] || "";
                const users = await searchMentionCandidates(query, { limit: 6 });
                setMentionCandidates(users || []);
                setShowMentions((users || []).length > 0);
            } catch {
                setMentionCandidates([]);
                setShowMentions(false);
            }
        }, 180);

        return () => clearTimeout(timer);
    }, [content]);

    const handlePickMention = (candidate) => {
        const username = candidate?.username;
        if (!username) return;

        setContent((previous) => previous.replace(/(?:^|\s)@([a-z0-9_]{1,20})$/i, ` @${username} `));
        setSelectedMentionIds((previous) =>
            previous.includes(candidate._id) ? previous : [...previous, candidate._id]
        );
        setShowMentions(false);
        textareaRef.current?.focus();
    };

    const resetPostForm = () => {
        setContent("");
        setVisibility("public");
        setPostFiles([]);
        setSelectedMentionIds([]);
        setMentionCandidates([]);
        setShowMentions(false);
    };

    const resetStoryForm = () => {
        setStoryCaption("");
        setStoryVisibility("public");
        setStoryFile(null);
    };

    const publishPost = async () => {
        const trimmed = String(content || "").trim();
        if (!trimmed) {
            showToast("Post content is required");
            return;
        }

        setPublishing(true);
        try {
            let media = [];
            if (postFiles.length > 0) {
                setUploading(true);
                const uploaded = await uploadService.uploadMultipleFiles(postFiles);
                media = (uploaded || []).map((item) => ({
                    type: getMediaTypeFromMime(item?.type),
                    url: item?.url,
                    size: item?.size
                }));
            }

            const hasVideo = media.some((item) => item.type === "video");
            const hasImage = media.some((item) => item.type === "image" || item.type === "gif");
            const postType = hasVideo ? "video" : hasImage ? "image" : "text";

            await createPost({
                content: trimmed,
                visibility,
                postType,
                media: media.length ? media : undefined,
                mentions: selectedMentionIds.length ? selectedMentionIds : undefined,
                hashtags: extractHashtags(trimmed)
            });

            resetPostForm();
            showToast("Post published");
            navigate("/main/feed");
        } catch (error) {
            showToast(error?.message || "Failed to publish post");
        } finally {
            setUploading(false);
            setPublishing(false);
        }
    };

    const publishStory = async () => {
        if (!storyFile) {
            showToast("Please choose an image or video for story");
            return;
        }

        setPublishing(true);
        try {
            setUploading(true);
            const uploaded = await uploadService.uploadFile(storyFile);
            const mediaType = String(uploaded?.type || "").startsWith("video/") ? "video" : "image";

            await createStory({
                caption: String(storyCaption || "").trim(),
                visibility: storyVisibility,
                hashtags: extractHashtags(storyCaption),
                media: {
                    type: mediaType,
                    url: uploaded?.url
                }
            });

            resetStoryForm();
            showToast("Story shared");
            navigate("/main/feed");
        } catch (error) {
            showToast(error?.message || "Failed to share story");
        } finally {
            setUploading(false);
            setPublishing(false);
        }
    };

    const hashtags = useMemo(() => extractHashtags(mode === "post" ? content : storyCaption), [mode, content, storyCaption]);
    const profileId = user?._id || user?.id;
    const shouldShowBottomNav = isMobileViewport;

    return (
        <div className={`min-h-full bg-slate-950 ${shouldShowBottomNav ? "pb-[5.25rem]" : "pb-8"}`}>
            <div className="mx-auto w-full max-w-3xl px-3 pt-3 sm:px-4 sm:pt-4">
                <div className="mb-4 rounded-2xl border border-slate-800/70 bg-slate-900/50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Create</p>
                    <h1 className="text-lg font-semibold text-slate-100">Post & Story Studio</h1>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-slate-800/70 bg-slate-900/50 p-2">
                    <button
                        type="button"
                        onClick={() => setMode("post")}
                        className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                            mode === "post"
                                ? "bg-sky-500/20 text-sky-300"
                                : "text-slate-400 hover:bg-slate-800/70"
                        }`}
                    >
                        Create Post
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode("story")}
                        className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                            mode === "story"
                                ? "bg-sky-500/20 text-sky-300"
                                : "text-slate-400 hover:bg-slate-800/70"
                        }`}
                    >
                        Create Story
                    </button>
                </div>

                {mode === "post" && (
                    <section className="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-900/55 p-4">
                        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Visibility
                            </label>
                            <select
                                value={visibility}
                                onChange={(event) => setVisibility(event.target.value)}
                                className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 outline-none"
                            >
                                <option value="public">Public</option>
                                <option value="followers">Followers</option>
                                <option value="private">Private</option>
                                <option value="unlisted">Unlisted</option>
                            </select>
                        </div>

                        <div className="relative">
                            <textarea
                                ref={textareaRef}
                                value={content}
                                onChange={(event) => setContent(event.target.value)}
                                placeholder="Write something... use @mentions and #tags"
                                rows={6}
                                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-3 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-slate-600"
                            />

                            {showMentions && mentionCandidates.length > 0 && (
                                <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-slate-700 bg-slate-900 p-1">
                                    {mentionCandidates.map((candidate) => (
                                        <button
                                            key={candidate?._id}
                                            type="button"
                                            onClick={() => handlePickMention(candidate)}
                                            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-slate-300 hover:bg-slate-800/70"
                                        >
                                            <div className="h-8 w-8 overflow-hidden rounded-full border border-slate-700 bg-slate-800">
                                                {candidate?.avatar ? (
                                                    <img src={candidate.avatar} alt={candidate?.username} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-300">
                                                        {(candidate?.name || candidate?.username || "U").charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm text-slate-100">{candidate?.name || candidate?.username}</p>
                                                <p className="truncate text-xs text-slate-500">@{candidate?.username}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/70">
                            <Image className="h-4 w-4" />
                            Add media
                            <input
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                className="hidden"
                                onChange={(event) => setPostFiles(Array.from(event.target.files || []))}
                            />
                        </label>

                        {previewPostFiles.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {previewPostFiles.map((entry, index) => {
                                    const isVideo = entry.file?.type?.startsWith("video/");
                                    return (
                                        <div key={`${entry.file?.name}-${index}`} className="relative overflow-hidden rounded-xl border border-slate-800">
                                            {isVideo ? (
                                                <video src={entry.url} className="h-32 w-full object-cover" />
                                            ) : (
                                                <img src={entry.url} alt={entry.file?.name} className="h-32 w-full object-cover" />
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setPostFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))}
                                                className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white hover:bg-black/90"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {hashtags.map((tag) => (
                                    <span key={tag} className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-300">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={publishPost}
                            disabled={publishing}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-sky-700/70"
                        >
                            {(publishing || uploading) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Publish Post
                        </button>
                    </section>
                )}

                {mode === "story" && (
                    <section className="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-900/55 p-4">
                        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Story Visibility
                            </label>
                            <select
                                value={storyVisibility}
                                onChange={(event) => setStoryVisibility(event.target.value)}
                                className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 outline-none"
                            >
                                <option value="public">Public</option>
                                <option value="followers">Followers</option>
                            </select>
                        </div>

                        <textarea
                            value={storyCaption}
                            onChange={(event) => setStoryCaption(event.target.value)}
                            placeholder="Story caption with #tags and @mentions"
                            rows={4}
                            className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-3 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-slate-600"
                        />

                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/70">
                            <Plus className="h-4 w-4" />
                            Choose media
                            <input
                                type="file"
                                accept="image/*,video/*"
                                className="hidden"
                                onChange={(event) => setStoryFile(event.target.files?.[0] || null)}
                            />
                        </label>

                        {previewStoryUrl && (
                            <div className="overflow-hidden rounded-xl border border-slate-800">
                                {storyFile?.type?.startsWith("video/") ? (
                                    <video src={previewStoryUrl} controls className="h-64 w-full object-cover" />
                                ) : (
                                    <img src={previewStoryUrl} alt="Story preview" className="h-64 w-full object-cover" />
                                )}
                            </div>
                        )}

                        {hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {hashtags.map((tag) => (
                                    <span key={tag} className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-300">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={publishStory}
                            disabled={publishing}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-700/70"
                        >
                            {(publishing || uploading) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            Share Story
                        </button>
                    </section>
                )}
            </div>

            {shouldShowBottomNav && <MobileBottomNav activeTab="create" profileId={profileId} />}

            {toast && (
                <div
                    className={`fixed right-6 z-50 rounded-xl bg-emerald-500/90 px-4 py-2 text-sm text-white ${
                        shouldShowBottomNav ? "bottom-24 left-6" : "bottom-6"
                    }`}
                >
                    {toast}
                </div>
            )}
        </div>
    );
};

export default CreatePostPage;
