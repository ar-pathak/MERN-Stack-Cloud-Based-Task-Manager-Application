import { createBrowserRouter } from "react-router";
import { lazy, Suspense } from "react";
import App from "./App";
const AuthPage = lazy(() => import("./features/authentication/pages/AuthPage"));

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <App />
    ),
    children: [
      {
        path: "/auth",
        element: (
          <Suspense fallback={<div>Loading...</div>}>
            <AuthPage />
          </Suspense>
        ),
      },
    ],
  },
]);

export default router;
