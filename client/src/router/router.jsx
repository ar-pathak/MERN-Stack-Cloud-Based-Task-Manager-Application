import { createBrowserRouter, Navigate } from "react-router";
import { lazy, Suspense } from "react";
import App from "../App";
import LoadingPage from "../common/components/LoadingPage";
import ErrorPage from "../common/components/ErrorPage";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";

const AuthPage = lazy(() => import("../features/authentication/pages/AuthPage"));
const HomePage = lazy(() => import("../features/home/pages/HomePage"));
const MainPage = lazy(() => import("../features/main/MainPage.jsx"));
const OverviewLayout = lazy(() => import("../features/main/features/overview/pages/OverviewLayout.jsx"));
const FeedPage = lazy(() => import("../features/main/features/feed/pages/FeedPage.jsx"));
const PostDetailPage = lazy(() => import("../features/main/features/feed/pages/PostDetailPage.jsx"));
const NotificationsPage = lazy(() => import("../features/main/features/notifications/pages/NotificationsPage.jsx"));
const CreatePostPage = lazy(() => import("../features/main/features/create/pages/CreatePostPage.jsx"));
const ActivityPage = lazy(() => import("../features/main/features/activity/pages/ActivityPage.jsx"));
const SettingsPage = lazy(() => import("../features/settings/SettingsPage.jsx"));
const UserProfile = lazy(() => import("../features/profile/UserProfile.jsx"))
const ChatPage = lazy(() => import("../features/chat/ChatPage.jsx"))
// const MyTasksPage = lazy(() => import("../features/dashboard/features/myTasks/pages/MyTasksPage"));
// const ProjectsPage = lazy(() => import("../features/dashboard/features/projects/pages/ProjectsPage"));
// const SchedulePage = lazy(() => import("../features/dashboard/features/schedule/pages/SchedulePage"));

const withSuspense = (Component) => (
  <Suspense fallback={<LoadingPage />}>
    <Component />
  </Suspense>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Navigate to="/home" replace />,
      },

      // 🌐 Public Routes (only for non-auth users)
      {
        element: <PublicRoute />,
        children: [
          {
            path: "home",
            element: withSuspense(HomePage),
          },
          {
            path: "home/auth",
            element: withSuspense(AuthPage),
          },
          {
            path: "home/auth/reset-password/:token",
            element: withSuspense(AuthPage),
          },
        ],
      },

      // 🔒 Protected Routes (only for logged-in users)
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "main",
            element: withSuspense(MainPage),
                children: [
                  { index: true, element: withSuspense(OverviewLayout) },
                  { path: "feed", element: withSuspense(FeedPage) },
                  { path: "notifications", element: withSuspense(NotificationsPage) },
                  { path: "activity", element: withSuspense(ActivityPage) },
                  { path: "create", element: withSuspense(CreatePostPage) },
                  { path: "settings", element: withSuspense(SettingsPage) },
                  // { path: "my-tasks", element: withSuspense(MyTasksPage) },
                  // { path: "projects", element: withSuspense(ProjectsPage) },
              // { path: "schedule", element: withSuspense(SchedulePage) },
            ],
          },
           {
            path: "profile/:id",
            element: withSuspense(UserProfile),
          },
          {
            path: "chat/:id",
            element: withSuspense(ChatPage),
          },
          {
            path: "post/:id",
            element: withSuspense(PostDetailPage),
          }
        ],
      },
    ],
  },
]);

export default router;
