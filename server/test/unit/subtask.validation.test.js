const {
    validateCreateSubtask,
    validateUpdateSubtask,
    validateManageAssignees
} = require("../../src/modules/subtask/subtask.validation");

const VALID_ID = "507f1f77bcf86cd799439011";
const OTHER_ID = "507f191e810c19729de860ea";

const createRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

test("validateCreateSubtask passes with valid payload and calls next", () => {
    const req = {
        body: {
            taskId: VALID_ID,
            title: "Write API docs",
            description: "Document edge cases",
            assignedTo: VALID_ID,
            dueDate: "2030-01-01T00:00:00.000Z"
        }
    };
    const res = createRes();
    const next = jest.fn();

    validateCreateSubtask(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body.taskId).toBe(VALID_ID);
});

test("validateCreateSubtask rejects invalid request body", () => {
    const req = {
        body: {
            taskId: "bad-id",
            title: "",
            assignedTo: ["invalid"]
        }
    };
    const res = createRes();
    const next = jest.fn();

    validateCreateSubtask(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: "Validation failed",
        errors: expect.any(Array)
    }));
});

test("validateUpdateSubtask rejects empty payload", () => {
    const req = { body: {} };
    const res = createRes();
    const next = jest.fn();

    validateUpdateSubtask(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
});

test("validateUpdateSubtask accepts assignedTo array and coerces dueDate", () => {
    const req = {
        body: {
            title: "Updated subtask",
            assignedTo: [VALID_ID, OTHER_ID],
            dueDate: "2030-02-01T00:00:00.000Z"
        }
    };
    const res = createRes();
    const next = jest.fn();

    validateUpdateSubtask(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body.dueDate).toBeInstanceOf(Date);
    expect(req.body.assignedTo).toEqual([VALID_ID, OTHER_ID]);
});

test("validateManageAssignees enforces objectId array input", () => {
    const invalidReq = { body: { assignees: ["bad-id"] } };
    const invalidRes = createRes();
    const invalidNext = jest.fn();

    validateManageAssignees(invalidReq, invalidRes, invalidNext);

    expect(invalidNext).not.toHaveBeenCalled();
    expect(invalidRes.status).toHaveBeenCalledWith(400);

    const validReq = { body: { assignees: [VALID_ID] } };
    const validRes = createRes();
    const validNext = jest.fn();

    validateManageAssignees(validReq, validRes, validNext);

    expect(validRes.status).not.toHaveBeenCalled();
    expect(validNext).toHaveBeenCalledTimes(1);
});
