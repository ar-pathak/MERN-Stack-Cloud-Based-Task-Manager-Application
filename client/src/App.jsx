import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import { AuthProvider } from "./context/AuthProvider";
import { Toaster } from "sonner";
import { ToggleProvider } from "./context/ToggleProvider";

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <AuthProvider>
      <ToggleProvider>
        <div className="App">
          {!isOnline && (
            <div className="fixed inset-x-0 top-0 z-50 mx-auto w-full bg-amber-700 text-white text-center py-2 text-xs font-semibold">
              You are offline. Some features may not work. Trying to reconnect...
            </div>
          )}
          <Outlet />
        </div>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgb(15 23 42)', // slate-900
              color: 'rgb(241 245 249)', // slate-100
              border: '1px solid rgb(51 65 85)', // slate-700
            },
          }}
        />
      </ToggleProvider>
    </AuthProvider>
  );
}

export default App;
