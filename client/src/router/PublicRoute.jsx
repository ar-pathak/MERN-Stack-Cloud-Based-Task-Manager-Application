import { Navigate, Outlet } from "react-router";
import { useAuth } from "../context/AuthContext";

const PublicRoute = () => {
    const { isAuthenticated, loading } = useAuth();

    // Render public pages immediately; auth check continues in background.
    if (loading) {
        return <Outlet />;
    }

    // If authenticated, redirect to dashboard (prevent authenticated users from accessing public routes)
    if (isAuthenticated) {
        return <Navigate to="/main" replace />;
    }

    // Not authenticated - render public content
    return <Outlet />;
};

export default PublicRoute;
