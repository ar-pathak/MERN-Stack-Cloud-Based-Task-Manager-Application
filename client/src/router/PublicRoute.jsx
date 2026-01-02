import { Navigate, Outlet } from "react-router";
import { useEffect, useState } from "react";
import isUserAuthenticated from "../utils/checkAuthentication";

const PublicRoute = () => {
    const [isAuth, setIsAuth] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            const res = await isUserAuthenticated();
            setIsAuth(res?.success === true);
        };
        checkAuth();
    }, []);

    if (isAuth === null) {
        return <div>Loading...</div>;
    }

    if (isAuth) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default PublicRoute;
