import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { AuthContext } from "./AuthContext";
import {
    login as loginService,
    logout as logoutService,
    register as registerService,
    getStoredUser,
    getUserInfo
} from "../service/auth.service";
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

const readStoredUser = () => {
    try {
        return getStoredUser();
    } catch {
        return null;
    }
};


export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(readStoredUser);
    const [loading, setLoading] = useState(() => readStoredUser() == null);
    const shouldBackgroundLoadRef = useRef(Boolean(readStoredUser()));
    const navigate = useNavigate();
    const location = useLocation();

    const loadUser = useCallback(async ({ background = false } = {}) => {
        // Ensure we don't stay on the loading screen indefinitely if the
        // backend is unreachable or requests hang. Use a short client-side
        // timeout (2.5s) as a fallback to allow the app to render public routes.
        if (!background) {
            setLoading(true);
        }

        let timedOut = false;
        const TIMEOUT_MS = 2500;

        const timeoutId = setTimeout(() => {
            timedOut = true;
            setLoading(false);
        }, TIMEOUT_MS);

        try {
            const res = await getUserInfo();
            const nextUser = res?.data?.user || null;
            if (!timedOut) {
                setUser(nextUser);
            }

            if (nextUser) {
                localStorage.setItem("user", JSON.stringify(nextUser));
            } else {
                localStorage.removeItem("user");
            }
        } catch (_err) {
            if (!timedOut) {
                setUser(null);
            }
            localStorage.removeItem("user");
        } finally {
            if (!timedOut) {
                clearTimeout(timeoutId);
                setLoading(false);
            }
        }
    }, []);


    useEffect(() => {
        loadUser({ background: shouldBackgroundLoadRef.current });
        shouldBackgroundLoadRef.current = false;
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

    const contextValue = useMemo(
        () => ({
            user,
            isAuthenticated: !!user,
            loading,
            login,
            logout,
            register,
            refreshUser: loadUser,
        }),
        [user, loading, login, logout, register, loadUser]
    );

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
