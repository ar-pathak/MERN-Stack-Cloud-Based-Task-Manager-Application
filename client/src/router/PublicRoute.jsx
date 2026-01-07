import { Navigate, Outlet } from "react-router";
import LoadingPage from "../common/components/LoadingPage";
import { useAuth } from "../context/AuthContext";

const PublicRoute = () => {
    const { isAuthenticated, loading } = useAuth();

    // While checking auth (loading state from AuthProvider)
    if (loading) {
        return <LoadingPage />;
    }

    // If authenticated, redirect to dashboard (prevent authenticated users from accessing public routes)
    if (isAuthenticated) {
        return <Navigate to="/main" replace />;
    }

    // Not authenticated - render public content
    return <Outlet />;
};

export default PublicRoute;
