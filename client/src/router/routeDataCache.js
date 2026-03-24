import { getNotifications } from "../service/notification.service";
import { getOverviewActivity } from "../service/overview.service";
import { getUserFeed } from "../service/post.service";
import { getUserById } from "../service/user.service";

const CACHE_TTL = 15000;

const createTimedResource = ({ keyFromArgs, loadData }) => {
    const valueCache = new Map();
    const timestampCache = new Map();
    const inflightCache = new Map();

    const getKey = (...args) => keyFromArgs(...args);

    const isFresh = (key) =>
        valueCache.has(key) &&
        Date.now() - Number(timestampCache.get(key) || 0) < CACHE_TTL;

    const load = async (...args) => {
        const key = getKey(...args);

        if (inflightCache.has(key)) {
            return inflightCache.get(key);
        }

        if (isFresh(key)) {
            return valueCache.get(key);
        }

        const request = Promise.resolve()
            .then(() => loadData(...args))
            .then((value) => {
                valueCache.set(key, value);
                timestampCache.set(key, Date.now());
                return value;
            })
            .catch((error) => {
                if (valueCache.has(key)) {
                    return valueCache.get(key);
                }
                // FIX: Returning null instead of throwing an error so the router doesn't crash 
                // into an ErrorBoundary before ProtectedRoute can handle the auth redirect.
                console.warn(`Loader fetch failed for key ${key}, passing null to allow ProtectedRoute to handle navigation.`);
                return null;
            })
            .finally(() => {
                inflightCache.delete(key);
            });

        inflightCache.set(key, request);
        return request;
    };

    return {
        load,
        preload: (...args) => {
            void load(...args);
        }
    };
};

const normalizeFeedPayload = (payload) => ({
    posts: Array.isArray(payload?.posts) ? payload.posts : [],
    pagination: payload?.pagination || null
});

const normalizeNotificationsPayload = (payload) => ({
    notifications: Array.isArray(payload?.notifications)
        ? payload.notifications
        : Array.isArray(payload)
            ? payload
            : [],
    unreadCount: Number(payload?.unreadCount || 0)
});

const feedRouteResource = createTimedResource({
    keyFromArgs: (params = {}) => `feed:${JSON.stringify({ page: 1, limit: 20, ...params })}`,
    loadData: async (params = {}) => {
        const payload = await getUserFeed({ page: 1, limit: 20, ...params });
        return normalizeFeedPayload(payload);
    }
});

const notificationsRouteResource = createTimedResource({
    keyFromArgs: (params = {}) => `notifications:${JSON.stringify({ limit: 50, ...params })}`,
    loadData: async (params = {}) => {
        const payload = await getNotifications({ limit: 50, ...params });
        return normalizeNotificationsPayload(payload);
    }
});

const overviewRouteResource = createTimedResource({
    keyFromArgs: () => "overview",
    loadData: async () => {
        const payload = await getOverviewActivity();
        return Array.isArray(payload) ? payload : [];
    }
});

const profileRouteResource = createTimedResource({
    keyFromArgs: (id = "") => `profile:${String(id || "")}`,
    loadData: async (id) => {
        if (!id) return null;
        const payload = await getUserById(id);
        return payload?.user || payload || null;
    }
});

export const profileLoader = async ({ params }) => {
    const id = params?.id;
    if (!id) return null;
    return profileRouteResource.load(id);
};

export const notificationsLoader = async () =>
    notificationsRouteResource.load({ limit: 50 });

export const overviewLoader = async () => overviewRouteResource.load();

export const feedLoader = async () =>
    feedRouteResource.load({ page: 1, limit: 20 });

const resolveProfileIdFromPath = (path = "", explicitProfileId = "") => {
    if (explicitProfileId) return String(explicitProfileId);

    const match = String(path || "").match(/\/profile\/([^/?#]+)/i);
    return match?.[1] || "";
};

export const preloadMainRouteData = (path, options = {}) => {
    const normalizedPath = String(path || "").trim().toLowerCase();
    if (!normalizedPath) return;

    if (normalizedPath === "/main") {
        void Promise.allSettled([
            import("../features/main/features/overview/pages/OverviewLayout.jsx"),
            overviewRouteResource.load()
        ]);
        return;
    }

    if (normalizedPath.startsWith("/main/feed")) {
        void Promise.allSettled([
            import("../features/main/features/feed/pages/FeedPage.jsx"),
            feedRouteResource.load({ page: 1, limit: 20 })
        ]);
        return;
    }

    if (normalizedPath.startsWith("/main/notifications")) {
        void Promise.allSettled([
            import("../features/main/features/notifications/pages/NotificationsPage.jsx"),
            notificationsRouteResource.load({ limit: 50 })
        ]);
        return;
    }

    if (normalizedPath.startsWith("/main/create")) {
        void import("../features/main/features/create/pages/CreatePostPage.jsx");
        return;
    }

    if (normalizedPath.includes("/profile/")) {
        const profileId = resolveProfileIdFromPath(path, options.profileId);
        const preloadTasks = [import("../features/main/features/profile/UserProfile.jsx")];

        if (profileId) {
            preloadTasks.push(profileRouteResource.load(profileId));
        }

        void Promise.allSettled(preloadTasks);
    }
};