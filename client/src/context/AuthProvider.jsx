import { useState, useEffect, useCallback } from "react";
import { AuthContext } from "./AuthContext";
import { login, logout, register, getUserInfo } from "../service/auth.service";

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadUser = useCallback(async () => {
        try {
            const res = await getUserInfo();
            setUser(res?.data?.user || null);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

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
