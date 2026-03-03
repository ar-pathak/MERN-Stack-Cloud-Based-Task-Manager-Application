jest.mock("nodemailer", () => ({
    createTransport: jest.fn()
}));

jest.mock("fs", () => ({
    readFileSync: jest.fn()
}));

const nodemailer = require("nodemailer");
const fs = require("fs");
const sendEmail = require("../../src/helpers/sendEmail");

const originalEnv = { ...process.env };

beforeEach(() => {
    jest.clearAllMocks();
    process.env.EMAIL_USER = "mailer@example.com";
    process.env.EMAIL_PASS = "secret";
    delete process.env.FRONTEND_URL;
});

afterAll(() => {
    process.env = originalEnv;
});

test("throws when token is missing and html is not provided", async () => {
    await expect(sendEmail({
        to: "user@example.com",
        subject: "Subject"
    })).rejects.toThrow("Email token is required when HTML content is not provided");
});

test("sends provided html directly without reading template files", async () => {
    const sendMail = jest.fn().mockResolvedValue({});
    nodemailer.createTransport.mockReturnValue({ sendMail });

    await sendEmail({
        to: "user@example.com",
        subject: "Custom HTML",
        html: "<p>Custom body</p>"
    });

    expect(fs.readFileSync).not.toHaveBeenCalled();
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
        to: "user@example.com",
        subject: "Custom HTML",
        html: "<p>Custom body</p>"
    }));
});

test("builds reset-password action link from normalized frontend url", async () => {
    process.env.FRONTEND_URL = " https://frontend.example.com/ , https://ignored.example.com ";
    fs.readFileSync.mockReturnValue("Reset link: {{RESET_LINK}}");
    const sendMail = jest.fn().mockResolvedValue({});
    nodemailer.createTransport.mockReturnValue({ sendMail });

    await sendEmail({
        to: "user@example.com",
        subject: "Reset Password",
        token: "token-123",
        type: "reset-password"
    });

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
        html: "Reset link: https://frontend.example.com/home/auth/reset-password/token-123"
    }));
});

test("uses explicit actionUrl for email verification template", async () => {
    fs.readFileSync.mockReturnValue("Verify: {{VERIFY_LINK}}");
    const sendMail = jest.fn().mockResolvedValue({});
    nodemailer.createTransport.mockReturnValue({ sendMail });

    await sendEmail({
        to: "user@example.com",
        subject: "Verify Email",
        token: "verify-token",
        type: "email-verification",
        actionUrl: "https://custom.example.com/verify"
    });

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
        html: "Verify: https://custom.example.com/verify"
    }));
});

test("falls back to invite template and localhost frontend url", async () => {
    fs.readFileSync.mockReturnValue("Invite: {{INVITE_LINK}}");
    const sendMail = jest.fn().mockResolvedValue({});
    nodemailer.createTransport.mockReturnValue({ sendMail });

    await sendEmail({
        to: "user@example.com",
        subject: "Invite",
        token: "invite-token"
    });

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
        html: "Invite: http://localhost:5173/invites/accept/invite-token"
    }));
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
        service: "Gmail",
        auth: {
            user: "mailer@example.com",
            pass: "secret"
        }
    });
});
