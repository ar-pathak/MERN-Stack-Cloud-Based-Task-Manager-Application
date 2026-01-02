import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getUserInfo, login, logout, register } from "../service/auth.service";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const loadUser = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getUserInfo();
            const userData = res?.data?.user || res?.user || res?.data;
            
            if (userData) {
                setUser(userData);
                setIsAuthenticated(true);
                localStorage.setItem("user", JSON.stringify(userData));
            } else {
                setUser(null);
                setIsAuthenticated(false);
                localStorage.removeItem("user");
            }
        } catch (err) {
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem("user");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleLogin = useCallback(async (credentials) => {
        try {
            setLoading(true);
            await login(credentials);
            await loadUser();
            return { success: true };
        } catch (error) {
            setUser(null);
            setIsAuthenticated(false);
            return { 
                success: false, 
                error: error.message || "Login failed" 
            };
        } finally {
            setLoading(false);
        }
    }, [loadUser]);

    const handleRegister = useCallback(async (userData) => {
        try {
            setLoading(true);
            const response = await register(userData);
            if (response?.success || response?.data) {
                await loadUser();
            }
            return { success: true, data: response };
        } catch (error) {
            return { 
                success: false, 
                error: error.message || "Registration failed" 
            };
        } finally {
            setLoading(false);
        }
    }, [loadUser]);

    const handleLogout = useCallback(async () => {
        try {
            await logout();
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem("user");
            window.location.href = "/home/auth";
        }
    }, []);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                setIsAuthenticated(true);
            } catch (err) {
                localStorage.removeItem("user");
            }
        }
        loadUser();
    }, [loadUser]);

    const value = {
        user,
        setUser,
        loading,
        isAuthenticated,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        refreshUser: loadUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
