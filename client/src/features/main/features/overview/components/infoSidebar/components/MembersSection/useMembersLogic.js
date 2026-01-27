import { useState, useEffect, useMemo, useCallback } from "react";
import { useWorkspace } from "../../../../hook/useWorkspace";

export const useMembersLogic = (item) => {
    const { fetchMembers, addMember, removeMember, sendInvite, updateMemberRole } = useWorkspace();

    // Core Data State
    const [members, setMembers] = useState([]);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);

    // UI State
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState("all");
    const [notification, setNotification] = useState({ type: "", message: "" });

    const workspaceId = item?.id;
    const currentUserRole = item?.permissions?.role;
    const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

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
            const memberData = await fetchMembers(workspaceId);
            if (memberData?.data) {
                setMembers(memberData.data);
                setInitialLoadComplete(true);
            }
        } catch (error) {
            notify("error", "Failed to load members.");
        } finally {
            if (showLoader) setIsRefreshing(false);
        }
    }, [fetchMembers, workspaceId, notify]);

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

    const roleStats = useMemo(() => ({
        all: members.length,
        owner: members.filter(m => m.role === "owner").length,
        admin: members.filter(m => m.role === "admin").length,
        member: members.filter(m => m.role === "member").length,
        viewer: members.filter(m => m.role === "viewer").length,
    }), [members]);

    // --- Actions ---
    const handleAddMember = async (username, role) => {
        setIsGlobalLoading(true);
        try {
            const result = await addMember({ workspaceId, username, role });
            if (result?.success) {
                notify("success", `${username} added successfully!`);
                await loadMembers(false);
                return true;
            } else {
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
        try {
            const result = await removeMember({ workspaceId, memberId });
            if (result?.success) {
                setMembers(prev => prev.filter(m => m.user._id !== memberId));
                notify("success", "Member removed successfully");
            } else {
                notify("error", result?.message);
            }
        } catch (err) {
            notify("error", err.message);
        }
    };

    const handleUpdateRole = async (memberId, newRole) => {
        try {
            const result = await updateMemberRole({ workspaceId, memberId, role: newRole });
            if (result?.success) {
                setMembers(prev => prev.map(m => m.user._id === memberId ? { ...m, role: newRole } : m));
                notify("success", `Role updated to ${newRole}`);
            } else {
                notify("error", result?.message);
            }
        } catch (err) {
            notify("error", err.message);
        }
    };

    return {
        // Data
        members,
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
        handleInvite,
        handleRemoveMember,
        handleUpdateRole
    };
};