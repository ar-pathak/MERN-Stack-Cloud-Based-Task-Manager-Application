const makeListQuery = (value) => ({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value)
});

afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
});

test("listHelpArticles skips seeding when default article list is empty", async () => {
    let SupportArticle;
    let SupportService;

    jest.isolateModules(() => {
        jest.doMock("../../src/models/supportArticle", () => ({
            bulkWrite: jest.fn(),
            find: jest.fn(() => makeListQuery([])),
            findOne: jest.fn(),
            countDocuments: jest.fn().mockResolvedValue(0),
            aggregate: jest.fn().mockResolvedValue([])
        }));
        jest.doMock("../../src/models/supportTicket", () => ({
            exists: jest.fn(),
            create: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
            countDocuments: jest.fn(),
            aggregate: jest.fn()
        }));
        jest.doMock("../../src/models/supportFeedback", () => ({
            create: jest.fn(),
            find: jest.fn(),
            countDocuments: jest.fn(),
            aggregate: jest.fn()
        }));
        jest.doMock("../../src/modules/support/support.constants", () => ({
            SUPPORT_CATEGORIES: ["account", "security"],
            CATEGORY_LABELS: { account: "Account", security: "Security" },
            TICKET_STATUSES: ["open", "pending", "resolved", "closed"],
            DEFAULT_HELP_ARTICLES: [],
            DEFAULT_FAQS: []
        }));

        SupportArticle = require("../../src/models/supportArticle");
        SupportService = require("../../src/modules/support/support.service");
    });

    await SupportService.listHelpArticles();

    expect(SupportArticle.bulkWrite).not.toHaveBeenCalled();
    expect(SupportArticle.find).toHaveBeenCalledWith({ published: true });
});

test("listHelpArticles rethrows bulkWrite seeding errors", async () => {
    let SupportService;
    const seedError = new Error("seed-failed");

    jest.isolateModules(() => {
        jest.doMock("../../src/models/supportArticle", () => ({
            bulkWrite: jest.fn().mockRejectedValue(seedError),
            find: jest.fn(() => makeListQuery([])),
            findOne: jest.fn(),
            countDocuments: jest.fn().mockResolvedValue(0),
            aggregate: jest.fn().mockResolvedValue([])
        }));
        jest.doMock("../../src/models/supportTicket", () => ({
            exists: jest.fn(),
            create: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
            countDocuments: jest.fn(),
            aggregate: jest.fn()
        }));
        jest.doMock("../../src/models/supportFeedback", () => ({
            create: jest.fn(),
            find: jest.fn(),
            countDocuments: jest.fn(),
            aggregate: jest.fn()
        }));
        jest.doMock("../../src/modules/support/support.constants", () => ({
            SUPPORT_CATEGORIES: ["account", "security"],
            CATEGORY_LABELS: { account: "Account", security: "Security" },
            TICKET_STATUSES: ["open", "pending", "resolved", "closed"],
            DEFAULT_HELP_ARTICLES: [{ title: "No slug defaults" }],
            DEFAULT_FAQS: []
        }));

        SupportService = require("../../src/modules/support/support.service");
    });

    await expect(SupportService.listHelpArticles()).rejects.toBe(seedError);
});
