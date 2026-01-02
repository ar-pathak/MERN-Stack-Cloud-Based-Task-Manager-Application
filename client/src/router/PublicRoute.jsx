import { Navigate, Outlet } from "react-router";
import LoadingPage from "../common/components/LoadingPage";
import { useAuthCheck } from "../hooks/useAuthCheck";

const PublicRoute = () => {
    const { isAuth } = useAuthCheck();

    if (isAuth === null) {
        return <LoadingPage/>;
    }

    if (isAuth) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default PublicRoute;
