const {
    parsePaginationQuery,
    toPaginationMeta
} = require("../../src/helpers/paginationHelper");

test("parsePaginationQuery returns disabled defaults when query is omitted", () => {
    expect(parsePaginationQuery()).toEqual({
        enabled: false,
        page: 1,
        limit: 20,
        skip: 0
    });
});

test("parsePaginationQuery clamps invalid values and applies option fallbacks", () => {
    const result = parsePaginationQuery(
        {
            page: "0",
            limit: "999"
        },
        {
            defaultLimit: "bad",
            maxLimit: "40"
        }
    );

    expect(result).toEqual({
        enabled: true,
        page: 1,
        limit: 40,
        skip: 0
    });
});

test("parsePaginationQuery keeps valid page/limit values and computes skip", () => {
    const result = parsePaginationQuery(
        {
            page: "3",
            limit: "25"
        },
        {
            defaultLimit: 10,
            maxLimit: 50
        }
    );

    expect(result).toEqual({
        enabled: true,
        page: 3,
        limit: 25,
        skip: 50
    });
});

test("parsePaginationQuery enables pagination when only limit is provided", () => {
    const result = parsePaginationQuery(
        { limit: "NaN" },
        {
            defaultLimit: 0,
            maxLimit: 0
        }
    );

    expect(result).toEqual({
        enabled: true,
        page: 1,
        limit: 20,
        skip: 0
    });
});

test("toPaginationMeta computes total pages and hasMore for valid values", () => {
    expect(toPaginationMeta({
        page: 2,
        limit: 5,
        total: 11
    })).toEqual({
        page: 2,
        limit: 5,
        total: 11,
        pages: 3,
        hasMore: true
    });
});

test("toPaginationMeta sanitizes missing and invalid values", () => {
    expect(toPaginationMeta()).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        pages: 1,
        hasMore: false
    });

    expect(toPaginationMeta({
        page: 0,
        limit: 0,
        total: -10
    })).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        pages: 1,
        hasMore: false
    });
});
