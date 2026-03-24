import { Navigate, Outlet } from "react-router";
import { useAuth } from "../context/AuthContext";
import LoadingPage from "../common/components/LoadingPage"; // Ensure this path is correct for your structure

const PublicRoute = () => {
    const { isAuthenticated, loading } = useAuth();

    // FIX: Render a loader while checking auth state so users don't see public pages flash before redirecting
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