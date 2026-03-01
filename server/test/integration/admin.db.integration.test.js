const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

require("./helpers/loadEnv");

process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "integration-jwt-secret";
process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
process.env.REFRESH_SECRET = process.env.REFRESH_SECRET || "integration-refresh-secret";
process.env.RATE_LIMIT_STORE = "memory";
process.env.GLOBAL_RATE_LIMIT_MAX = process.env.GLOBAL_RATE_LIMIT_MAX || "1000";
process.env.AUTH_RATE_LIMIT_MAX = process.env.AUTH_RATE_LIMIT_MAX || "1000";

const ADMIN_EMAIL = `admin.${Date.now()}-${crypto.randomInt(100000, 999999)}@example.com`;
const ADMIN_INVITE_CODE = "integration-admin-invite";
const INITIAL_ADMIN_PASSWORD = "Str0ng@Pass1";

process.env.ADMIN_ALLOWED_EMAIL = ADMIN_EMAIL;
process.env.ADMIN_INVITE_CODE = ADMIN_INVITE_CODE;

const sendEmailModulePath = require.resolve("../../src/helpers/sendEmail");
const originalSendEmail = require(sendEmailModulePath);

const emailMockState = {
    calls: [],
    failNext: false
};

const mockedSendEmail = async (payload) => {
    emailMockState.calls.push(payload);

    if (emailMockState.failNext) {
        emailMockState.failNext = false;
        throw new Error("mock admin email provider failure");
    }

    return {
        accepted: [payload?.to]
    };
};

require.cache[sendEmailModulePath].exports = mockedSendEmail;

const connectDB = require("../../src/config/database");
const AdminAccount = require("../../src/models/adminAccount");
const SupportTicket = require("../../src/models/supportTicket");
const SupportFeedback = require("../../src/models/supportFeedback");
const User = require("../../src/models/user");
const { httpServer, io } = require("../../src/app");

const hasMongoUrl = Boolean(String(process.env.MONGO_URL || "").trim());
const testWithDb = hasMongoUrl ? test : test.skip;

let baseUrl = "";
let currentAdminPassword = INITIAL_ADMIN_PASSWORD;

const createdUserIds = new Set();
const createdUserEmails = new Set();
const createdTicketIds = new Set();
const createdFeedbackIds = new Set();

const resetEmailMock = () => {
    emailMockState.calls.length = 0;
    emailMockState.failNext = false;
};

const getSetCookieHeaders = (response) => {
    if (typeof response.headers.getSetCookie === "function") {
        return response.headers.getSetCookie();
    }

    const setCookieHeader = response.headers.get("set-cookie");
    return setCookieHeader ? [setCookieHeader] : [];
};

const parseCookieJar = (setCookieHeaders) => {
    const jar = {};

    for (const cookieLine of setCookieHeaders) {
        const firstSegment = String(cookieLine || "").split(";")[0].trim();
        if (!firstSegment) continue;

        const separatorIndex = firstSegment.indexOf("=");
        if (separatorIndex === -1) continue;

        const name = firstSegment.slice(0, separatorIndex).trim();
        const value = firstSegment.slice(separatorIndex + 1).trim();
        if (name) {
            jar[name] = value;
        }
    }

    return jar;
};

const toCookieHeader = (jar) => Object.entries(jar)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

const requestJson = async (route, options = {}) => {
    const response = await fetch(`${baseUrl}${route}`, options);
    const body = await response.json();
    return { response, body };
};

const extractOtpCode = (payload = {}) => {
    const html = String(payload.html || "");
    const match = html.match(/\b(\d{6})\b/);
    return match ? match[1] : "";
};

const loginAdminAndGetCookieJar = async (password = currentAdminPassword) => {
    resetEmailMock();

    const login = await requestJson("/api/admin/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: ADMIN_EMAIL,
            password
        })
    });

    assert.equal(login.response.status, 202);
    assert.equal(login.body.success, true);
    assert.equal(login.body.data?.otpRequired, true);

    assert.equal(emailMockState.calls.length, 1);
    const otpCode = extractOtpCode(emailMockState.calls[0]);
    assert.match(otpCode, /^\d{6}$/);

    const verifyOtp = await requestJson("/api/admin/auth/verify-login-otp", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: ADMIN_EMAIL,
            otp: otpCode
        })
    });

    assert.equal(verifyOtp.response.status, 200);
    assert.equal(verifyOtp.body.success, true);
    assert.equal(verifyOtp.body.message, "Admin login successful");

    const cookieJar = parseCookieJar(getSetCookieHeaders(verifyOtp.response));
    assert.ok(cookieJar.adminAccessToken, "verify-login-otp should set adminAccessToken cookie");

    return cookieJar;
};

beforeAll(async () => {
    if (!hasMongoUrl) return;

    await connectDB();

    await AdminAccount.deleteMany({ email: ADMIN_EMAIL.toLowerCase() });

    if (!httpServer.listening) {
        await new Promise((resolve) => {
            httpServer.listen(0, "127.0.0.1", resolve);
        });
    }

    const address = httpServer.address();
    const port = typeof address === "object" && address ? address.port : null;
    if (!port) {
        throw new Error("Failed to start HTTP server for admin DB integration tests");
    }

    baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
    if (!hasMongoUrl) return;

    if (createdFeedbackIds.size > 0) {
        await SupportFeedback.deleteMany({ _id: { $in: [...createdFeedbackIds] } });
    }

    if (createdTicketIds.size > 0) {
        await SupportTicket.deleteMany({ _id: { $in: [...createdTicketIds] } });
    }

    if (createdUserIds.size > 0) {
        await User.deleteMany({ _id: { $in: [...createdUserIds] } });
    } else if (createdUserEmails.size > 0) {
        await User.deleteMany({ email: { $in: [...createdUserEmails] } });
    }

    await AdminAccount.deleteMany({ email: ADMIN_EMAIL.toLowerCase() });

    await new Promise((resolve) => io.close(resolve));
    if (httpServer.listening) {
        await new Promise((resolve) => httpServer.close(resolve));
    }

    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }

    require.cache[sendEmailModulePath].exports = originalSendEmail;
});

testWithDb("admin auth flow covers register, email verification, OTP login, and password reset", async () => {
    resetEmailMock();

    const register = await requestJson("/api/admin/auth/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: "Admin Integration",
            email: ADMIN_EMAIL.toUpperCase(),
            password: INITIAL_ADMIN_PASSWORD,
            inviteCode: ADMIN_INVITE_CODE
        })
    });

    assert.equal(register.response.status, 201);
    assert.equal(register.body.success, true);
    assert.equal(register.body.data?.admin?.email, ADMIN_EMAIL.toLowerCase());
    assert.equal(register.body.data?.requiresEmailVerification, true);

    assert.equal(emailMockState.calls.length, 1);
    const verificationMail = emailMockState.calls[0];
    assert.equal(verificationMail.to, ADMIN_EMAIL.toLowerCase());
    assert.equal(verificationMail.type, "email-verification");
    assert.match(String(verificationMail.token || ""), /^[a-f0-9]{64}$/i);

    const preVerificationLogin = await requestJson("/api/admin/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: ADMIN_EMAIL,
            password: INITIAL_ADMIN_PASSWORD
        })
    });

    assert.equal(preVerificationLogin.response.status, 403);
    assert.equal(preVerificationLogin.body.success, false);
    assert.equal(preVerificationLogin.body.message, "Admin email is not verified. Please verify before login.");

    const verifyEmail = await requestJson("/api/admin/auth/verify-email", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            token: verificationMail.token
        })
    });

    assert.equal(verifyEmail.response.status, 200);
    assert.equal(verifyEmail.body.success, true);
    assert.equal(verifyEmail.body.message, "Admin email verified successfully.");

    const authCookies = await loginAdminAndGetCookieJar(INITIAL_ADMIN_PASSWORD);

    const me = await requestJson("/api/admin/auth/me", {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(authCookies)
        }
    });

    assert.equal(me.response.status, 200);
    assert.equal(me.body.success, true);
    assert.equal(me.body.data?.admin?.email, ADMIN_EMAIL.toLowerCase());

    const forgotUnknown = await requestJson("/api/admin/auth/forgot-password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: `missing.${Date.now()}@example.com`
        })
    });

    assert.equal(forgotUnknown.response.status, 200);
    assert.equal(forgotUnknown.body.success, true);
    assert.equal(forgotUnknown.body.message, "If that admin email exists, a reset link has been sent.");

    resetEmailMock();
    const forgotKnown = await requestJson("/api/admin/auth/forgot-password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: ADMIN_EMAIL
        })
    });

    assert.equal(forgotKnown.response.status, 200);
    assert.equal(forgotKnown.body.success, true);
    assert.equal(forgotKnown.body.message, "If that admin email exists, a reset link has been sent.");
    assert.equal(emailMockState.calls.length, 1);

    const resetMail = emailMockState.calls[0];
    assert.equal(resetMail.type, "reset-password");
    assert.match(String(resetMail.token || ""), /^[a-f0-9]{64}$/i);

    const nextPassword = "N3wStr0ng@Pass1";
    const resetPassword = await requestJson(`/api/admin/auth/reset-password/${resetMail.token}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            password: nextPassword
        })
    });

    assert.equal(resetPassword.response.status, 200);
    assert.equal(resetPassword.body.success, true);
    assert.equal(resetPassword.body.message, "Admin password has been reset successfully.");

    const oldPasswordLogin = await requestJson("/api/admin/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: ADMIN_EMAIL,
            password: INITIAL_ADMIN_PASSWORD
        })
    });

    assert.equal(oldPasswordLogin.response.status, 401);
    assert.equal(oldPasswordLogin.body.success, false);
    assert.equal(oldPasswordLogin.body.message, "Invalid admin email or password");

    const newPasswordLogin = await requestJson("/api/admin/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: ADMIN_EMAIL,
            password: nextPassword
        })
    });

    assert.equal(newPasswordLogin.response.status, 202);
    assert.equal(newPasswordLogin.body.success, true);
    assert.equal(newPasswordLogin.body.data?.otpRequired, true);

    currentAdminPassword = nextPassword;
});

testWithDb("admin support routes support listing, updates, assignment, replies, and feedback", async () => {
    const cookieJar = await loginAdminAndGetCookieJar();

    const admin = await AdminAccount.findOne({ email: ADMIN_EMAIL.toLowerCase() }).lean();
    assert.ok(admin?._id, "expected admin account to exist");

    const unique = `${Date.now()}-${crypto.randomInt(100000, 999999)}`;
    const user = await User.create({
        username: `req${crypto.randomInt(100000, 999999)}`,
        email: `requester.${unique}@example.com`,
        googleId: `gid-${unique}`,
        name: "Requester User"
    });
    createdUserIds.add(String(user._id));
    createdUserEmails.add(user.email.toLowerCase());

    const ticket = await SupportTicket.create({
        ticketNumber: `TKT-${crypto.randomInt(100000, 999999)}`,
        requester: user._id,
        requesterSnapshot: {
            name: user.name,
            email: user.email
        },
        subject: "Need help with account security",
        category: "security",
        description: "Unexpected login detected in audit logs.",
        priority: "high",
        status: "open",
        source: "ticket",
        comments: [
            {
                author: user._id,
                authorModel: "User",
                authorRole: "user",
                authorName: user.name,
                body: "Please assist with security checks.",
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ]
    });
    createdTicketIds.add(String(ticket._id));

    const feedback = await SupportFeedback.create({
        user: user._id,
        type: "bug_report",
        category: "security",
        title: "Session timeout issue",
        message: "Sessions expire too quickly for support review.",
        rating: 4
    });
    createdFeedbackIds.add(String(feedback._id));

    const agents = await requestJson("/api/admin/support/agents", {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(cookieJar)
        }
    });

    assert.equal(agents.response.status, 200);
    assert.equal(agents.body.success, true);
    assert.ok(Array.isArray(agents.body.data?.agents));
    assert.ok(agents.body.data.agents.some((entry) => entry.email === ADMIN_EMAIL.toLowerCase()));

    const summary = await requestJson("/api/admin/support/summary", {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(cookieJar)
        }
    });

    assert.equal(summary.response.status, 200);
    assert.equal(summary.body.success, true);
    assert.ok(Number(summary.body.data?.totals?.totalTickets) >= 1);

    const listTickets = await requestJson("/api/admin/support/tickets?status=open&search=security", {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(cookieJar)
        }
    });

    assert.equal(listTickets.response.status, 200);
    assert.equal(listTickets.body.success, true);
    assert.ok(Array.isArray(listTickets.body.data?.tickets));
    assert.ok(listTickets.body.data.tickets.some((entry) => String(entry._id) === String(ticket._id)));

    const getTicket = await requestJson(`/api/admin/support/tickets/${ticket._id}`, {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(cookieJar)
        }
    });

    assert.equal(getTicket.response.status, 200);
    assert.equal(getTicket.body.success, true);
    assert.equal(String(getTicket.body.data?._id), String(ticket._id));

    const invalidTicketParam = await requestJson("/api/admin/support/tickets/not-a-valid-id", {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(cookieJar)
        }
    });

    assert.equal(invalidTicketParam.response.status, 400);
    assert.equal(invalidTicketParam.body.success, false);
    assert.match(String(invalidTicketParam.body.message || ""), /^Validation error$/i);

    const updateStatus = await requestJson(`/api/admin/support/tickets/${ticket._id}/status`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Cookie: toCookieHeader(cookieJar)
        },
        body: JSON.stringify({
            status: "in_progress"
        })
    });

    assert.equal(updateStatus.response.status, 200);
    assert.equal(updateStatus.body.success, true);
    assert.equal(updateStatus.body.message, "Ticket status updated");
    assert.equal(updateStatus.body.data?.status, "in_progress");

    const missingAssignee = await requestJson(`/api/admin/support/tickets/${ticket._id}/assign`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Cookie: toCookieHeader(cookieJar)
        },
        body: JSON.stringify({
            assigneeId: new mongoose.Types.ObjectId().toString()
        })
    });

    assert.equal(missingAssignee.response.status, 404);
    assert.equal(missingAssignee.body.success, false);
    assert.equal(missingAssignee.body.message, "Assignee admin not found");

    const assignAdmin = await requestJson(`/api/admin/support/tickets/${ticket._id}/assign`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Cookie: toCookieHeader(cookieJar)
        },
        body: JSON.stringify({
            assigneeId: String(admin._id)
        })
    });

    assert.equal(assignAdmin.response.status, 200);
    assert.equal(assignAdmin.body.success, true);
    assert.equal(assignAdmin.body.message, "Ticket assignment updated");
    assert.equal(String(assignAdmin.body.data?.assignee), String(admin._id));

    const invalidParentReply = await requestJson(`/api/admin/support/tickets/${ticket._id}/replies`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: toCookieHeader(cookieJar)
        },
        body: JSON.stringify({
            body: "Investigating this issue now.",
            parentCommentId: new mongoose.Types.ObjectId().toString()
        })
    });

    assert.equal(invalidParentReply.response.status, 404);
    assert.equal(invalidParentReply.body.success, false);
    assert.equal(invalidParentReply.body.message, "Parent comment not found");

    const addReply = await requestJson(`/api/admin/support/tickets/${ticket._id}/replies`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: toCookieHeader(cookieJar)
        },
        body: JSON.stringify({
            body: "Investigating this issue now.",
            internalNote: true,
            attachments: [
                {
                    url: "https://example.com/evidence.png",
                    name: "evidence.png",
                    type: "image/png",
                    size: 512
                }
            ]
        })
    });

    assert.equal(addReply.response.status, 200);
    assert.equal(addReply.body.success, true);
    assert.equal(addReply.body.message, "Reply posted");
    assert.equal(addReply.body.data?.status, "in_progress");
    assert.equal(addReply.body.data?.comment?.internalNote, true);

    const feedbackList = await requestJson("/api/admin/support/feedback?type=bug_report&search=timeout", {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(cookieJar)
        }
    });

    assert.equal(feedbackList.response.status, 200);
    assert.equal(feedbackList.body.success, true);
    assert.ok(Array.isArray(feedbackList.body.data?.feedback));
    assert.ok(feedbackList.body.data.feedback.some((entry) => String(entry._id) === String(feedback._id)));
});

testWithDb("admin register rejects invalid invite code", async () => {
    const rejectInvalidInvite = await requestJson("/api/admin/auth/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: "Another Admin",
            email: ADMIN_EMAIL,
            password: "Str0ng@Pass1",
            inviteCode: "wrong-invite"
        })
    });

    assert.equal(rejectInvalidInvite.response.status, 403);
    assert.equal(rejectInvalidInvite.body.success, false);
    assert.equal(rejectInvalidInvite.body.message, "Invalid admin invite code");
});
