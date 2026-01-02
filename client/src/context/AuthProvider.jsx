import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { AuthContext } from "./AuthContext";
import { login as loginService, logout as logoutService, register as registerService, getUserInfo } from "../service/auth.service";


export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

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
    }, []);

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
