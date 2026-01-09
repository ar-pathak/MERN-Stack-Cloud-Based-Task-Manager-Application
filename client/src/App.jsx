import { Outlet } from "react-router";
import { AuthProvider } from "./context/AuthProvider";
import { Toaster } from "sonner";
import { ToggleProvider } from "./context/ToggleProvider";

function App() {
  return (
    <AuthProvider>
      <ToggleProvider>
        <div className="App">
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
