import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
    name: "user",
    initialState: { user: null, workspace: null, project: null, task: null },
    reducers: {
        addUserData: (state, action) => {
            state.user = action.payload;
        },
        addWorkspaceData: (state, action) => {
            state.user = action.payload;
        },
        addProjectData: (state, action) => {
            state.project = action.payload;
        },
        addTaskData: (state, action) => {
            state.task = action.payload
        }
    },
});

export const { addUserData, addWorkspaceData, addProjectData, addTaskData } = userSlice.actions;
export default userSlice.reducer;
