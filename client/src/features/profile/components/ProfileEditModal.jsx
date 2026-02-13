import { useEffect, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { uploadService } from "../../../service/upload.service";

const ProfileEditModal = ({ open, profile, saving, onClose, onSave }) => {
    const [form, setForm] = useState({
        name: "",
        bio: "",
        headline: "",
        location: "",
        website: "",
        avatar: "",
        coverImage: "",
        isPrivate: false
    });
    const [uploadState, setUploadState] = useState({
        avatar: { loading: false, progress: 0, error: "" },
        coverImage: { loading: false, progress: 0, error: "" }
    });

    useEffect(() => {
        if (!open || !profile) return;
        setForm({
            name: profile?.name || "",
            bio: profile?.bio || "",
            headline: profile?.headline || "",
            location: profile?.location || "",
            website: profile?.website || "",
            avatar: profile?.avatar || "",
            coverImage: profile?.coverImage || "",
            isPrivate: Boolean(profile?.isPrivate)
        });
        setUploadState({
            avatar: { loading: false, progress: 0, error: "" },
            coverImage: { loading: false, progress: 0, error: "" }
        });
    }, [open, profile]);

    if (!open) return null;

    const update = (field, value) => {
        setForm((previous) => ({ ...previous, [field]: value }));
    };

    const updateUpload = (field, patch) => {
        setUploadState((previous) => ({
            ...previous,
            [field]: { ...previous[field], ...patch }
        }));
    };

    const handleImageUpload = async (field, event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        if (!String(file.type || "").startsWith("image/")) {
            updateUpload(field, { error: "Please select an image file" });
            return;
        }

        updateUpload(field, { loading: true, progress: 0, error: "" });
        try {
            const uploaded = await uploadService.uploadFile(file, (progress) => {
                updateUpload(field, { progress: Number(progress || 0) });
            });

            const url = uploaded?.url || "";
            if (!url) throw new Error("Upload response missing image URL");
            update(field, url);
            updateUpload(field, { progress: 100 });
        } catch (error) {
            updateUpload(field, { error: error?.message || "Image upload failed" });
        } finally {
            updateUpload(field, { loading: false });
        }
    };

    const isUploading = uploadState.avatar.loading || uploadState.coverImage.loading;
    const isBusy = saving || isUploading;

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isUploading) return;
        onSave?.(form);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-4">
            <div className="w-full max-w-2xl rounded-t-2xl border border-slate-800 bg-slate-950 shadow-2xl sm:rounded-2xl sm:max-h-[90dvh] sm:overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                    <h3 className="text-sm font-semibold text-slate-100">Edit Profile</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isBusy}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex max-h-[calc(100dvh-4.25rem)] flex-col sm:max-h-[calc(90dvh-3.5rem)]">
                    <div className="grid gap-3 overflow-y-auto p-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Avatar</p>
                            <div className="mt-2 flex items-center gap-3">
                                <div className="h-16 w-16 overflow-hidden rounded-full border border-slate-700 bg-slate-900">
                                    {form.avatar ? (
                                        <img src={form.avatar} alt="Avatar preview" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-slate-500">
                                            <ImagePlus className="h-5 w-5" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(event) => handleImageUpload("avatar", event)}
                                        disabled={isBusy}
                                        className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 file:mr-2 file:rounded-md file:border-0 file:bg-sky-500/20 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-sky-200"
                                    />
                                    {uploadState.avatar.loading && (
                                        <p className="text-[11px] text-sky-300">Uploading {uploadState.avatar.progress}%</p>
                                    )}
                                    {uploadState.avatar.error && (
                                        <p className="text-[11px] text-rose-300">{uploadState.avatar.error}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Cover Image</p>
                            <div className="mt-2 space-y-2">
                                <div className="h-20 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
                                    {form.coverImage ? (
                                        <img src={form.coverImage} alt="Cover preview" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-slate-500">
                                            <ImagePlus className="h-5 w-5" />
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(event) => handleImageUpload("coverImage", event)}
                                    disabled={isBusy}
                                    className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 file:mr-2 file:rounded-md file:border-0 file:bg-sky-500/20 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-sky-200"
                                />
                                {uploadState.coverImage.loading && (
                                    <p className="text-[11px] text-sky-300">Uploading {uploadState.coverImage.progress}%</p>
                                )}
                                {uploadState.coverImage.error && (
                                    <p className="text-[11px] text-rose-300">{uploadState.coverImage.error}</p>
                                )}
                            </div>
                        </div>

                        <label className="space-y-1.5 sm:col-span-2">
                        <span className="text-xs font-medium text-slate-400">Name</span>
                        <input
                            value={form.name}
                            onChange={(event) => update("name", event.target.value)}
                            maxLength={50}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500/60"
                        />
                        </label>

                        <label className="space-y-1.5 sm:col-span-2">
                        <span className="text-xs font-medium text-slate-400">Bio</span>
                        <textarea
                            value={form.bio}
                            onChange={(event) => update("bio", event.target.value)}
                            maxLength={160}
                            rows={3}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500/60"
                        />
                        </label>

                        <label className="space-y-1.5 sm:col-span-2">
                        <span className="text-xs font-medium text-slate-400">Headline</span>
                        <input
                            value={form.headline}
                            onChange={(event) => update("headline", event.target.value)}
                            maxLength={80}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500/60"
                        />
                        </label>

                        <label className="space-y-1.5">
                        <span className="text-xs font-medium text-slate-400">Location</span>
                        <input
                            value={form.location}
                            onChange={(event) => update("location", event.target.value)}
                            maxLength={80}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500/60"
                        />
                        </label>

                        <label className="space-y-1.5">
                        <span className="text-xs font-medium text-slate-400">Website URL</span>
                        <input
                            value={form.website}
                            onChange={(event) => update("website", event.target.value)}
                            placeholder="https://example.com"
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500/60"
                        />
                        </label>

                        <label className="space-y-1.5">
                        <span className="text-xs font-medium text-slate-400">Avatar URL</span>
                        <input
                            value={form.avatar}
                            onChange={(event) => update("avatar", event.target.value)}
                            placeholder="https://..."
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500/60"
                        />
                        </label>

                        <label className="space-y-1.5">
                        <span className="text-xs font-medium text-slate-400">Cover Image URL</span>
                        <input
                            value={form.coverImage}
                            onChange={(event) => update("coverImage", event.target.value)}
                            placeholder="https://..."
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500/60"
                        />
                        </label>

                        <label className="inline-flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 sm:col-span-2">
                        <input
                            type="checkbox"
                            checked={form.isPrivate}
                            onChange={(event) => update("isPrivate", event.target.checked)}
                            className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500/50"
                        />
                        <span className="text-sm text-slate-300">Private account</span>
                        </label>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-4 py-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isBusy}
                            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isBusy}
                            className="inline-flex items-center gap-2 rounded-lg border border-sky-500/60 bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-200 hover:bg-sky-500/30 disabled:opacity-50"
                        >
                            {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileEditModal;
