import { useMemo, useState } from "react"
import { ToggleContext } from "./ToggleContext"


export const ToggleProvider = ({ children }) => {
    const [isToggle, setIsToggle] = useState(false)
    const contextValue = useMemo(() => ({ isToggle, setIsToggle }), [isToggle])

    return (
        <ToggleContext.Provider
            value={contextValue}>
            {children}
        </ToggleContext.Provider>
    )
}
