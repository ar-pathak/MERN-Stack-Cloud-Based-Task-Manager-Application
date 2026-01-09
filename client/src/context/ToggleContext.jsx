import { createContext, useContext } from "react";


export const ToggleContext = createContext(null);

export const useToggle = () => {
    const context = useContext(ToggleContext)
    if (!context) {
        throw new Error("useToggle must be used within toggle provider");
    }
    return context;
}