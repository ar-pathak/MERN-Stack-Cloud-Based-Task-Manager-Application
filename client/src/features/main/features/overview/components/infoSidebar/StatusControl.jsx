import { useState, useEffect } from "react";
import {
    Flag,
    Archive,
    Activity,
    CheckCircle2,
    Loader2
} from "lucide-react";

// Import Custom Hooks
import { useTask } from "../../hook/useTask";
import { useProject } from "../../hook/useProject";
import { useSubtask } from "../../hook/useSubtask";

const StatusControl = ({ item, onItemPatch, onMutationSuccess }) => {
    // Initialize state
    const [status, setStatus] = useState('active');
    const [isHighPriority, setIsHighPriority] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState("");

    // Initialize Hooks
    const { updateStatus, updateTask } = useTask();
    const { updateProject, fetchProjectById, requestProjectStatusChange } = useProject();
    const { updateSubtask } = useSubtask();

    //  Normalize data in useEffect
    // This handles the "Subtask uses boolean completed" logic in one place
    useEffect(() => {
        if (!item) return;

        let currentStatus = item.status || 'active';

        // Handle subtask boolean conversion
        if (item.type === 'subtask' && item.completed) {
            currentStatus = 'completed';
        }

        setStatus(currentStatus);
        setIsHighPriority(item.isHighPriority || false);
        setNotice("");
    }, [item]);

    const entityId = item?.id || item?._id;
    const isProjectViewer = item?.type === "project"
        && String(item?.permissions?.role || "").toLowerCase() === "viewer";
    const projectRole = String(item?.permissions?.role || "").toLowerCase();
    const projectInheritedFromTeam = Boolean(item?.permissions?.inheritedFromTeam);
    const projectCanUpdate = item?.type !== "project"
        ? true
        : (typeof item?.permissions?.canEdit === "boolean"
            ? item.permissions.canEdit
            : (
                ["owner", "admin"].includes(projectRole)
                || (projectRole === "member" && !projectInheritedFromTeam)
            ));
    const taskRole = String(item?.permissions?.role || "").toLowerCase();
    const taskInheritedFromTeam = Boolean(item?.permissions?.inheritedFromTeam);
    const taskCanChangeStatus = item?.type !== "task"
        ? true
        : (typeof item?.permissions?.canChangeStatus === "boolean"
            ? item.permissions.canChangeStatus
            : (
                taskRole === "creator"
                || taskRole === "assignee"
                || (taskInheritedFromTeam && ["lead", "member"].includes(taskRole))
            ));
    const taskCanUpdatePriority = item?.type !== "task"
        ? true
        : (typeof item?.permissions?.canUpdatePriority === "boolean"
            ? item.permissions.canUpdatePriority
            : taskRole === "creator");
    const subtaskCanUpdate = item?.type !== "subtask"
        ? true
        : Boolean(item?.permissions?.canEdit);
    const canChangeStatus =
        item?.type === "project"
            ? projectCanUpdate
            : item?.type === "task"
                ? taskCanChangeStatus
                : item?.type === "subtask"
                    ? subtaskCanUpdate
                    : true;
    const canChangePriority =
        item?.type === "project"
            ? projectCanUpdate
            : item?.type === "task"
                ? taskCanUpdatePriority
                : item?.type === "subtask"
                    ? subtaskCanUpdate
                    : true;

    const statuses = item?.type === "subtask"
        ? [
            { value: 'active', label: 'Active', icon: Activity, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
            { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
        ]
        : [
            { value: 'active', label: 'Active', icon: Activity, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
            { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            { value: 'archived', label: 'Archived', icon: Archive, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
        ];

    const applyItemPatch = (updates = {}) => {
        if (typeof onItemPatch === "function") {
            onItemPatch(updates);
        }
    };

    const handleStatusChange = async (newStatus) => {
        if (loading || newStatus === status) return;
        if (!canChangeStatus) {
            const messageByType = {
                task: "Only task assignees can change task status",
                project: "You are not allowed to update project status",
                subtask: "You are not allowed to update subtask status"
            };
            setError(messageByType[item?.type] || "You are not allowed to update status");
            setTimeout(() => setError(null), 3000);
            return;
        }
        if (!entityId) {
            setError("Invalid item ID");
            setTimeout(() => setError(null), 3000);
            return;
        }

        setLoading(true);
        setError(null);
        setNotice("");
        const oldStatus = status;
        setStatus(newStatus); // Optimistic update

        try {
            let result;

            if (item.type === 'task') {
                result = await updateStatus(entityId, newStatus);
            }
            else if (item.type === 'project') {
                //  Check if we already have the workspace ID
                let workspaceId = item.workspace?._id || item.workspace;

                // Only fetch if absolutely necessary
                if (!workspaceId) {
                    const project = await fetchProjectById(entityId);
                    workspaceId = project?.data?.workspace?._id || project?.data?.workspace;
                }

                if (!workspaceId) throw new Error('Project workspace not found');
                const statusApprovalEnabled = Boolean(
                    item?.settings?.statusChangeAdminApprovalEnabled
                );
                const isProjectAdmin = Boolean(
                    item?.permissions?.isProjectAdmin
                    || (
                        item?.permissions?.role === 'owner'
                        && !item?.permissions?.inheritedFromWorkspace
                    )
                    || (
                        item?.permissions?.role === 'admin'
                        && !item?.permissions?.inheritedFromWorkspace
                    )
                );

                if (statusApprovalEnabled && !isProjectAdmin) {
                    result = await requestProjectStatusChange(workspaceId, entityId, {
                        status: newStatus
                    });

                    if (!result?.success) {
                        throw new Error(result?.error || 'Status change request failed');
                    }

                    setStatus(oldStatus);
                    setNotice('Status change request sent to project admins');
                    setTimeout(() => setNotice(""), 3000);
                    return;
                }

                result = await updateProject(workspaceId, entityId, { status: newStatus });
            }
            else if (item.type === 'subtask') {
                // Convert string status back to boolean for subtask
                result = await updateSubtask(entityId, { completed: newStatus === 'completed' });
            }
            else {
                throw new Error(`Unknown item type: ${item.type}`);
            }

            if (!result?.success) throw new Error('Status update failed');

            const resultData = result?.data || {};
            if (item.type === "subtask") {
                const nextCompleted = typeof resultData?.completed === "boolean"
                    ? resultData.completed
                    : newStatus === "completed";
                const normalizedStatus = nextCompleted ? "completed" : "active";
                setStatus(normalizedStatus);
                applyItemPatch({ ...resultData, completed: nextCompleted });
            } else {
                const normalizedStatus = resultData?.status || newStatus;
                setStatus(normalizedStatus);
                applyItemPatch({ ...resultData, status: normalizedStatus });
            }
            if (typeof onMutationSuccess === "function") {
                onMutationSuccess();
            }

        } catch (err) {
            console.error("Error updating status:", err);
            setStatus(oldStatus);
            setError(err?.message || 'Failed to update status');
            setTimeout(() => setError(null), 3000);
        } finally {
            setLoading(false);
        }
    };

    const handlePriorityChange = async (newPriorityValue) => {
        if (loading) return;
        if (!canChangePriority) {
            const messageByType = {
                task: "Only task creator can change task priority",
                project: "You are not allowed to update project priority",
                subtask: "You are not allowed to update subtask priority"
            };
            setError(messageByType[item?.type] || "You are not allowed to update priority");
            setTimeout(() => setError(null), 3000);
            return;
        }
        if (!entityId) {
            setError("Invalid item ID");
            setTimeout(() => setError(null), 3000);
            return;
        }

        const isHigh = newPriorityValue === 'high';
        if (isHigh === isHighPriority) return;

        setLoading(true);
        setError(null);
        const oldPriority = isHighPriority;
        setIsHighPriority(isHigh);

        try {
            let result;

            if (item.type === 'task') {
                result = await updateTask(entityId, { isHighPriority: isHigh });
            }
            else if (item.type === 'project') {
                // Same optimization for priority
                let workspaceId = item.workspace?._id || item.workspace;
                if (!workspaceId) {
                    const project = await fetchProjectById(entityId);
                    workspaceId = project?.data?.workspace?._id || project?.data?.workspace;
                }
                if (!workspaceId) throw new Error('Project workspace not found');

                result = await updateProject(workspaceId, entityId, { isHighPriority: isHigh });
            }
            else if (item.type === 'subtask') {
                result = await updateSubtask(entityId, { isHighPriority: isHigh });
            }

            if (!result?.success) throw new Error('Priority update failed');

            const resultData = result?.data || {};
            const normalizedPriority = typeof resultData?.isHighPriority === "boolean"
                ? resultData.isHighPriority
                : isHigh;
            setIsHighPriority(normalizedPriority);
            applyItemPatch({ ...resultData, isHighPriority: normalizedPriority });
            if (typeof onMutationSuccess === "function") {
                onMutationSuccess();
            }
        } catch (err) {
            console.error("Error updating priority:", err);
            setIsHighPriority(oldPriority);
            setError(err?.message || 'Failed to update priority');
            setTimeout(() => setError(null), 3000);
        } finally {
            setLoading(false);
        }
    };

    const currentStatusConfig = statuses.find(s => s.value === status) || statuses[0];

    return (
        <section className="relative">
            {loading && (
                <div className="absolute top-2 right-2 z-10">
                    <Loader2 className="h-3 w-3 text-sky-500 animate-spin" />
                </div>
            )}

            {error && (
                <div className="absolute -top-8 left-0 right-0 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-3 py-1.5 rounded-md mb-2">
                    {error}
                </div>
            )}
            {notice && (
                <div className="absolute -top-8 left-0 right-0 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3 py-1.5 rounded-md mb-2">
                    {notice}
                </div>
            )}

            <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-slate-500" />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Status & Priority
                </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <label htmlFor={`status-${entityId}`} className="text-xs text-slate-500 font-medium ml-1">
                        Status
                    </label>
                    <div className="relative">
                        <select
                            id={`status-${entityId}`}
                            value={status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            disabled={loading || !canChangeStatus}
                            className={`w-full appearance-none pl-9 pr-8 py-2.5 rounded-lg text-xs font-medium border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed ${currentStatusConfig.bg} ${currentStatusConfig.color}`}
                        >
                            {statuses.map(s => (
                                <option key={s.value} value={s.value} className="bg-slate-900 text-slate-300">
                                    {s.label}
                                </option>
                            ))}
                        </select>
                        <currentStatusConfig.icon className={`absolute left-3 top-2.5 h-3.5 w-3.5 ${currentStatusConfig.color} pointer-events-none`} />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className={`h-3 w-3 ${currentStatusConfig.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                    {isProjectViewer && (
                        <p className="mt-1 text-[11px] text-amber-400">
                            Viewer role cannot change or request project status.
                        </p>
                    )}
                    {item.type === "task" && !taskCanChangeStatus && (
                        <p className="mt-1 text-[11px] text-amber-400">
                            Only task assignees (or assigned team members) can change status.
                        </p>
                    )}
                    {item.type === "project" && !isProjectViewer && !projectCanUpdate && (
                        <p className="mt-1 text-[11px] text-amber-400">
                            Only workspace owners/admins or project members (admin/member) can change project status.
                        </p>
                    )}
                    {item.type === "subtask" && !subtaskCanUpdate && (
                        <p className="mt-1 text-[11px] text-amber-400">
                            Only allowed subtask members can change subtask status.
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-slate-500 font-medium ml-1">Priority</label>
                    <div className="flex bg-slate-900/40 p-1 rounded-lg border border-slate-800">
                        <button
                            onClick={() => handlePriorityChange('normal')}
                            disabled={loading || !canChangePriority}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-medium transition-all disabled:opacity-50 ${!isHighPriority ? 'bg-slate-700 text-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-400'}`}
                        >
                            Normal
                        </button>
                        <button
                            onClick={() => handlePriorityChange('high')}
                            disabled={loading || !canChangePriority}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-medium transition-all disabled:opacity-50 ${isHighPriority ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20 shadow-sm' : 'text-slate-500 hover:text-rose-400/70'}`}
                        >
                            <Flag className={`h-3 w-3 ${isHighPriority ? 'fill-current' : ''}`} />
                            High
                        </button>
                    </div>
                    {item.type === "task" && !taskCanUpdatePriority && (
                        <p className="mt-1 text-[11px] text-amber-400">
                            Only task creator can change priority.
                        </p>
                    )}
                    {item.type === "project" && !isProjectViewer && !projectCanUpdate && (
                        <p className="mt-1 text-[11px] text-amber-400">
                            You are not allowed to change project priority.
                        </p>
                    )}
                    {item.type === "subtask" && !subtaskCanUpdate && (
                        <p className="mt-1 text-[11px] text-amber-400">
                            You are not allowed to change subtask priority.
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
};

export default StatusControl;
