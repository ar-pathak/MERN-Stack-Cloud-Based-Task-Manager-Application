import { beforeEach, expect, test, vi } from "vitest";

const { apiMock, axiosMock } = vi.hoisted(() => {
    const apiMock = { post: vi.fn() };
    const axiosMock = { create: vi.fn(() => apiMock) };
    return { apiMock, axiosMock };
});

vi.mock("axios", () => ({
    default: axiosMock,
}));

import { uploadService } from "../../service/upload.service.js";

beforeEach(() => {
    apiMock.post.mockReset();
});

test("uploadService creates the axios client and uploads a file", async () => {
    expect(axiosMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
            baseURL: expect.any(String),
            withCredentials: true,
        })
    );

    const file = new File(["hello"], "hello.txt", { type: "text/plain" });
    const onProgress = vi.fn();
    apiMock.post.mockResolvedValueOnce({ data: { data: { url: "file-url" } } });

    const uploadPromise = uploadService.uploadFile(file, onProgress);
    const [url, formDataArg, configArg] = apiMock.post.mock.calls.at(-1);

    expect(url).toBe("api/upload/single");
    expect(formDataArg).toBeInstanceOf(FormData);
    expect(formDataArg.get("file")).toBe(file);
    expect(configArg?.headers?.["Content-Type"]).toBe("multipart/form-data");
    configArg.onUploadProgress({ loaded: 5, total: 10 });
    expect(onProgress).toHaveBeenCalledWith(50);

    await expect(uploadPromise).resolves.toEqual({ url: "file-url" });
});

test("uploadService uploads multiple files with progress updates", async () => {
    const fileA = new File(["a"], "a.txt", { type: "text/plain" });
    const fileB = new File(["b"], "b.txt", { type: "text/plain" });
    const onProgress = vi.fn();

    apiMock.post.mockResolvedValueOnce({ data: { data: [{ url: "file-a" }] } });
    const uploadPromise = uploadService.uploadMultipleFiles([fileA, fileB], onProgress);
    const [url, formDataArg, configArg] = apiMock.post.mock.calls.at(-1);

    expect(url).toBe("/api/upload/multiple");
    expect(formDataArg).toBeInstanceOf(FormData);
    expect(formDataArg.getAll("files")).toEqual([fileA, fileB]);
    expect(configArg?.headers?.["Content-Type"]).toBe("multipart/form-data");
    configArg.onUploadProgress({ loaded: 1, total: 2 });
    expect(onProgress).toHaveBeenCalledWith(50);

    await expect(uploadPromise).resolves.toEqual([{ url: "file-a" }]);
});

test("uploadService surfaces response errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const file = new File(["a"], "a.txt", { type: "text/plain" });

    apiMock.post.mockRejectedValueOnce({ response: { data: { message: "Upload failed" } } });
    await expect(uploadService.uploadFile(file)).rejects.toThrow("Upload failed");

    apiMock.post.mockRejectedValueOnce({});
    await expect(uploadService.uploadMultipleFiles([file])).rejects.toThrow("File upload failed");

    errorSpy.mockRestore();
});
