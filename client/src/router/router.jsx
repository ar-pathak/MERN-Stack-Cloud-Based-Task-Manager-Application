import { createBrowserRouter, Navigate } from "react-router";
import { lazy, Suspense } from "react";
import App from "../App";
import LoadingPage from "../common/components/LoadingPage";
import ErrorPage from "../common/components/ErrorPage";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";

const AuthPage = lazy(() => import("../features/authentication/pages/AuthPage"));
const HomePage = lazy(() => import("../features/home/pages/HomePage"));
const DashboardPage = lazy(() => import("../features/dashboard/pages/DashboardPage"));
const Overview = lazy(() => import("../features/dashboard/features/overview/pages/Overview"));
const MyTasksPage = lazy(() => import("../features/dashboard/features/myTasks/pages/MyTasksPage"));
const ProjectsPage = lazy(() => import("../features/dashboard/features/projects/pages/ProjectsPage"));
const ActivityPage = lazy(() => import("../features/dashboard/features/activity/pages/ActivityPage"));
const SchedulePage = lazy(() => import("../features/dashboard/features/schedule/pages/SchedulePage"));

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
        ],
      },

      // 🔒 Protected Routes (only for logged-in users)
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "dashboard",
            element: withSuspense(DashboardPage),
            children: [
              { index: true, element: withSuspense(Overview) },
              { path: "my-tasks", element: withSuspense(MyTasksPage) },
              { path: "projects", element: withSuspense(ProjectsPage) },
              { path: "activity", element: withSuspense(ActivityPage) },
              { path: "schedule", element: withSuspense(SchedulePage) },
            ],
          },
        ],
      },
    ],
  },
]);

export default router;
