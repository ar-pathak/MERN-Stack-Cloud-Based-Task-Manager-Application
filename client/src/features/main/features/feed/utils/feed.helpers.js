export const normalizePagination = (pagination, currentPage, fallbackCount) => {
    const page = Number(pagination?.page || currentPage || 1);
    const pages = Number(pagination?.pages || 1);
    const total = Number(pagination?.total || fallbackCount || 0);
    const hasMore =
        typeof pagination?.hasMore === "boolean"
            ? pagination.hasMore
            : page < pages;

    return {
        page,
        pages,
        total,
        hasMore
    };
};

export const mergeUniquePosts = (items = []) => {
    const byId = new Map();
    items.forEach((post) => {
        if (!post?._id) return;
        byId.set(String(post._id), post);
    });
    return Array.from(byId.values());
};

export const getPostTimelineValue = (post) => {
    if (!post || typeof post !== "object") return "";
    return post.publishedAt || post.createdAt || post.scheduledFor || "";
};

export const formatRelativeTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMinutes < 1) return "now";
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
};

// Post scoring moved to backend - posts now include engagement_score
export const scorePost = (post) => {
  // Use pre-calculated score from backend, fallback to frontend calculation
  if (post.engagement_score !== undefined) {
    return post.engagement_score;
  }

  // Fallback calculation if backend score not available
  const likes = Number(post?.likesCount || 0);
  const comments = Number(post?.commentsCount || 0);
  const reposts = Number(post?.repostsCount || 0);
  const shares = Number(post?.sharesCount || 0);
  const views = Number(post?.viewsCount || 0);
  return likes + comments * 2 + reposts * 3 + shares * 2 + Math.round(views * 0.05);
};

export const getInitial = (user) => {
    const label = user?.name || user?.username || "U";
    return String(label).charAt(0).toUpperCase();
};

export const postMatchesQuery = (post, query) => {
    if (!query) return true;
    const lookup = query.toLowerCase();
    const authorName = `${post?.author?.name || ""} ${post?.author?.username || ""}`.toLowerCase();
    const content = String(post?.content || "").toLowerCase();
    const hashtags = Array.isArray(post?.hashtags) ? post.hashtags.join(" ").toLowerCase() : "";
    return authorName.includes(lookup) || content.includes(lookup) || hashtags.includes(lookup);
};

export const extractTopHashtags = (posts = []) => {
    const counts = {};
    posts.forEach((post) => {
        (post?.hashtags || []).forEach((tag) => {
            const key = String(tag || "").trim().toLowerCase();
            if (!key) return;
            counts[key] = (counts[key] || 0) + 1;
        });
    });

    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7);
};

export const getStoryStats = (groups = []) => {
    const totalStories = groups.reduce(
        (accumulator, group) => accumulator + (group?.stories?.length || 0),
        0
    );

    const unseen = groups.reduce(
        (accumulator, group) => accumulator + Number(group?.unseenCount || 0),
        0
    );

    return { totalStories, unseen };
};
