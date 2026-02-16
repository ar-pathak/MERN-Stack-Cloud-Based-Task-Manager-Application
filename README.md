# Aurora

Aurora is a full-stack MERN collaboration platform that combines workspace planning, real-time communication, analytics, and social collaboration in one product.

## What Aurora Includes

- `Aurora Workspace`: multi-workspace organization with invites, member management, and role-based permissions (`owner`, `admin`, `member`, `viewer`).
- `Aurora Flow`: projects, tasks, subtasks, assignees, statuses, and activity tracking.
- `Aurora Connect`: real-time chat, typing/read receipts, message updates, and 1:1/group calling.
- `Aurora Insights`: overview timeline and advanced dashboard analytics.
- Social layer: feed posts, stories, follows, profile activity, notifications.
- Support layer: help center articles, tickets, contact, and feedback endpoints.

## Tech Stack

- Frontend: React 19, Vite 7, React Router, Redux Toolkit, Tailwind CSS v4, Framer Motion, Socket.IO Client, Recharts.
- Backend: Node.js, Express 5, MongoDB + Mongoose, Socket.IO, Zod validation, JWT auth, Nodemailer, Cloudinary uploads.

## Project Structure

```text
client/
  src/
    features/
      home/
      authentication/
      main/
      chat/
      profile/
    router/
    context/
    service/
    store/
server/
  src/
    app.js
    config/
    middleware/
    helpers/
    models/
    modules/
      auth/
      workspace/
      projects/
      tasks/
      subtask/
      team/
      overview/
      activity/
      chat/
      call/
      notification/
      posts/
      stories/
      follow/
      user/
      upload/
      support/
```

## Prerequisites

- Node.js `^20.19.0 || >=22.12.0` (required by Vite 7).
- npm.
- MongoDB database.
- Cloudinary account (for upload/media endpoints).
- Gmail SMTP credentials (for password reset, verification, invites).

## Setup

1. Install dependencies:

```bash
npm install --prefix server
npm install --prefix client
```

2. Create environment files:

- `server/.env`
- `client/.env`

3. Configure environment variables.

### Server Environment (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `MONGO_URL` | Yes | MongoDB connection string. |
| `JWT_SECRET` | Yes | Access token signing secret. |
| `REFRESH_SECRET` | Yes | Refresh token signing secret. |
| `PORT` | No | API port (default `3000`). |
| `FRONTEND_URL` | Recommended | Allowed frontend origin(s), comma-separated if multiple. |
| `EMAIL_USER` | For mail features | Gmail account used by Nodemailer. |
| `EMAIL_PASS` | For mail features | Gmail app password/token. |
| `CLOUDINARY_CLOUD_NAME` | For upload features | Cloudinary config. |
| `CLOUDINARY_API_KEY` | For upload features | Cloudinary config. |
| `CLOUDINARY_API_SECRET` | For upload features | Cloudinary config. |
| `BCRYPT_SALT_ROUNDS` | No | Password hash rounds (default `10`). |
| `NODE_ENV` | No | Environment (`development`/`production`). |
| `COOKIE_SECURE` | No | Force secure cookies (`true`/`false`). |
| `COOKIE_DOMAIN` | No | Cookie domain override. |
| `COOKIE_SAME_SITE` | No | `lax`, `strict`, or `none`. |

### Client Environment (`client/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Backend base URL, e.g. `http://localhost:3000`. |
| `VITE_TURN_URLS` | Optional | Comma-separated TURN server URLs for WebRTC. |
| `VITE_TURN_USERNAME` | Optional | TURN username. |
| `VITE_TURN_CREDENTIAL` | Optional | TURN credential/password. |

## Run Locally

Start backend:

```bash
npm run dev --prefix server
```

Start frontend:

```bash
npm run dev --prefix client
```

App URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Health check: `GET /health`

## Available Scripts

### Client (`client/package.json`)

- `npm run dev --prefix client`
- `npm run build --prefix client`
- `npm run lint --prefix client`
- `npm run preview --prefix client`

### Server (`server/package.json`)

- `npm run dev --prefix server`
- `npm run start --prefix server`

## API Surface (High-Level)

Base routes mounted in `server/src/app.js`:

- `/api/auth`
- `/api/workspace`
- `/api/teams`
- `/api/projects`
- `/api/tasks`
- `/api/subtasks`
- `/api/overview`
- `/api/activity`
- `/api/chat`
- `/api/calls`
- `/api/notifications`
- `/api/posts`
- `/api/stories`
- `/api/follow`
- `/api/user`
- `/api/upload`
- `/api/support`

## Realtime Architecture

- Socket.IO server is attached in `server/src/app.js`.
- Chat events are handled in `server/src/modules/chat/chat.socket.js`.
- Call signaling/events are handled in `server/src/modules/call/Call.socket.js`.
- Frontend socket client: `client/src/service/Chat.socket.service.js`.
- WebRTC call orchestration: `client/src/features/main/features/overview/hook/useWebRTC.js`.

## Security and Auth Notes

- Cookie-based auth with `httpOnly` access + refresh cookies.
- Refresh-token rotation and DB-backed refresh token storage.
- Route-level auth middleware and workspace role enforcement.
- Global + auth-specific rate limiting.
- `helmet` security headers and strict CORS origin checking.

## Current Gaps

- No automated test suite is configured yet.
- Root monorepo scripts are not defined; `client` and `server` are run separately.

## License

This project is licensed under the ISC License. See `LICENSE`.
