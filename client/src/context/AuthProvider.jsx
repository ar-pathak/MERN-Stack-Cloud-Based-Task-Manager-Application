import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { AuthContext } from "./AuthContext";
import { login as loginService, logout as logoutService, register as registerService, getUserInfo } from "../service/auth.service";
import { updateActivity as updateUserActivity } from "../service/user.service";

const isProtectedRoutePath = (pathname = "") => {
    const path = String(pathname || "");
    return (
        path.startsWith("/main")
        || path.startsWith("/profile/")
        || path.startsWith("/chat/")
        || path.startsWith("/post/")
    );
};


export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    const loadUser = useCallback(async () => {
        // Ensure we don't stay on the loading screen indefinitely if the
        // backend is unreachable or requests hang. Use a short client-side
        // timeout (5s) as a fallback to allow the app to render public routes.
        setLoading(true);
        let timedOut = false;
        const TIMEOUT_MS = 5000;

        const timeoutId = setTimeout(() => {
            timedOut = true;
            setLoading(false);
        }, TIMEOUT_MS);

        try {
            const res = await getUserInfo();
            console.log("User info loaded:", res);
            if (!timedOut) {
                setUser(res?.data?.user || null);
            }
        } catch (err) {
            if (!timedOut) {
                setUser(null);
            }
        } finally {
            if (!timedOut) {
                clearTimeout(timeoutId);
                setLoading(false);
            }
        }
    }, []);


    useEffect(() => {
        loadUser();
    }, [loadUser]);

    useEffect(() => {
        const userId = user?._id || user?.id;
        if (!userId) return undefined;

        let mounted = true;
        const pushActivity = async (isOnline) => {
            if (!mounted) return;
            await updateUserActivity(isOnline);
        };

        pushActivity(true);

        const handleVisibility = () => {
            pushActivity(document.visibilityState === "visible");
        };

        const handleBeforeUnload = () => {
            updateUserActivity(false);
        };

        document.addEventListener("visibilitychange", handleVisibility);
        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            mounted = false;
            document.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("beforeunload", handleBeforeUnload);
            updateUserActivity(false);
        };
    }, [user?._id, user?.id]);

    useEffect(() => {
        const handleSessionExpired = () => {
            setUser(null);
            localStorage.removeItem("user");

            if (isProtectedRoutePath(location.pathname)) {
                navigate('/home/auth', { replace: true });
            }
        };

        window.addEventListener("auth:session-expired", handleSessionExpired);
        return () => window.removeEventListener("auth:session-expired", handleSessionExpired);
    }, [location.pathname, navigate]);

    // Wrapped login function that updates user state
    const login = useCallback(async (credentials) => {
        const response = await loginService(credentials);
        // Reload user data after successful login
        await loadUser();
        return response;
    }, [loadUser]);

    // Wrapped register function that updates user state
    const register = useCallback(async (userData) => {
        const response = await registerService(userData);
        // Reload user data after successful registration
        await loadUser();
        return response;
    }, [loadUser]);

    // Wrapped logout function that clears user state and handles navigation
    const logout = useCallback(async () => {
        try {
            await logoutService();
            // Clear user state
            setUser(null);
            // Clear localStorage
            localStorage.removeItem("user");
            // Redirect to home/auth
            navigate('/home/auth', { replace: true });
        } catch (error) {
            // Even if logout fails, clear local state
            setUser(null);
            localStorage.removeItem("user");
            navigate('/home/auth', { replace: true });
            throw error;
        }
    }, [navigate]);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                loading,
                login,
                logout,
                register,
                refreshUser: loadUser
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
