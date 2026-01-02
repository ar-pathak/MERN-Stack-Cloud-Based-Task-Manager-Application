import { Navigate, Outlet } from "react-router";
import { useEffect, useState } from "react";
import isUserAuthenticated from "../utils/checkAuthentication";

const ProtectedRoute = () => {
  const [isAuth, setIsAuth] = useState(null); // null = loading

  useEffect(() => {
    const checkAuth = async () => {
      const res = await isUserAuthenticated();
      setIsAuth(res?.success === true);
    };

    checkAuth();
  }, []);

  // While checking auth
  if (isAuth === null) {
    return <div>Checking authentication...</div>; // loader component here
  }

  // Not authenticated
  if (!isAuth) {
    return <Navigate to="/home/auth" replace />;
  }

  // Authenticated
  return <Outlet />;
};

export default ProtectedRoute;
