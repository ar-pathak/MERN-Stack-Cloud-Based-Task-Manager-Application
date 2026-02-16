import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
    ArrowLeft,
    Bell,
    Loader2,
    Lock,
    ShieldCheck,
    UserRound,
    UserX
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "../../context/AuthContext";
import MobileBottomNav from "../main/components/navigation/MobileBottomNav";
import { sendVerificationEmail } from "../../service/auth.service";
import {
    getBlockedUsers,
    getMyProfile,
    unblockUser,
    updatePreferences,
    updateProfile
} from "../../service/user.service";

const MOBILE_BREAKPOINT = 768;

const ToggleRow = ({ label, description, checked, onChange, disabled }) => (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-3">
        <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-100">{label}</p>
            <p className="text-xs text-slate-500">{description}</p>
        </div>
        <button
            type="button"
            onClick={onChange}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-60 ${
                checked ? "bg-sky-500" : "bg-slate-700"
            }`}
        >
            <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    checked ? "translate-x-5" : "translate-x-0.5"
                }`}
            />
        </button>
    </div>
);

const SettingsPage = () => {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();

    const [isMobileViewport, setIsMobileViewport] = useState(
        typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
    );
    const [loading, setLoading] = useState(true);
    const [savingKey, setSavingKey] = useState("");
    const [emailVerified, setEmailVerified] = useState(Boolean(user?.emailVerified));

    const [isPrivate, setIsPrivate] = useState(false);
    const [preferences, setPreferences] = useState({
        notifications: {
            email: true,
            push: true,
            follows: true,
            comments: true,
            likes: true
        },
        privacy: {
            showEmail: false,
            showOnlineStatus: true,
            allowTagging: true,
            allowMentions: true,
            disablePublicMessages: false
        }
    });

    const [blockedUsers, setBlockedUsers] = useState([]);
    const [blockedPagination, setBlockedPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 1,
        hasMore: false
    });
    const [blockedLoading, setBlockedLoading] = useState(false);
    const [unblockingId, setUnblockingId] = useState("");

    const profileId = user?._id || user?.id;

    useEffect(() => {
        const onResize = () => setIsMobileViewport(window.innerWidth < MOBILE_BREAKPOINT);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => {
        setEmailVerified(Boolean(user?.emailVerified));
    }, [user?.emailVerified]);

    const loadBlockedUsers = useCallback(async (page = 1, append = false) => {
        setBlockedLoading(true);
        try {
            const payload = await getBlockedUsers({ page, limit: 20 });
            const users = Array.isArray(payload?.users) ? payload.users : [];
            setBlockedUsers((previous) => {
                const merged = append ? [...previous, ...users] : users;
                const seen = new Set();

                return merged.filter((entry) => {
                    const id = String(entry?._id || "");
                    if (!id || seen.has(id)) return false;
                    seen.add(id);
                    return true;
                });
            });
            setBlockedPagination({
                page: Number(payload?.pagination?.page || page),
                limit: Number(payload?.pagination?.limit || 20),
                total: Number(payload?.pagination?.total || users.length),
                pages: Number(payload?.pagination?.pages || 1),
                hasMore: Boolean(payload?.pagination?.hasMore)
            });
        } catch (error) {
            toast.error(error?.message || "Failed to load blocked users");
        } finally {
            setBlockedLoading(false);
        }
    }, []);

    const loadSettings = useCallback(async () => {
        setLoading(true);
        try {
            const payload = await getMyProfile();
            const profile = payload?.user || payload;
            const nextPreferences = profile?.preferences || {};

            setEmailVerified(Boolean(profile?.emailVerified));
            setIsPrivate(Boolean(profile?.isPrivate));
            setPreferences({
                notifications: {
                    email: Boolean(nextPreferences?.notifications?.email ?? true),
                    push: Boolean(nextPreferences?.notifications?.push ?? true),
                    follows: Boolean(nextPreferences?.notifications?.follows ?? true),
                    comments: Boolean(nextPreferences?.notifications?.comments ?? true),
                    likes: Boolean(nextPreferences?.notifications?.likes ?? true)
                },
                privacy: {
                    showEmail: Boolean(nextPreferences?.privacy?.showEmail ?? false),
                    showOnlineStatus: Boolean(nextPreferences?.privacy?.showOnlineStatus ?? true),
                    allowTagging: Boolean(nextPreferences?.privacy?.allowTagging ?? true),
                    allowMentions: Boolean(nextPreferences?.privacy?.allowMentions ?? true),
                    disablePublicMessages: Boolean(nextPreferences?.privacy?.disablePublicMessages ?? false)
                }
            });

            await loadBlockedUsers(1, false);
        } catch (error) {
            toast.error(error?.message || "Failed to load settings");
        } finally {
            setLoading(false);
        }
    }, [loadBlockedUsers]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const updatePrivateProfile = async () => {
        const nextValue = !isPrivate;

        if (!nextValue && isPrivate) {
            const shouldProceed = window.confirm(
                "Switching to Public will automatically approve all pending follow requests. Continue?"
            );
            if (!shouldProceed) return;
        }

        setSavingKey("profile.private");
        try {
            const result = await updateProfile({ isPrivate: nextValue });
            const updatedProfile = result?.user || result;
            const autoApproved = Number(result?.privacySync?.autoApprovedFollowRequests || 0);

            setIsPrivate(Boolean(updatedProfile?.isPrivate ?? nextValue));
            await refreshUser?.();

            if (nextValue) {
                toast.success("Private account enabled");
            } else if (autoApproved > 0) {
                toast.success(
                    `Public account enabled. ${autoApproved} follow request${autoApproved === 1 ? "" : "s"} auto-approved.`
                );
            } else {
                toast.success("Public account enabled");
            }
        } catch (error) {
            toast.error(error?.message || "Failed to update privacy");
        } finally {
            setSavingKey("");
        }
    };

    const requestVerificationEmail = async () => {
        if (emailVerified) return;

        setSavingKey("emailVerification");
        try {
            const result = await sendVerificationEmail();
            toast.success(result?.message || "Verification email sent. Please check your inbox.");
        } catch (error) {
            toast.error(error?.message || "Failed to send verification email");
        } finally {
            setSavingKey("");
        }
    };

    const updateNotificationPreference = async (key) => {
        const currentValue = Boolean(preferences?.notifications?.[key]);
        const nextValue = !currentValue;
        const nextNotifications = {
            ...(preferences?.notifications || {}),
            [key]: nextValue
        };

        setSavingKey(`notifications.${key}`);
        try {
            await updatePreferences({ notifications: { [key]: nextValue } });
            setPreferences((previous) => ({ ...previous, notifications: nextNotifications }));
            await refreshUser?.();
        } catch (error) {
            toast.error(error?.message || "Failed to update notification setting");
        } finally {
            setSavingKey("");
        }
    };

    const updatePrivacyPreference = async (key) => {
        const currentValue = Boolean(preferences?.privacy?.[key]);
        const nextValue = !currentValue;
        const nextPrivacy = {
            ...(preferences?.privacy || {}),
            [key]: nextValue
        };

        setSavingKey(`privacy.${key}`);
        try {
            await updatePreferences({ privacy: { [key]: nextValue } });
            setPreferences((previous) => ({ ...previous, privacy: nextPrivacy }));
            await refreshUser?.();
        } catch (error) {
            toast.error(error?.message || "Failed to update privacy setting");
        } finally {
            setSavingKey("");
        }
    };

    const handleUnblock = async (targetUserId) => {
        if (!targetUserId || unblockingId === targetUserId) return;
        setUnblockingId(targetUserId);
        try {
            await unblockUser(targetUserId);
            setBlockedUsers((previous) => previous.filter((entry) => String(entry?._id) !== String(targetUserId)));
            setBlockedPagination((previous) => ({
                ...previous,
                total: Math.max(0, Number(previous.total || 0) - 1)
            }));
            toast.success("User unblocked");
        } catch (error) {
            toast.error(error?.message || "Failed to unblock user");
        } finally {
            setUnblockingId("");
        }
    };

    const loadingState = useMemo(
        () => ({
            private: savingKey === "profile.private",
            disablePublicMessages: savingKey === "privacy.disablePublicMessages",
            showEmail: savingKey === "privacy.showEmail",
            allowMentions: savingKey === "privacy.allowMentions",
            allowTagging: savingKey === "privacy.allowTagging",
            showOnlineStatus: savingKey === "privacy.showOnlineStatus",
            follows: savingKey === "notifications.follows",
            comments: savingKey === "notifications.comments",
            likes: savingKey === "notifications.likes",
            push: savingKey === "notifications.push",
            email: savingKey === "notifications.email",
            emailVerification: savingKey === "emailVerification"
        }),
        [savingKey]
    );

    if (loading) {
        return (
            <div className="flex h-full min-h-[60vh] items-center justify-center bg-slate-950">
                <Loader2 className="h-7 w-7 animate-spin text-sky-500" />
            </div>
        );
    }

    return (
        <div className={`min-h-full bg-slate-950 ${isMobileViewport ? "pb-[5.25rem]" : "pb-8"}`}>
            <div className="mx-auto w-full max-w-4xl px-3 pt-3 sm:px-4 sm:pt-4">
                <div className="mb-4 rounded-2xl border border-slate-800/80 bg-slate-900/65 p-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back
                    </button>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Settings</p>
                    <h1 className="text-xl font-bold text-slate-100">Account, Privacy & Safety</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        Control who can follow, message, and interact with your profile.
                    </p>
                </div>

                <section className="mb-4 rounded-2xl border border-slate-800/70 bg-slate-900/55 p-4">
                    <div className="mb-3 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-sky-300" />
                        <h2 className="text-sm font-semibold text-slate-100">Email Verification</h2>
                    </div>

                    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-slate-100">
                                Status: {emailVerified ? "Verified" : "Not Verified"}
                            </p>
                            <p className="text-xs text-slate-500">
                                {emailVerified
                                    ? "Your email is confirmed."
                                    : "Verify your email to secure your account and receive critical alerts."}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={requestVerificationEmail}
                            disabled={emailVerified || loadingState.emailVerification}
                            className={`inline-flex min-w-[11rem] items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                emailVerified
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                    : "border-sky-500/35 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20"
                            } disabled:opacity-60`}
                        >
                            {loadingState.emailVerification
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : emailVerified
                                    ? "Email Verified"
                                    : "Send Verification Link"}
                        </button>
                    </div>
                </section>

                <section className="mb-4 rounded-2xl border border-slate-800/70 bg-slate-900/55 p-4">
                    <div className="mb-3 flex items-center gap-2">
                        <Lock className="h-4 w-4 text-sky-300" />
                        <h2 className="text-sm font-semibold text-slate-100">Privacy Controls</h2>
                    </div>
                    <div className="space-y-2.5">
                        <ToggleRow
                            label="Private account"
                            description="Only approved followers can see follower-only content."
                            checked={isPrivate}
                            onChange={updatePrivateProfile}
                            disabled={loadingState.private}
                        />
                        <ToggleRow
                            label="Disable public messages"
                            description="Only followers can message you from your profile."
                            checked={Boolean(preferences?.privacy?.disablePublicMessages)}
                            onChange={() => updatePrivacyPreference("disablePublicMessages")}
                            disabled={loadingState.disablePublicMessages}
                        />
                        <ToggleRow
                            label="Show email on profile"
                            description="Allow people to see your email on public profile."
                            checked={Boolean(preferences?.privacy?.showEmail)}
                            onChange={() => updatePrivacyPreference("showEmail")}
                            disabled={loadingState.showEmail}
                        />
                        <ToggleRow
                            label="Allow mentions"
                            description="Let others mention you in posts and chats."
                            checked={Boolean(preferences?.privacy?.allowMentions)}
                            onChange={() => updatePrivacyPreference("allowMentions")}
                            disabled={loadingState.allowMentions}
                        />
                        <ToggleRow
                            label="Allow tagging"
                            description="Allow people to tag your profile."
                            checked={Boolean(preferences?.privacy?.allowTagging)}
                            onChange={() => updatePrivacyPreference("allowTagging")}
                            disabled={loadingState.allowTagging}
                        />
                        <ToggleRow
                            label="Show online status"
                            description="Display online presence in chat and profile."
                            checked={Boolean(preferences?.privacy?.showOnlineStatus)}
                            onChange={() => updatePrivacyPreference("showOnlineStatus")}
                            disabled={loadingState.showOnlineStatus}
                        />
                    </div>
                </section>

                <section className="mb-4 rounded-2xl border border-slate-800/70 bg-slate-900/55 p-4">
                    <div className="mb-3 flex items-center gap-2">
                        <Bell className="h-4 w-4 text-sky-300" />
                        <h2 className="text-sm font-semibold text-slate-100">Notification Controls</h2>
                    </div>
                    <div className="space-y-2.5">
                        <ToggleRow
                            label="Follow notifications"
                            description="Get updates for follows, requests, and approvals."
                            checked={Boolean(preferences?.notifications?.follows)}
                            onChange={() => updateNotificationPreference("follows")}
                            disabled={loadingState.follows}
                        />
                        <ToggleRow
                            label="Comments notifications"
                            description="Receive notifications when someone comments."
                            checked={Boolean(preferences?.notifications?.comments)}
                            onChange={() => updateNotificationPreference("comments")}
                            disabled={loadingState.comments}
                        />
                        <ToggleRow
                            label="Likes notifications"
                            description="Receive notifications for likes and reactions."
                            checked={Boolean(preferences?.notifications?.likes)}
                            onChange={() => updateNotificationPreference("likes")}
                            disabled={loadingState.likes}
                        />
                        <ToggleRow
                            label="Push notifications"
                            description="Allow realtime push notifications on supported devices."
                            checked={Boolean(preferences?.notifications?.push)}
                            onChange={() => updateNotificationPreference("push")}
                            disabled={loadingState.push}
                        />
                        <ToggleRow
                            label="Email notifications"
                            description="Receive email summaries and important account alerts."
                            checked={Boolean(preferences?.notifications?.email)}
                            onChange={() => updateNotificationPreference("email")}
                            disabled={loadingState.email}
                        />
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-800/70 bg-slate-900/55 p-4">
                    <div className="mb-3 flex items-center gap-2">
                        <UserX className="h-4 w-4 text-rose-300" />
                        <h2 className="text-sm font-semibold text-slate-100">Blocked Users</h2>
                    </div>

                    {blockedLoading && blockedUsers.length === 0 ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                        </div>
                    ) : blockedUsers.length === 0 ? (
                        <p className="py-6 text-center text-sm text-slate-500">
                            No blocked users.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {blockedUsers.map((entry) => {
                                const entryId = String(entry?._id || "");
                                const loadingUnblock = unblockingId === entryId;

                                return (
                                    <div
                                        key={entryId}
                                        className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2.5"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/profile/${entryId}`)}
                                            className="flex min-w-0 items-center gap-2 text-left"
                                        >
                                            <div className="h-9 w-9 overflow-hidden rounded-full border border-slate-700 bg-slate-800">
                                                {entry?.avatar ? (
                                                    <img src={entry.avatar} alt={entry?.name || "User"} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-slate-500">
                                                        <UserRound className="h-4 w-4" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-100">
                                                    {entry?.name || entry?.username || "User"}
                                                </p>
                                                <p className="truncate text-xs text-slate-500">
                                                    @{entry?.username || "user"}
                                                </p>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleUnblock(entryId)}
                                            disabled={loadingUnblock}
                                            className="inline-flex min-w-[5.8rem] items-center justify-center rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60"
                                        >
                                            {loadingUnblock ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Unblock"}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {Boolean(blockedPagination?.hasMore) && (
                        <button
                            type="button"
                            onClick={() => loadBlockedUsers(Number(blockedPagination?.page || 1) + 1, true)}
                            disabled={blockedLoading}
                            className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-60"
                        >
                            {blockedLoading ? "Loading..." : "Load more blocked users"}
                        </button>
                    )}
                </section>
            </div>

            {isMobileViewport && <MobileBottomNav activeTab="me" profileId={profileId} />}
        </div>
    );
};

export default SettingsPage;
