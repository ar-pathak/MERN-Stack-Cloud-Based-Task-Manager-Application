import { useEffect, useState } from "react";
import isUserAuthenticated from "../utils/checkAuthentication";

export const useAuthCheck = () => {
    const [isAuth, setIsAuth] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                setLoading(true);
                const res = await isUserAuthenticated();
                setIsAuth(res?.success === true);
                if (!res?.success) {
                    setError(res?.error);
                } else {
                    setError(null);
                }
            } catch (err) {
                setIsAuth(false);
                setError(err.message || "Authentication check failed");
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    return { isAuth, error, loading };
};