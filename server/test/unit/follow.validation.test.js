const assert = require("node:assert/strict");

const validation = require("../../src/modules/follow/follow.validation");

const VALID_ID = "507f1f77bcf86cd799439011";

test("idParamSchema accepts valid id", () => {
    const parsed = validation.idParamSchema.parse({ id: VALID_ID });
    assert.equal(parsed.id, VALID_ID);
});

test("idParamSchema rejects invalid id", () => {
    assert.throws(
        () => validation.idParamSchema.parse({ id: "invalid-id" }),
        /Invalid ID format/
    );
});

test("requestIdSchema rejects invalid request id", () => {
    assert.throws(
        () => validation.requestIdSchema.parse({ requestId: "bad-id" }),
        /Invalid ID format/
    );
});

test("listSchema coerces numeric query values", () => {
    const parsed = validation.listSchema.parse({
        page: "3",
        limit: "25"
    });
    assert.equal(parsed.page, 3);
    assert.equal(parsed.limit, 25);
});

test("suggestionSchema enforces limit boundaries", () => {
    assert.throws(
        () => validation.suggestionSchema.parse({ limit: "0" }),
        /Too small|>=1/
    );

    const parsed = validation.suggestionSchema.parse({ limit: "12" });
    assert.equal(parsed.limit, 12);
});
