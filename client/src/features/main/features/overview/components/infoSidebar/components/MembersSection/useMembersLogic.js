import { useState, useEffect, useMemo, useCallback } from "react";
import { useWorkspace } from "../../../../hook/useWorkspace";
import { useProject } from "../../../../hook/useProject";
import { useTask } from "../../../../hook/useTask";
import { useSubtask } from "../../../../hook/useSubtask"; //

export const useMembersLogic = (item) => {
    // Hooks
    const { fetchMembers, addMember, removeMember, sendInvite, updateMemberRole } = useWorkspace();
    const { fetchProjectMembers, addProjectMembers, updateProjectMembersRole, removeProjectMembers } = useProject();
    const { fetchTaskById, assignUsers, assignUsersByUsername, removeAssignUsers } = useTask();

    // NEW: Subtask Hook
    const {
        fetchSubtaskById,
        addAssignees: addSubtaskAssignees,
        removeAssignees: removeSubtaskAssignees
    } = useSubtask();

    // Core Data State
    const [members, setMembers] = useState([]);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);
    const [taskData, setTaskData] = useState([]);
    const [subtaskData, setSubtaskData] = useState([]); 

    // UI State
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState("all");
    const [notification, setNotification] = useState({ type: "", message: "" });

    const workspaceId = item?.id;
    const currentUserRole = item?.permissions?.role;
    const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin' || currentUserRole === "creator" || item?.permissions?.canEdit === true;

    // --- Notifications ---
    const notify = useCallback((type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification({ type: "", message: "" }), 4000);
    }, []);

    // --- Data Fetching ---
    const loadMembers = useCallback(async (showLoader = true) => {
        if (!item?.id) return;
        try {
            if (showLoader) setIsRefreshing(true);

            if (item.type === 'workspace') {
                const memberData = await fetchMembers(workspaceId);
                if (memberData?.data) {
                    setMembers(memberData.data);
                    setInitialLoadComplete(true);
                }
            } else if (item.type === 'project') {
                const memberData = await fetchProjectMembers(item.workspace, item.id);
                if (memberData?.data) {
                    setMembers(memberData.data);
                    setInitialLoadComplete(true);
                }
            } else if (item.type === 'task') {
                const memberData = await fetchTaskById(item.id);
                if (memberData?.data) {
                    setTaskData(memberData.data);
                    setMembers(memberData.data.assignees || []);
                    setInitialLoadComplete(true);
                }
            } else if (item.type === 'subtask') {
                // NEW: Subtask Loading Logic
                const subtaskRes = await fetchSubtaskById(item.id);
                if (subtaskRes?.data) {
                    setSubtaskData(subtaskRes.data);
                    setMembers(subtaskRes.data.assignedTo || []);
                    setInitialLoadComplete(true);
                }
            }
        } catch (error) {
            notify("error", "Failed to load members.");
            console.error(error);
        } finally {
            if (showLoader) setIsRefreshing(false);
        }
    }, [fetchMembers, fetchProjectMembers, fetchTaskById, fetchSubtaskById, item, workspaceId, notify]);

    useEffect(() => {
        loadMembers(true);
    }, [loadMembers]);

    // --- Computed ---
    const filteredMembers = useMemo(() => {
        return members.filter(member => {
            // Handle both structure types: 
            // 1. Workspace/Project: { user: { name: ... } }
            // 2. Task/Subtask: { name: ... } (Direct User Object)
            const userName = (member.user?.name || member.name || "").toLowerCase();
            const userEmail = (member.user?.email || member.email || "").toLowerCase();

            const query = searchQuery.toLowerCase();
            const matchesSearch = userName.includes(query) || userEmail.includes(query);

            // For tasks/subtasks, roles are not usually defined in the list, so we skip role filter or assume 'all'
            const memberRole = member.role || 'member';
            const matchesRole = filterRole === "all" || memberRole === filterRole;

            return matchesSearch && matchesRole;
        });
    }, [members, searchQuery, filterRole]);

    const roleStats = useMemo(() => {
        // Check: If task or subtask, return only 'all'
        if (item.type === 'task' || item.type === 'subtask') {
            return {
                all: members.length
            };
        }

        // Else: Return full stats (for workspace/project)
        return {
            all: members.length,
            ...(item.type === 'workspace' && {
                owner: members.filter(m => m.role === "owner").length
            }),
            admin: members.filter(m => m.role === "admin").length,
            member: members.filter(m => m.role === "member").length,
            viewer: members.filter(m => m.role === "viewer").length,
        };
    }, [members, item.type]);

    // --- Handlers ---

    const handleAddMember = async (username, role) => {
        setIsGlobalLoading(true);
        try {
            if (item.type === 'workspace') {
                const result = await addMember({ workspaceId, username, role });
                if (result?.success) {
                    const mode = result?.data?.mode;
                    if (mode === "invite_request") {
                        notify("success", `Invite request sent to ${username}.`);
                    } else {
                        notify("success", `${username} added successfully!`);
                        await loadMembers(false);
                    }
                    return true;
                }
                notify("error", result?.message || "Failed to add member");
                return false;
            } else if (item.type === 'task') {
                const result = await assignUsersByUsername(item.id, [username]);
                if (result?.success) {
                    const mode = result?.data?.assignmentMode;
                    if (mode === "invite_request") {
                        notify("success", `Assignment request sent to ${username}.`);
                    } else if (mode === "mixed") {
                        notify("success", `${username} added and assignment requests sent.`);
                        await loadMembers(false);
                    } else {
                        notify("success", `${username} added successfully!`);
                        await loadMembers(false);
                    }
                    return true;
                }
                notify("error", result?.message || "Failed to add member");
                return false;
            }
        } catch (err) {
            notify("error", err.message);
            return false;
        } finally {
            setIsGlobalLoading(false);
        }
    };

    const handleAssignProjectMembers = async (selectedUserIds) => {
        setIsGlobalLoading(true);
        try {
            if (item.type === 'project') {
                const membersPayload = selectedUserIds.map(userId => ({
                    user: userId,
                    role: "viewer"
                }));
                const result = await addProjectMembers(item.workspace, item.id, { members: membersPayload });
                if (result?.success) {
                    notify("success", "Members assigned successfully!");
                    await loadMembers(false);
                    return true;
                }
                notify("error", result?.message || "Failed to assign members");
                return false;
            } else if (item.type === 'task') {
                const result = await assignUsers(item.id, selectedUserIds);
                if (result?.success) {
                    const mode = result?.data?.assignmentMode;
                    if (mode === "invite_request") {
                        notify("success", "Assignment requests sent.");
                    } else if (mode === "mixed") {
                        notify("success", "Members assigned and requests sent.");
                        await loadMembers(false);
                    } else {
                        notify("success", "Members assigned successfully!");
                        await loadMembers(false);
                    }
                    return true;
                }
                notify("error", result?.message || "Failed to assign members");
                return false;
            } else if (item.type === 'subtask') {
                // NEW: Assign Subtask Members (Selection)
                const result = await addSubtaskAssignees(item.id, { assignees: selectedUserIds });
                if (result?.success) {
                    notify("success", "Members assigned successfully!");
                    await loadMembers(false);
                    return true;
                }
                notify("error", result?.message || "Failed to assign members");
                return false;
            }
        } catch (err) {
            notify("error", err.message);
            return false;
        } finally {
            setIsGlobalLoading(false);
        }
    };

    const handleInvite = async ({ email, role, file }) => {
        // Invite is typically workspace only
        setIsGlobalLoading(true);
        try {
            const result = await sendInvite({ workspaceId, email, role, file });
            if (result?.success) {
                const inviteData = result?.data || {};

                if (inviteData?.mode === "bulk_csv") {
                    const sent = Number(inviteData?.sent || 0);
                    const failed = Number(inviteData?.failed || 0);
                    notify(
                        "success",
                        `CSV processed: ${sent} invite${sent === 1 ? "" : "s"} sent${failed ? `, ${failed} failed` : ""}.`
                    );
                    return true;
                }

                notify("success", `Invitation sent to ${email}!`);
                return true;
            } else {
                notify("error", result?.message || "Failed to send invitation");
                return false;
            }
        } catch (err) {
            notify("error", err.message);
            return false;
        } finally {
            setIsGlobalLoading(false);
        }
    };

    const handleRemoveMember = async (memberId) => {
        console.log("Removing member:", memberId, "Item Type:", item.type);
        try {
            if (item.type === 'workspace') {
                const result = await removeMember({ workspaceId, memberId });
                if (result?.success) {
                    setMembers(prev => prev.filter(m => m.user?._id !== memberId));
                    notify("success", "Member removed successfully");
                } else {
                    notify("error", result?.message);
                }
            } else if (item.type === 'project') {
                const result = await removeProjectMembers(item.workspace, item.id, { users: [memberId] });
                if (result?.success) {
                    setMembers(prev => prev.filter(m => m.user?._id !== memberId));
                    notify("success", "Member removed successfully");
                } else {
                    notify("error", result?.message);
                }
            } else if (item.type === 'task') {
                const result = await removeAssignUsers(item.id, [memberId]);
                if (result?.success) {
                    setMembers(prev => prev.filter(m => m._id !== memberId));
                    notify("success", "Member removed successfully");
                } else {
                    notify("error", result?.error || "Failed to remove member from task");
                }
            } else if (item.type === 'subtask') {
                // NEW: Remove Subtask Assignee
                const result = await removeSubtaskAssignees(item.id, { assignees: [memberId] });
                if (result?.success) {
                    setMembers(prev => prev.filter(m => m._id !== memberId));
                    notify("success", "Member removed successfully");
                } else {
                    notify("error", result?.message || "Failed to remove member");
                }
            }
        } catch (err) {
            notify("error", err.message || err.error);
        }
    };

    const handleUpdateRole = async (memberId, newRole) => {
        // Roles usually only apply to Workspace/Project levels in this context
        try {
            if (item.type === 'workspace') {
                const result = await updateMemberRole({ workspaceId, memberId, role: newRole });
                if (result?.success) {
                    setMembers(prev => prev.map(m => m.user._id === memberId ? { ...m, role: newRole } : m));
                    notify("success", `Role updated to ${newRole}`);
                } else {
                    notify("error", result?.message);
                }
            } else if (item.type === 'project') {
                const result = await updateProjectMembersRole(item.workspace, item.id, memberId, newRole);
                if (result?.success) {
                    setMembers(prev => prev.map(m => m.user._id === memberId ? { ...m, role: newRole } : m));
                    notify("success", `Role updated to ${newRole}`);
                } else {
                    notify("error", result?.message);
                }
            }
        } catch (err) {
            notify("error", err.message);
        }
    };

    return {
        // Data
        members,
        taskData,
        subtaskData,
        filteredMembers,
        roleStats,
        initialLoadComplete,
        isRefreshing,
        isGlobalLoading,
        canManageMembers,
        notification,
        setNotification,

        // State Setters
        searchQuery,
        setSearchQuery,
        filterRole,
        setFilterRole,

        // Actions
        loadMembers,
        handleAddMember,
        handleAssignProjectMembers,
        handleInvite,
        handleRemoveMember,
        handleUpdateRole
    };
};
