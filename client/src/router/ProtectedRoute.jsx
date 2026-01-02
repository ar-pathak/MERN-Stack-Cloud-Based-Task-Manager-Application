import { Navigate, Outlet } from "react-router";
import LoadingPage from "../common/components/LoadingPage";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  // While checking auth (loading state from AuthProvider)
  if (loading) {
    return <LoadingPage />;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/home/auth" replace />;
  }

  // Authenticated - render protected content
  return <Outlet />;
};

export default ProtectedRoute;
