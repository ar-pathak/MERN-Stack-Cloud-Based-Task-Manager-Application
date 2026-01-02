import { Outlet } from "react-router";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "sonner";

function App() {
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}

export default App;
