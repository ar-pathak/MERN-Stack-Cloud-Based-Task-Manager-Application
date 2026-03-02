jest.mock("../../src/helpers/responseHelper", () => ({
    sendSuccess: jest.fn((res, data = null, message = "Success", statusCode = 200) => (
        res.status(statusCode).json({
            success: true,
            message,
            ...(data !== null ? { data } : {})
        })
    )),
    handleError: jest.fn((error, res) => (
        res.status(error?.statusCode || 500).json({
            success: false,
            message: error?.message || "Internal server error"
        })
    ))
}));

const { sendSuccess, handleError } = require("../../src/helpers/responseHelper");
const uploadController = require("../../src/modules/upload/upload.controller");

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

test("uploadFile returns 400 when no file payload is provided", async () => {
    const req = {};
    const res = createResponse();

    await uploadController.uploadFile(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
        success: false,
        message: "No file uploaded"
    });
});

test("uploadFile returns 400 when files array is empty", async () => {
    const req = { files: [] };
    const res = createResponse();

    await uploadController.uploadFile(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
        success: false,
        message: "No file uploaded"
    });
});

test("uploadFile returns single file payload through sendSuccess", async () => {
    const req = {
        file: {
            path: "https://cdn.example.com/file.png",
            originalname: "file.png",
            mimetype: "image/png",
            size: 12345
        }
    };
    const res = createResponse();

    await uploadController.uploadFile(req, res);

    expect(sendSuccess).toHaveBeenCalledWith(res, {
        url: "https://cdn.example.com/file.png",
        name: "file.png",
        type: "image/png",
        size: 12345
    });
    expect(res.statusCode).toBe(200);
});

test("uploadFile returns mapped payload for multiple files", async () => {
    const req = {
        files: [
            {
                path: "https://cdn.example.com/a.png",
                originalname: "a.png",
                mimetype: "image/png",
                size: 100
            },
            {
                path: "https://cdn.example.com/b.mp4",
                originalname: "b.mp4",
                mimetype: "video/mp4",
                size: 200
            }
        ]
    };
    const res = createResponse();

    await uploadController.uploadFile(req, res);

    expect(sendSuccess).toHaveBeenCalledWith(res, [
        {
            url: "https://cdn.example.com/a.png",
            name: "a.png",
            type: "image/png",
            size: 100
        },
        {
            url: "https://cdn.example.com/b.mp4",
            name: "b.mp4",
            type: "video/mp4",
            size: 200
        }
    ]);
    expect(res.statusCode).toBe(200);
});

test("uploadFile delegates unexpected failures to handleError", async () => {
    const req = {
        file: {
            path: "https://cdn.example.com/file.png",
            originalname: "file.png",
            mimetype: "image/png",
            size: 12345
        }
    };
    const res = createResponse();
    const error = new Error("upload failed");
    error.statusCode = 502;
    sendSuccess.mockImplementationOnce(() => {
        throw error;
    });

    await uploadController.uploadFile(req, res);

    expect(handleError).toHaveBeenCalledWith(error, res);
    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({
        success: false,
        message: "upload failed"
    });
});
