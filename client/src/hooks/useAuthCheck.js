import { useEffect, useState } from "react";
import isUserAuthenticated from "../utils/checkAuthentication";

export const useAuthCheck = () => {
    const [isAuth, setIsAuth] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            const res = await isUserAuthenticated();
            setIsAuth(res?.success === true);
            if (!res?.success) {
                setError(res?.error);
            }
        };
        checkAuth();
    }, []);

    return { isAuth, error };
};