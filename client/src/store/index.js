import { configureStore } from "@reduxjs/toolkit";
import userSlice from "./slice/userSlice";
import overviewSlice from "./slice/overviewSlice";

export const store = configureStore({
    reducer: {
        user: userSlice,
        overview: overviewSlice,
    },
});

