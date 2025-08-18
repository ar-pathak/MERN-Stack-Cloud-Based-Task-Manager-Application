import { createBrowserRouter } from "react-router";
import { lazy, Suspense } from "react";
import App from "./App";
const Login = lazy(() => import("./pages/Login"));

const router = createBrowserRouter([
  {
    path: "/",
    element: (
        <App/>
    ),
    children: [
      {
        path: "/login",
        element: (
          <Suspense fallback={<div>Loading...</div>}>
            <Login />
          </Suspense>
        ),
      },
    ],
  },
]);

export default router;
