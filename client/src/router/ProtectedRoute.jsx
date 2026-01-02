import { Navigate, Outlet } from "react-router";
import LoadingPage from "../common/components/LoadingPage";
import { useAuthCheck } from "../hooks/useAuthCheck";

const ProtectedRoute = () => {
  const { isAuth, error } = useAuthCheck();

  // While checking auth
  if (isAuth === null) {
    return <LoadingPage />; // loader component here
  }

  // Not authenticated
  if (!isAuth) {
    return <Navigate to="/home/auth" replace />;
  }

  // Authenticated
  return <Outlet />;
};

export default ProtectedRoute;
