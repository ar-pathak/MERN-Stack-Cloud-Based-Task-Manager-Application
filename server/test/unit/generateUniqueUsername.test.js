jest.mock("../../src/models/user", () => ({
    findOne: jest.fn()
}));

const User = require("../../src/models/user");
const generateUniqueUsername = require("../../src/modules/utils/generateUniqueUsername");

beforeEach(() => {
    jest.clearAllMocks();
});

test("generateUniqueUsername sanitizes base username and returns first unique candidate", async () => {
    User.findOne.mockResolvedValue(null);

    const username = await generateUniqueUsername("John.Doe+1@example.com");

    expect(username).toBe("johndoe1");
    expect(User.findOne).toHaveBeenCalledWith({ username: "johndoe1" });
});

test("generateUniqueUsername handles short base names and retries with random suffix on collisions", async () => {
    const randomSpy = jest.spyOn(Math, "random")
        .mockReturnValueOnce(0.123)
        .mockReturnValueOnce(0);
    User.findOne
        .mockResolvedValueOnce({ _id: "existing-user" })
        .mockResolvedValueOnce(null);

    const username = await generateUniqueUsername("a!@example.com");

    expect(User.findOne).toHaveBeenNthCalledWith(1, { username: "a123" });
    expect(User.findOne).toHaveBeenNthCalledWith(2, { username: "a1231000" });
    expect(username).toBe("a1231000");
    randomSpy.mockRestore();
});

test("generateUniqueUsername truncates long base username to 15 characters before uniqueness check", async () => {
    User.findOne.mockResolvedValue(null);

    const username = await generateUniqueUsername("averyveryveryverylongname@example.com");

    expect(username).toHaveLength(15);
    expect(User.findOne).toHaveBeenCalledWith({ username });
});
