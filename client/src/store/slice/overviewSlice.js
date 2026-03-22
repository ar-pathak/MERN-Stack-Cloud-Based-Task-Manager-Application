// overviewSlice.js
import { createSlice } from '@reduxjs/toolkit'

const overviewSlice = createSlice({
    name: "overview",
    initialState: {
        overviewData: null,
        workspacePopupOpen: false,
        taskPopupOpen: false,
        isProjectPopupOpen: false,
        isSubtaskPopupOpen: false,
        isBottomNavVisible: true // 🔥 Naya state add kiya
    },
    reducers: {
        setOverviewData: (state, action) => {
            state.overviewData = action.payload;
        },
        setWorkspacePopupOpen: (state, action) => {
            state.workspacePopupOpen = action.payload;
        },
        setTaskPopupOpen: (state, action) => {
            state.taskPopupOpen = action.payload;
        },
        setIsProjectPopupOpen: (state, action) => {
            state.isProjectPopupOpen = action.payload;
        },
        setIsSubtaskPopupOpen: (state, action) => {
            state.isSubtaskPopupOpen = action.payload;
        },
        // 🔥 Naya reducer action add kiya
        setIsBottomNavVisible: (state, action) => {
            state.isBottomNavVisible = action.payload;
        }
    },
});

// 🔥 Action ko export karna mat bhoolna
export const {
    setOverviewData,
    setWorkspacePopupOpen,
    setTaskPopupOpen,
    setIsProjectPopupOpen,
    setIsSubtaskPopupOpen,
    setIsBottomNavVisible // <-- Yahan
} = overviewSlice.actions;

export default overviewSlice.reducer;