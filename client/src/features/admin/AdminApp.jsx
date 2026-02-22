import { Outlet } from "react-router";
import { Toaster } from "sonner";
import { AdminAuthProvider } from "./context/AdminAuthProvider";

const AdminApp = () => {
    return (
        <AdminAuthProvider>
            <Outlet />
            <Toaster
                position="top-right"
                richColors
                closeButton
                toastOptions={{
                    duration: 4200,
                    style: {
                        background: "rgb(15 23 42)",
                        color: "rgb(241 245 249)",
                        border: "1px solid rgb(51 65 85)"
                    }
                }}
            />
        </AdminAuthProvider>
    );
};

export default AdminApp;
