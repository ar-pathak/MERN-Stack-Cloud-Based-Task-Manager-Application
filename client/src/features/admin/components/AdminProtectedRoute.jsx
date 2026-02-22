import { Navigate, Outlet, useLocation } from "react-router";
import { Loader2 } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";

const AdminProtectedRoute = () => {
    const { loading, isAuthenticated } = useAdminAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
                <Loader2 className="h-5 w-5 animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <Navigate
                to="/admin/auth"
                replace
                state={{ from: `${location.pathname}${location.search}` }}
            />
        );
    }

    return <Outlet />;
};

export default AdminProtectedRoute;
