const toSafeInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return parsed;
};

const parsePaginationQuery = (query = {}, options = {}) => {
    const defaultLimit = Math.max(1, Number(options.defaultLimit) || 20);
    const maxLimit = Math.max(defaultLimit, Number(options.maxLimit) || 100);
    const hasPage = Object.prototype.hasOwnProperty.call(query || {}, "page");
    const hasLimit = Object.prototype.hasOwnProperty.call(query || {}, "limit");
    const enabled = hasPage || hasLimit;

    const page = Math.max(1, toSafeInteger(query?.page, 1));
    const limit = Math.min(
        maxLimit,
        Math.max(1, toSafeInteger(query?.limit, defaultLimit))
    );

    return {
        enabled,
        page,
        limit,
        skip: (page - 1) * limit
    };
};

const toPaginationMeta = ({ page = 1, limit = 20, total = 0 }) => {
    const safeLimit = Math.max(1, Number(limit) || 20);
    const safePage = Math.max(1, Number(page) || 1);
    const safeTotal = Math.max(0, Number(total) || 0);
    const pages = Math.max(1, Math.ceil(safeTotal / safeLimit));

    return {
        page: safePage,
        limit: safeLimit,
        total: safeTotal,
        pages,
        hasMore: safePage < pages
    };
};

module.exports = {
    parsePaginationQuery,
    toPaginationMeta
};
