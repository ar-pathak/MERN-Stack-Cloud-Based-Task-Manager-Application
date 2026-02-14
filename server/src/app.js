const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const connectDB = require("./config/database");

// ---------------------------------------------------------------------------
// Route imports
// ---------------------------------------------------------------------------
const authRoutes = require("./modules/auth/auth.routes");
const workspaceRoutes = require("./modules/workspace/workspace.routes");
const teamsRoutes = require("./modules/team/teams.routes");
const projectsRoutes = require("./modules/projects/project.routes");
const tasksRoutes = require("./modules/tasks/tasks.routes");
const overviewRoutes = require("./modules/overview/overview.routes");
const subtaskRoutes = require("./modules/subtask/subtask.routes");
const postRoutes = require("./modules/posts/post.routes");
const storyRoutes = require("./modules/stories/story.routes");
const followRoutes = require("./modules/follow/follow.routes");
const usersRoutes = require("./modules/user/user.routes");
const chatRoutes = require("./modules/chat/chat.routes");
const uploadRoutes = require("./modules/upload/upload.routes");
const callsRoutes = require("./modules/call/call.routes");
const notificationRoutes = require("./modules/notification/notification.routes");
const postService = require("./modules/posts/post.service");

// Socket handler + auth middleware for Socket.IO
const chatSocketHandler = require("./modules/chat/chat.socket");
const callSocketHandler = require("./modules/call/Call.socket");
const socketAuthMiddleware = require("./middleware/socketAuthMiddleware"); // ← see note below
const { setIO } = require("./modules/utils/socketStore");

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();
const port = process.env.PORT || 3000;   // fallback so listen() never gets undefined
const SCHEDULED_POST_PUBLISH_INTERVAL_MS = 30 * 1000;
let scheduledPostPublishTimer = null;

const requiredEnvVars = ["MONGO_URL", "JWT_SECRET", "REFRESH_SECRET"];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
    console.error(`Missing required environment variables: ${missingEnvVars.join(", ")}`);
    process.exit(1);
}

const allowedOrigins = String(process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

const corsOrigin = (origin, callback) => {
    // Allow non-browser requests (curl, health checks) with no Origin header.
    if (!origin) return callback(null, true);

    const normalizedOrigin = String(origin).trim().replace(/\/+$/, "");

    if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
    }

    return callback(new Error(`CORS origin not allowed: ${origin}`));
};

// ── Security ──────────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────
app.use(cors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// ── Rate limiting ─────────────────────────────────────────────────────────
// Global limiter – tightened; auth routes get their own tighter limiter below.
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 min
    max: 200,              // 200 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please try again later." }
});
app.use(globalLimiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,               // 20 login/register attempts per 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many auth attempts, please try again later." }
});

// ── Body parsing ──────────────────────────────────────────────────────────
// Tightened from 10 MB → 2 MB; raise again only if a dedicated upload endpoint
// is added that streams directly to storage.
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());

// ── Health check ──────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", message: "Server is running" });
});

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use("/api/auth", authLimiter, authRoutes);   // auth gets its own limiter
app.use("/api/workspace", workspaceRoutes);
app.use("/api/teams", teamsRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/overview", overviewRoutes);
app.use("/api/subtasks", subtaskRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/follow", followRoutes);
app.use("/api/user", usersRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/calls", callsRoutes);
app.use("/api/notifications", notificationRoutes);

// ---------------------------------------------------------------------------
// 404 handler  –  must come after all routes, before the error handler
// ---------------------------------------------------------------------------
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// ---------------------------------------------------------------------------
// Global error handler  –  must be last (4-param signature)
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {                     // eslint-disable-line no-unused-vars
    // Validation errors (Zod)
    if (err.name === "ZodError") {
        return res.status(400).json({
            success: false,
            message: "Validation error",
            errors: err.errors
        });
    }

    // JWT errors
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }

    if (typeof err.message === "string" && err.message.startsWith("CORS origin not allowed")) {
        return res.status(403).json({
            success: false,
            message: err.message
        });
    }

    // Mongoose / MongoDB errors
    if (err.name === "MongoServerError" || err.name === "MongooseError" || err.name === "ValidationError") {
        return res.status(500).json({
            success: false,
            message: "Database error occurred"
        });
    }

    // Default
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal server error",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    });
});

// ---------------------------------------------------------------------------
// HTTP server  +  Socket.IO
// ---------------------------------------------------------------------------
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    },
    // Prevent clients from reconnecting with stale tokens indefinitely
    pingTimeout: 60000,
    pingInterval: 25000
});

setIO(io);

// ── Socket.IO auth middleware ─────────────────────────────────────────────
// Runs once per connection, before any event handlers.
// Extracts & verifies the token, then attaches userId to the socket.
// See the companion file note at the bottom of this file.
io.use(socketAuthMiddleware);

// ── Per-socket event wiring ───────────────────────────────────────────────
// onlineUsers: userId → socketId  (single-device map; kept for backward-compat
// but the room-based broadcast in chat.socket.js is the primary delivery path)
const onlineUsers = new Map();

io.on("connection", (socket) => {
    const userId = socket.userId;                // stamped by socketAuthMiddleware

    // Register in the online map
    onlineUsers.set(userId, socket.id);

    console.log(`[socket] connected — user ${userId}, socket ${socket.id}`);

    // Hand off to socket event handlers
    chatSocketHandler(io, socket, onlineUsers);
    callSocketHandler(io, socket);

    // Clean up on disconnect
    socket.on("disconnect", () => {
        onlineUsers.delete(userId);
        console.log(`[socket] disconnected — user ${userId}, socket ${socket.id}`);
    });
});

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
const startScheduledPostPublisher = () => {
    if (scheduledPostPublishTimer) return;

    const publishDuePosts = async () => {
        try {
            await postService.publishDueScheduledPosts();
        } catch (error) {
            console.error("[post-scheduler] failed to publish due posts", error);
        }
    };

    publishDuePosts();
    scheduledPostPublishTimer = setInterval(publishDuePosts, SCHEDULED_POST_PUBLISH_INTERVAL_MS);

    if (typeof scheduledPostPublishTimer.unref === "function") {
        scheduledPostPublishTimer.unref();
    }
};

connectDB()
    .then(() => {
        startScheduledPostPublisher();

        httpServer.listen(port, () => {
            console.log("✅  DB connected successfully");
            console.log(`🚀  Server listening on port ${port}`);
            console.log(`🌍  Environment: ${process.env.NODE_ENV || "development"}`);
        });
    })
    .catch((err) => {
        console.error("❌  MongoDB connection ERROR:", err);
        process.exit(1);
    });

// ---------------------------------------------------------------------------
// Export  –  needed for tests and for any external tooling that references the
// Express app or the HTTP / Socket.IO servers.
// ---------------------------------------------------------------------------
module.exports = { app, httpServer, io };
