const { validate } = require("../../src/middleware/validate");

const createResponse = () => {
    const res = {
        statusCode: 200,
        body: null
    };
    res.status = jest.fn((statusCode) => {
        res.statusCode = statusCode;
        return res;
    });
    res.json = jest.fn((payload) => {
        res.body = payload;
        return res;
    });
    return res;
};

test("validates body payloads and replaces req.body with parsed data", () => {
    const schema = {
        safeParse: jest.fn().mockReturnValue({
            success: true,
            data: { name: "Alice" }
        })
    };
    const middleware = validate(schema);
    const req = {
        body: { name: " Alice " },
        params: {},
        query: {}
    };
    const next = jest.fn();

    middleware(req, createResponse(), next);

    expect(schema.safeParse).toHaveBeenCalledWith({ name: " Alice " });
    expect(req.body).toEqual({ name: "Alice" });
    expect(next).toHaveBeenCalledTimes(1);
});

test("validates params and query sources", () => {
    const paramsSchema = {
        safeParse: jest.fn().mockReturnValue({
            success: true,
            data: { id: "123" }
        })
    };
    const querySchema = {
        safeParse: jest.fn().mockReturnValue({
            success: true,
            data: { page: 2 }
        })
    };

    const paramsReq = { params: { id: "123" }, query: {}, body: {} };
    const queryReq = { params: {}, query: { page: "2" }, body: {} };
    const next = jest.fn();

    validate(paramsSchema, "params")(paramsReq, createResponse(), next);
    validate(querySchema, "query")(queryReq, createResponse(), next);

    expect(paramsSchema.safeParse).toHaveBeenCalledWith({ id: "123" });
    expect(querySchema.safeParse).toHaveBeenCalledWith({ page: "2" });
    expect(paramsReq.params).toEqual({ id: "123" });
    expect(queryReq.query).toEqual({ page: 2 });
    expect(next).toHaveBeenCalledTimes(2);
});

test("maps zod issues with nested paths and source-level fallbacks", () => {
    const schema = {
        safeParse: jest.fn().mockReturnValue({
            success: false,
            error: {
                issues: [
                    { path: ["user", "email"], message: "Invalid email" },
                    { path: [], message: "Missing search query" }
                ]
            }
        })
    };
    const middleware = validate(schema, "query");
    const res = createResponse();

    middleware({ body: {}, params: {}, query: {} }, res, jest.fn());

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
        success: false,
        message: "Validation Error",
        errors: [
            { field: "user.email", message: "Invalid email" },
            { field: "query", message: "Missing search query" }
        ]
    });
});

test("supports alternate error.errors format and generic fallback error payload", () => {
    const errorsSchema = {
        safeParse: jest.fn().mockReturnValue({
            success: false,
            error: {
                errors: [
                    { path: ["id"], message: "Invalid id" }
                ]
            }
        })
    };
    const errorsRes = createResponse();
    validate(errorsSchema, "params")({ body: {}, params: {}, query: {} }, errorsRes, jest.fn());

    expect(errorsRes.body).toEqual({
        success: false,
        message: "Validation Error",
        errors: [
            { field: "id", message: "Invalid id" }
        ]
    });

    const fallbackSchema = {
        safeParse: jest.fn().mockReturnValue({
            success: false,
            error: {}
        })
    };
    const fallbackRes = createResponse();
    validate(fallbackSchema)({ body: {}, params: {}, query: {} }, fallbackRes, jest.fn());

    expect(fallbackRes.body).toEqual({
        success: false,
        message: "Validation Error",
        errors: [
            { field: "body", message: "Invalid request data" }
        ]
    });
});
