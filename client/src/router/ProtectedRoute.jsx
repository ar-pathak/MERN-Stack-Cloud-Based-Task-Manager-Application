import { Navigate, Outlet } from "react-router";

const ProtectedRoute = () => {
  const isAuthenticated = true; // replace with real auth logic

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
