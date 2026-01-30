import { useState, useEffect, useMemo, useCallback } from "react";
import { useWorkspace } from "../../../../hook/useWorkspace";
import { useProject } from "../../../../hook/useProject";
import { useTask } from "../../../../hook/useTask";

export const useMembersLogic = (item) => {
    const { fetchMembers, addMember, removeMember, sendInvite, updateMemberRole } = useWorkspace();
    const { fetchProjectMembers, addProjectMembers, updateProjectMembersRole, removeProjectMembers } = useProject()
    const { fetchTaskById, assignUsers, assignUsersByUsername, removeAssignUsers } = useTask();
    // Core Data State
    const [members, setMembers] = useState([]);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);
    const [taskData, setTaskData] = useState([])

    // UI State
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState("all");
    const [notification, setNotification] = useState({ type: "", message: "" });

    const workspaceId = item?.id;
    const currentUserRole = item?.permissions?.role;
    const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin' || currentUserRole === "creator";

    // --- Notifications ---
    const notify = useCallback((type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification({ type: "", message: "" }), 4000);
    }, []);

    // --- Data Fetching ---
    const loadMembers = useCallback(async (showLoader = true) => {
        if (!workspaceId) return;
        try {
            if (showLoader) setIsRefreshing(true);
            if (item.type === 'workspace') {
                const memberData = await fetchMembers(workspaceId);
                if (memberData?.data) {
                    setMembers(memberData.data);
                    setInitialLoadComplete(true);
                }
            } else if (item.type === 'project') {
                const memberData = await fetchProjectMembers(item.workspace, item.id)
                if (memberData?.data) {
                    setMembers(memberData.data.data);
                    setInitialLoadComplete(true);
                }
            } else if (item.type == 'task') {
                const memberData = await fetchTaskById(item.id);
                console.log('memberData', memberData)
                if (memberData?.data) {
                    setTaskData(memberData.data)
                    setMembers(memberData.data.assignees);
                    setInitialLoadComplete(true);
                }

            }
        } catch (error) {
            notify("error", "Failed to load members.");
        } finally {
            if (showLoader) setIsRefreshing(false);
        }
    }, [fetchMembers, fetchProjectMembers, item, workspaceId, notify]);

    useEffect(() => {
        loadMembers(true);
    }, [loadMembers]);

    // --- Computed ---
    const filteredMembers = useMemo(() => {
        return members.filter(member => {
            const userName = member.user?.name?.toLowerCase() || "";
            const userEmail = member.user?.email?.toLowerCase() || "";
            const query = searchQuery.toLowerCase();
            const matchesSearch = userName.includes(query) || userEmail.includes(query);
            const matchesRole = filterRole === "all" || member.role === filterRole;
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

    const handleAddMember = async (username, role) => {
        setIsGlobalLoading(true);
        try {
            if (item.type === 'workspace') {

                const result = await addMember({ workspaceId, username, role });
                if (result?.success) {
                    notify("success", `${username} added successfully!`);
                    await loadMembers(false);
                    return true;
                } else {
                    notify("error", result?.message || "Failed to add member");
                    return false;
                }
            } else if (item.type === 'task') {
                const result = await assignUsersByUsername(item.id, [username]);
                if (result?.success) {
                    notify("success", `${username} added successfully!`);
                    await loadMembers(false);
                    return true;
                } else {
                    notify("error", result?.message || "Failed to add member");
                    return false;
                }
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
            const membersPayload = selectedUserIds.map(userId => ({
                user: userId,
                role: "viewer"
            }));
            const taskPayload = selectedUserIds.map(userId => (
                userId
            ))
            if (item.type === 'project') {
                const result = await addProjectMembers(item.workspace, item.id, { members: membersPayload });
                if (result?.success) {
                    notify("success", "Members assigned successfully!");
                    await loadMembers(false);
                    return true;
                } else {
                    notify("error", result?.message || "Failed to assign members");
                    return false;
                }
            } else if (item.type === 'task') {
                const result = await assignUsers(item.id, taskPayload);
                if (result?.success) {
                    notify("success", "Members assigned successfully!");
                    await loadMembers(false);
                    return true;
                } else {
                    notify("error", result?.message || "Failed to assign members");
                    return false;
                }

            }
        } catch (err) {
            notify("error", err.message);
            return false;
        } finally {
            setIsGlobalLoading(false);
        }
    };

    const handleInvite = async (email, role) => {
        setIsGlobalLoading(true);
        try {
            const result = await sendInvite({ workspaceId, email, role });
            if (result?.success) {
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
                    setMembers(prev => prev.filter(m => m.user._id !== memberId));
                    notify("success", "Member removed successfully");
                } else {
                    notify("error", result?.message);
                }
            } else if (item.type === 'project') {
                const result = await removeProjectMembers(item.workspace, item.id, { users: [memberId] });
                if (result?.success) {
                    setMembers(prev => prev.filter(m => m.user._id !== memberId));
                    notify("success", "Member removed successfully");
                } else {
                    notify("error", result?.message);
                }
            } else if (item.type === 'task') {
                const result = await removeAssignUsers(item.id, [memberId]);
                console.log("Remove assign users result:", result);
                if (result?.success) {
                    setMembers(prev => prev.filter(m => m._id !== memberId));
                    notify("success", "Member removed successfully");
                } else {
                    notify("error", result?.error || "Failed to remove member from task");
                }
            }
        } catch (err) {
            notify("error", err.error);
        }
    };

    const handleUpdateRole = async (memberId, newRole) => {
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