import { createBrowserRouter, Navigate } from "react-router";
import { lazy, Suspense } from "react";
import App from "../App";
import LoadingPage from "../common/components/LoadingPage";
import ErrorPage from "../common/components/ErrorPage";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import AdminProtectedRoute from "../features/admin/components/AdminProtectedRoute";
import AdminPublicRoute from "../features/admin/components/AdminPublicRoute";

// 🔥 IMPORT SERVICES FOR LOADERS
import { getUserById } from "../service/user.service";
import { getNotifications } from "../service/notification.service";
import { getOverviewActivity } from "../service/overview.service";
import { getUserFeed } from "../service/post.service";

// 🚀 SWR CACHES WITH TTL (Time-To-Live)
// Yeh loops aur duplicate requests ko 100% block karega
const CACHE_TTL = 15000; // 15 Seconds

const profileCache = new Map();
const profileTimestamps = new Map();

let notificationsCache = null;
let notifTimestamp = 0;

let overviewCache = null;
let overviewTimestamp = 0;

let feedCache = null; 
let feedTimestamp = 0;

export const profileLoader = async ({ params }) => {
  const id = params.id;
  if (!id) return null;

  const now = Date.now();
  // Agar data 15 sec ke andar ka hai, toh API call mat karo
  if (profileCache.has(id) && (now - profileTimestamps.get(id) < CACHE_TTL)) {
    return profileCache.get(id);
  }

  try {
    const payload = await getUserById(id);
    const data = payload?.user || payload;
    profileCache.set(id, data);
    profileTimestamps.set(id, Date.now());
    return data;
  } catch {
    return profileCache.get(id) || null;
  }
};

export const notificationsLoader = async () => {
  const now = Date.now();
  if (notificationsCache && (now - notifTimestamp < CACHE_TTL)) {
    return notificationsCache;
  }

  try {
    const payload = await getNotifications({ limit: 50 });
    notificationsCache = payload?.notifications || payload?.data || payload || [];
    notifTimestamp = Date.now();
    return notificationsCache;
  } catch {
    return notificationsCache || [];
  }
};

export const overviewLoader = async () => {
  const now = Date.now();
  if (overviewCache && (now - overviewTimestamp < CACHE_TTL)) {
    return overviewCache;
  }

  try {
    const res = await getOverviewActivity();
    const payload = res?.data?.data || res?.data || res;
    overviewCache = Array.isArray(payload) ? payload : [];
    overviewTimestamp = Date.now();
    return overviewCache;
  } catch {
    return overviewCache || [];
  }
};

export const feedLoader = async () => {
  const now = Date.now();
  if (feedCache && (now - feedTimestamp < CACHE_TTL)) {
    return feedCache;
  }

  try {
    const payload = await getUserFeed({ page: 1, limit: 20 });
    feedCache = payload?.posts || payload?.data || payload || [];
    feedTimestamp = Date.now();
    return feedCache;
  } catch {
    return feedCache || [];
  }
};

// Critical routes - load immediately
const AuthPage = lazy(() => import("../features/authentication/pages/AuthPage"));
const HomePage = lazy(() => import("../features/home/pages/HomePage"));
const MainPage = lazy(() => import("../features/main/MainPage.jsx"));
const OverviewLayout = lazy(() => import("../features/main/features/overview/pages/OverviewLayout.jsx"));

// Secondary routes - load on demand
const OAuthCallbackPage = lazy(() => import("../features/authentication/pages/OAuthCallbackPage"));
const VerifyEmailPage = lazy(() => import("../features/authentication/pages/VerifyEmailPage"));
const FeedPage = lazy(() => import("../features/main/features/feed/pages/FeedPage.jsx"));
const PostDetailPage = lazy(() => import("../features/main/features/feed/pages/PostDetailPage.jsx"));
const NotificationsPage = lazy(() => import("../features/main/features/notifications/pages/NotificationsPage.jsx"));
const CreatePostPage = lazy(() => import("../features/main/features/create/pages/CreatePostPage.jsx"));
const ActivityPage = lazy(() => import("../features/main/features/activity/pages/ActivityPage.jsx"));
const AdvancedDashboardPage = lazy(() => import("../features/main/features/dashboard/pages/AdvancedDashboardPage.jsx"));
const HelpSupportPage = lazy(() => import("../features/main/features/support/pages/HelpSupportPage.jsx"));
const SettingsPage = lazy(() => import("../features/settings/SettingsPage.jsx"));
const UserProfile = lazy(() => import("../features/profile/UserProfile.jsx"));
const ChatPage = lazy(() => import("../features/chat/ChatPage.jsx"));
const WorkspaceInviteAcceptPage = lazy(() => import("../features/workspace/WorkspaceInviteAcceptPage.jsx"));
const AdminApp = lazy(() => import("../features/admin/AdminApp.jsx"));
const AdminAuthPage = lazy(() => import("../features/admin/pages/AdminAuthPage.jsx"));
const AdminVerifyEmailPage = lazy(() => import("../features/admin/pages/AdminVerifyEmailPage.jsx"));
const AdminResetPasswordPage = lazy(() => import("../features/admin/pages/AdminResetPasswordPage.jsx"));
const AdminSupportPanelPage = lazy(() => import("../features/admin/pages/AdminSupportPanelPage.jsx"));

const withSuspense = (Component) => {
  const ResolvedComponent = Component;
  return (
    <Suspense fallback={<LoadingPage />}>
      <ResolvedComponent />
    </Suspense>
  );
};

const SubtleFallback = () => (
  <div className="flex h-full w-full items-start justify-center bg-slate-950 pt-20">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-sky-500" />
  </div>
);

const withSubtleSuspense = (Component) => {
  const ResolvedComponent = Component;
  return (
    <Suspense fallback={<SubtleFallback />}>
      <ResolvedComponent />
    </Suspense>
  );
};

const preloadCriticalRoutes = () => {
  Promise.all([
    import("../features/main/features/feed/pages/FeedPage.jsx"),
    import("../features/main/features/notifications/pages/NotificationsPage.jsx"),
    import("../features/main/features/create/pages/CreatePostPage.jsx"),
    import("../features/main/features/overview/pages/OverviewLayout.jsx")
  ]).catch(console.error);
};

let preloaded = false;
const preloadOnInteraction = () => {
  if (preloaded) return;
  preloaded = true;
  setTimeout(() => {
    import("../features/main/features/dashboard/pages/AdvancedDashboardPage.jsx");
    import("../features/main/features/activity/pages/ActivityPage.jsx");
    import("../features/chat/ChatPage.jsx");
  }, 2000);
};

if (typeof window !== 'undefined') {
  const handleInteraction = () => {
    preloadOnInteraction();
    window.removeEventListener('click', handleInteraction);
    window.removeEventListener('keydown', handleInteraction);
    window.removeEventListener('touchstart', handleInteraction);
  };
  window.addEventListener('click', handleInteraction);
  window.addEventListener('keydown', handleInteraction);
  window.addEventListener('touchstart', handleInteraction);
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "email-verification/:token",
        element: withSuspense(VerifyEmailPage),
      },
      {
        path: "invites/accept/:token",
        element: withSuspense(WorkspaceInviteAcceptPage),
      },
      {
        path: "home/auth/oauth/callback",
        element: withSuspense(OAuthCallbackPage),
      },
      {
        element: <PublicRoute />,
        children: [
          { index: true, element: withSuspense(HomePage) },
          { path: "home", element: withSuspense(HomePage) },
          { path: "home/auth", element: withSuspense(AuthPage) },
          { path: "home/auth/reset-password/:token", element: withSuspense(AuthPage) },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "main",
            element: withSuspense(MainPage),
            children: [
              {
                index: true,
                element: withSubtleSuspense(OverviewLayout),
                loader: overviewLoader
              },
              {
                path: "feed",
                element: withSubtleSuspense(FeedPage),
                loader: feedLoader 
              },
              {
                path: "notifications",
                element: withSubtleSuspense(NotificationsPage),
                loader: notificationsLoader
              },
              { path: "activity", element: withSubtleSuspense(ActivityPage) },
              { path: "dashboard", element: withSubtleSuspense(AdvancedDashboardPage) },
              { path: "support", element: withSubtleSuspense(HelpSupportPage) },
              { path: "create", element: withSubtleSuspense(CreatePostPage) },
              { path: "settings", element: withSubtleSuspense(SettingsPage) },
            ],
          },
          {
            path: "profile/:id",
            element: withSubtleSuspense(UserProfile),
            loader: profileLoader,
          },
          {
            path: "chat/:id",
            element: withSubtleSuspense(ChatPage),
          },
          {
            path: "post/:id",
            element: withSubtleSuspense(PostDetailPage),
          },
        ],
      },
    ],
  },
  {
    path: "/admin",
    element: withSuspense(AdminApp),
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Navigate to="/admin/panel" replace /> },
      { path: "verify-email/:token", element: withSuspense(AdminVerifyEmailPage) },
      {
        element: <AdminPublicRoute />,
        children: [
          { path: "auth", element: withSuspense(AdminAuthPage) },
          { path: "auth/reset-password/:token", element: withSuspense(AdminResetPasswordPage) },
        ],
      },
      {
        element: <AdminProtectedRoute />,
        children: [
          { path: "panel", element: withSuspense(AdminSupportPanelPage) },
        ],
      },
    ],
  },
]);

preloadCriticalRoutes();

export default router;