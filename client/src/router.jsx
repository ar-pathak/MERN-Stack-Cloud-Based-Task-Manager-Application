import { createBrowserRouter } from "react-router";
import { lazy, Suspense } from "react";
import App from "./App";
import LoadingPage from "./common/components/LoadingPage";
import ErrorPage from "./common/components/ErrorPage";
import ProjectsPage from "./features/dashboard/features/projects/pages/ProjectsPage";
import ActivityPage from "./features/dashboard/features/activity/pages/ActivityPage";
const AuthPage = lazy(() => import("./features/authentication/pages/AuthPage"));
const HomePage = lazy(() => import("./features/home/pages/HomePage"))
const DashboardPage = lazy(() => import("./features/dashboard/pages/DashboardPage"))
const Overview = lazy(() => import("./features/dashboard/features/overview/pages/Overview"))
const MyTasksPage = lazy(() => import("./features/dashboard/features/myTasks/pages/MyTasksPage"))

const withSuspense = ( Component ) => (
  <Suspense fallback={<LoadingPage />}>
    <Component />
  </Suspense>
);


const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <App />
    ),
    errorElement: <ErrorPage />,
    children: [

      {
        path: "dashboard",
        element: withSuspense(DashboardPage),
        children: [
          { index: true, element: withSuspense(Overview) },
          { path: "my-tasks", element: withSuspense(MyTasksPage) },
          { path: "projects", element: withSuspense(ProjectsPage) },
          { path: "activity", element: withSuspense(ActivityPage) },
        ],
      },
      {
        path: "/home",
        element: (
          <Suspense fallback={<LoadingPage />}>
            <HomePage />
          </Suspense>
        ),
      },
      {
        path: "/auth",
        element: (
          <Suspense fallback={<LoadingPage />}>
            <AuthPage />
          </Suspense>
        ),
      },
    ],
  },
]);

export default router;
