import { useCallback, useEffect, useMemo, useState } from "react";
import {
    forgotAdminPassword,
    getAdminMe,
    loginAdmin,
    logoutAdmin,
    requestAdminVerification,
    registerAdmin,
    resetAdminPassword,
    sendAdminVerificationEmail,
    verifyAdminLoginOtp,
    verifyAdminEmail
} from "../../../service/adminAuth.service";
import AdminAuthContext from "./AdminAuthContext";

const ADMIN_STORAGE_KEY = "aurora_admin_session";

const readStoredAdmin = () => {
    try {
        if (typeof window === "undefined") return null;
        const raw = window.sessionStorage.getItem(ADMIN_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const writeStoredAdmin = (admin) => {
    if (typeof window === "undefined") return;
    if (!admin) {
        window.sessionStorage.removeItem(ADMIN_STORAGE_KEY);
        return;
    }
    window.sessionStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admin));
};

export const AdminAuthProvider = ({ children }) => {
    const [admin, setAdmin] = useState(readStoredAdmin);
    const [loading, setLoading] = useState(true);

    const loadAdmin = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getAdminMe();
            const nextAdmin = result?.admin || null;
            setAdmin(nextAdmin);
            writeStoredAdmin(nextAdmin);
            return nextAdmin;
        } catch {
            setAdmin(null);
            writeStoredAdmin(null);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAdmin();
    }, [loadAdmin]);

    const login = useCallback(async (payload) => {
        const result = await loginAdmin(payload);
        if (result?.otpRequired) {
            return result;
        }
        await loadAdmin();
        return result;
    }, [loadAdmin]);

    const verifyLoginOtp = useCallback(async (payload) => {
        await verifyAdminLoginOtp(payload);
        return loadAdmin();
    }, [loadAdmin]);

    const register = useCallback((payload) => registerAdmin(payload), []);

    const logout = useCallback(async () => {
        await logoutAdmin();
        setAdmin(null);
        writeStoredAdmin(null);
    }, []);

    const sendVerification = useCallback(() => sendAdminVerificationEmail(), []);
    const verifyEmailAction = useCallback((token) => verifyAdminEmail(token), []);
    const forgotPassword = useCallback((email) => forgotAdminPassword(email), []);
    const requestVerificationByEmail = useCallback(
        (email) => requestAdminVerification(email),
        []
    );
    const resetPassword = useCallback((payload) => resetAdminPassword(payload), []);

    const value = useMemo(
        () => ({
            admin,
            loading,
            isAuthenticated: Boolean(admin),
            login,
            register,
            logout,
            refreshAdmin: loadAdmin,
            verifyLoginOtp,
            sendVerification,
            verifyEmail: verifyEmailAction,
            forgotPassword,
            requestVerificationByEmail,
            resetPassword
        }),
        [
            admin,
            loading,
            login,
            register,
            logout,
            loadAdmin,
            verifyLoginOtp,
            sendVerification,
            verifyEmailAction,
            forgotPassword,
            requestVerificationByEmail,
            resetPassword
        ]
    );

    return (
        <AdminAuthContext.Provider value={value}>
            {children}
        </AdminAuthContext.Provider>
    );
};
