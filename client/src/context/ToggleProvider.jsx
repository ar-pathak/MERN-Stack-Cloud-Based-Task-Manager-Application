import { useState } from "react"
import { ToggleContext } from "./ToggleContext"


export const ToggleProvider = ({ children }) => {
    const [isToggle, setIsToggle] = useState(false)
    return (
        <ToggleContext.Provider
            value={{ isToggle, setIsToggle }}>
            {children}
        </ToggleContext.Provider>
    )
}