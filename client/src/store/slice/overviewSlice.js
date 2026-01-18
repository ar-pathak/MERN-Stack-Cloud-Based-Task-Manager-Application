import { createSlice } from '@reduxjs/toolkit'

const overviewSlice = createSlice({
    name: "overview",
    initialState: { overviewData: null, workspacePopupOpen: false, taskPopupOpen: false, isProjectPopupOpen: false, isSubtaskPopupOpen: false },
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
    },
});



export const { setOverviewData, setWorkspacePopupOpen, setTaskPopupOpen, setIsProjectPopupOpen, setIsSubtaskPopupOpen } = overviewSlice.actions;
export default overviewSlice.reducer