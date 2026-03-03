const {
    sendSuccess,
    sendError,
    handleError
} = require("../../src/helpers/responseHelper");

const createResponse = () => {
    const res = {
        statusCode: null,
        body: null
    };

    res.status = jest.fn((code) => {
        res.statusCode = code;
        return res;
    });

    res.json = jest.fn((payload) => {
        res.body = payload;
        return res;
    });

    return res;
};

beforeEach(() => {
    jest.clearAllMocks();
});

test("sendSuccess includes data when non-null payload is provided", () => {
    const res = createResponse();
    sendSuccess(res, { id: "1" }, "Created", 201);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
        success: true,
        message: "Created",
        data: { id: "1" }
    });
});

test("sendSuccess omits data field when payload is null", () => {
    const res = createResponse();
    sendSuccess(res, null, "Ok");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
        success: true,
        message: "Ok"
    });
});

test("sendError includes optional errors payload", () => {
    const res = createResponse();
    sendError(res, "Validation failed", 400, [{ path: "email" }]);

    expect(res.body).toEqual({
        success: false,
        message: "Validation failed",
        errors: [{ path: "email" }]
    });
});

test("handleError formats ZodError issues from error.issues", () => {
    const res = createResponse();
    const error = {
        name: "ZodError",
        issues: [{ path: ["email"], message: "Invalid email" }]
    };

    handleError(error, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
        success: false,
        message: "Validation error",
        errors: [{ path: ["email"], message: "Invalid email" }]
    });
});

test("handleError supports ZodError fallback payload on error.errors", () => {
    const res = createResponse();
    const error = {
        name: "ZodError",
        errors: [{ path: ["name"], message: "Required" }]
    };

    handleError(error, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
        success: false,
        message: "Validation error",
        errors: [{ path: ["name"], message: "Required" }]
    });
});

test("handleError maps duplicate user/post key to like conflict", () => {
    const res = createResponse();
    handleError({
        name: "MongoServerError",
        code: 11000,
        keyPattern: { user: 1, post: 1 }
    }, res);

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe("Post already liked");
});

test("handleError maps duplicate user/comment key to comment conflict", () => {
    const res = createResponse();
    handleError({
        name: "MongoServerError",
        code: 11000,
        keyPattern: { user: 1, comment: 1 }
    }, res);

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe("Comment already liked");
});

test("handleError maps other duplicate multi-field keys to generic conflict", () => {
    const res = createResponse();
    handleError({
        name: "MongoServerError",
        code: 11000,
        keyPattern: { workspace: 1, name: 1 }
    }, res);

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe("Record already exists");
});

test("handleError maps duplicate single-field key to field message", () => {
    const res = createResponse();
    handleError({
        name: "MongoServerError",
        code: 11000,
        keyPattern: { email: 1 }
    }, res);

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe("email already exists");
});

test("handleError maps non-duplicate mongo errors to database error", () => {
    const res = createResponse();
    handleError({
        name: "MongoServerError",
        code: 12345
    }, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Database error");
});

test("handleError maps cast errors to invalid id format", () => {
    const res = createResponse();
    handleError({
        name: "CastError"
    }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid ID format");
});

test("handleError respects custom statusCode from business errors", () => {
    const res = createResponse();
    handleError({
        statusCode: 422,
        message: "Unprocessable entity"
    }, res);

    expect(res.statusCode).toBe(422);
    expect(res.body.message).toBe("Unprocessable entity");
});

test("handleError falls back to internal server error and logs unexpected status", () => {
    const res = createResponse();
    const logSpy = jest.spyOn(console, "error");

    handleError({
        statusCode: Number.NaN,
        message: ""
    }, res);

    expect(logSpy).toHaveBeenCalled();
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Internal server error");
});
