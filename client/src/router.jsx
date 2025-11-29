import { createBrowserRouter } from "react-router";
import { lazy, Suspense } from "react";
import App from "./App";
import LoadingPage from "./common/components/LoadingPage";
import ErrorPage from "./common/components/ErrorPage";
const AuthPage = lazy(() => import("./features/authentication/pages/AuthPage"));

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <App />
    ),
    errorElement: <ErrorPage />,
    children: [
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
