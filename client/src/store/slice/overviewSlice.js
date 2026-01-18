import { createSlice } from '@reduxjs/toolkit'

const overviewSlice = createSlice({
    name: "overview",
    initialState: { overviewData: null, workspacePopupOpen: false, taskPopupOpen: false },
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
    },
});



export const { setOverviewData, setWorkspacePopupOpen, setTaskPopupOpen } = overviewSlice.actions;
export default overviewSlice.reducer