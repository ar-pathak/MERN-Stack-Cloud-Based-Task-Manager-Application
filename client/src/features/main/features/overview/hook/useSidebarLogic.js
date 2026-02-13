import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { deleteProject, getProjectById } from "../../../../../service/project.service";
import { getSubtasksByTask } from "../../../../../service/subtask.service";
import { deleteTask, getTaskById, updateTaskStatus } from "../../../../../service/task.service";
import { deleteWorkspace, getWorkspaceById } from "../../../../../service/workspace.service";

const useSidebarLogic = (initialItem) => {
    const navigate = useNavigate();
    const [details, setDetails] = useState(initialItem);
    const [subtasks, setSubtasks] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch fresh data when item changes
    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            if (!initialItem?.id) return;
            setLoading(true);
            try {
                let data = initialItem;
                let subs = [];

                // Fetch latest details based on type
                if (initialItem.type === 'task') {
                    data = await getTaskById(initialItem.id);
                    // Fetch subtasks for progress calculation
                    subs = await getSubtasksByTask(initialItem.id);
                } else if (initialItem.type === 'project') {
                    data = await getProjectById(initialItem.workspaceId, initialItem.id);
                } else if (initialItem.type === 'workspace') {
                    data = await getWorkspaceById(initialItem.id);
                }

                if (isMounted) {
                    setDetails(prev => ({ ...prev, ...data }));
                    setSubtasks(subs);
                }
            } catch (error) {
                console.error("Failed to fetch sidebar details", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();
        return () => { isMounted = false; };
    }, [initialItem]);

    const handleStatusUpdate = async (newStatus) => {
        try {
            // Optimistic update
            setDetails(prev => ({ ...prev, status: newStatus }));
            await updateTaskStatus(details.id, newStatus);
        } catch (error) {
            console.error("Failed to update status", error);
            // Revert on failure (could add toast here)
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete this ${details.type}?`)) return;

        try {
            if (details.type === 'task') await deleteTask(details.id);
            if (details.type === 'project') await deleteProject(details.workspaceId, details.id);
            if (details.type === 'workspace') await deleteWorkspace(details.id);

            // Soft refresh without full page reload.
            window.dispatchEvent(new CustomEvent("overview:data:refresh"));
            navigate("/main", { replace: true });
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    return { details, loading, subtasks, handleStatusUpdate, handleDelete };
};


export default useSidebarLogic
