import { describe, expect, it } from "vitest";

import { store } from "../../store";
import {
  setIsProjectPopupOpen,
  setIsSubtaskPopupOpen,
  setOverviewData,
  setTaskPopupOpen,
  setWorkspacePopupOpen,
} from "../../store/slice/overviewSlice";
import {
  addProjectData,
  addTaskData,
  addUserData,
  addWorkspaceData,
} from "../../store/slice/userSlice";

describe("store", () => {
  it("starts with the expected initial state", () => {
    expect(store.getState()).toEqual({
      user: {
        user: null,
        workspace: null,
        project: null,
        task: null,
      },
      overview: {
        overviewData: null,
        workspacePopupOpen: false,
        taskPopupOpen: false,
        isProjectPopupOpen: false,
        isSubtaskPopupOpen: false,
      },
    });
  });

  it("updates the user slice", () => {
    store.dispatch(addUserData({ id: "user-1" }));
    store.dispatch(addWorkspaceData({ id: "ws-1" }));
    store.dispatch(addProjectData({ id: "project-1" }));
    store.dispatch(addTaskData({ id: "task-1" }));

    expect(store.getState().user).toEqual({
      user: { id: "user-1" },
      workspace: { id: "ws-1" },
      project: { id: "project-1" },
      task: { id: "task-1" },
    });
  });

  it("updates the overview slice", () => {
    store.dispatch(setOverviewData({ workspaces: [] }));
    store.dispatch(setWorkspacePopupOpen(true));
    store.dispatch(setTaskPopupOpen(true));
    store.dispatch(setIsProjectPopupOpen(true));
    store.dispatch(setIsSubtaskPopupOpen(true));

    expect(store.getState().overview).toEqual({
      overviewData: { workspaces: [] },
      workspacePopupOpen: true,
      taskPopupOpen: true,
      isProjectPopupOpen: true,
      isSubtaskPopupOpen: true,
    });
  });
});
