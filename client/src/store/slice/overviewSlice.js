import { createSlice } from '@reduxjs/toolkit'

const overviewSlice = createSlice({
    name: "overview",
    initialState: { overviewData: null },
    reducers: {
        setOverviewData: (state, action) => {
            state.overviewData = action.payload;
        },
    },
});



export const { setOverviewData } = overviewSlice.actions;
export default overviewSlice.reducer