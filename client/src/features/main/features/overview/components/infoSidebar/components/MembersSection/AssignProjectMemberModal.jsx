import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, X, Loader2, Search, CheckCircle2, Circle } from "lucide-react";
import { useWorkspace } from "../../../../hook/useWorkspace";
import { useTask } from "../../../../hook/useTask";
import { useTeam } from "../../../../hook/useTeam";


const AssignProjectMemberModal = ({ item, taskData, isOpen, onClose, onAssign, workspaceId, currentProjectMembers, isLoading }) => {
    const { fetchMembers } = useWorkspace();
    const { fetchTaskById } = useTask()
    const { fetchTeamMembers } = useTeam()

    const [workspaceMembers, setWorkspaceMembers] = useState([]);
    const [isFetchingMembers, setIsFetchingMembers] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    // 1. Fetch Workspace Members when modal opens
    useEffect(() => {
        if (isOpen) {
            if (item.type === 'project' && workspaceId) {
                const loadWorkspaceMembers = async () => {
                    setIsFetchingMembers(true);
                    try {
                        const res = await fetchMembers(workspaceId);
                        if (res?.data) {
                            setWorkspaceMembers(res.data);
                        }
                    } catch (error) {
                        console.error("Failed to load workspace members", error);
                    } finally {
                        setIsFetchingMembers(false);
                    }
                };
                loadWorkspaceMembers();
            } else if (item.type === 'task') {
                const loadTaskParentMembers = async () => {
                    setIsFetchingMembers(true);
                    try {

                        if (taskData.project !== null) {
                            setWorkspaceMembers(taskData.project.members)
                        } else if (taskData.workspace !== null) {
                            const res = await fetchMembers(taskData.workspace._id)
                            if (res?.data) {
                                setWorkspaceMembers(res.data);
                            }
                        }
                    } catch (error) {
                        console.error("Failed to load workspace members", error);
                    } finally {
                        setIsFetchingMembers(false);
                    }
                }
                loadTaskParentMembers();
            } else if (item.type === 'subtask') {
                const loadSubtaskParentMembers = async () => {
                    setIsFetchingMembers(true);
                    try {
                        // 1. Fetch the Parent Task
                        const taskRes = await fetchTaskById(item.task); // item.task is the ID
                        const parentTask = taskRes?.data;

                        if (!parentTask) return;

                        // Map to store unique users. Key: UserID, Value: formatted object
                        const uniqueMembersMap = new Map();

                        // 2. Add Direct Assignees (assignees array)
                        // parentTask.assignees is usually an array of populated User objects
                        if (parentTask.assignees?.length > 0) {
                            parentTask.assignees.forEach(user => {
                                if (user && user._id) {
                                    // Normalize to { user: ... } format for UI consistency
                                    uniqueMembersMap.set(user._id.toString(), { user: user });
                                }
                            });
                        }

                        // 3. Add Team Members (assigneesTeams array)
                        if (parentTask.assigneesTeams?.length > 0) {
                            // Use Promise.all to fetch all teams in parallel
                            const teamPromises = parentTask.assigneesTeams.map(team => {
                                // Handle if team is populated object or just ID string
                                const teamId = typeof team === 'object' ? team._id : team;
                                return fetchTeamMembers(teamId);
                            });

                            const teamResponses = await Promise.all(teamPromises);

                            // Process responses
                            teamResponses.forEach(res => {
                                if (res?.data) {
                                    // res.data is usually array of TeamMembers: [{ user: {...}, role: ... }]
                                    res.data.forEach(member => {
                                        if (member.user && member.user._id) {
                                            const userId = member.user._id.toString();
                                            // Only add if not already present (avoid duplicates)
                                            if (!uniqueMembersMap.has(userId)) {
                                                uniqueMembersMap.set(userId, { user: member.user });
                                            }
                                        }
                                    });
                                }
                            });
                        }

                        // 4. Convert Map values to Array and Set State
                        setWorkspaceMembers(Array.from(uniqueMembersMap.values()));

                    } catch (error) {
                        console.error("Failed to load subtask context members", error);
                    } finally {
                        setIsFetchingMembers(false);
                    }
                }
                loadSubtaskParentMembers();
            }
            setSelectedUsers([]);
            setSearchQuery("");
        }
    }, [isOpen, workspaceId, fetchMembers, item, taskData]);

    // 2. Filter: Only show members NOT already in the project
    const availableMembers = useMemo(() => {
        // Handle both "Member Wrapper" (project/workspace) and "Direct User" (task assignees) structures
        const existingUserIds = new Set(currentProjectMembers.map(m => m.user?._id || m._id));

        return workspaceMembers.filter(m => {
            // Ensure m.user exists before accessing properties to prevent crashes in the filter as well
            if (!m.user) return false;

            const isNotMember = !existingUserIds.has(m.user._id);
            const matchesSearch =
                (m.user.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                (m.user.email?.toLowerCase() || "").includes(searchQuery.toLowerCase());
            return isNotMember && matchesSearch;
        });
    }, [workspaceMembers, currentProjectMembers, searchQuery]);

    // Toggle selection
    const toggleUser = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSubmit = async () => {
        if (selectedUsers.length === 0) return;
        await onAssign(selectedUsers);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-100">Assign Members</h3>
                        <p className="text-xs text-slate-400">Select workspace members to add to this project</p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="h-5 w-5" /></button>
                </div>

                {/* Search */}
                <div className="px-6 py-4 bg-slate-900/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name or email..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:ring-2 focus:ring-sky-500/50 outline-none"
                        />
                    </div>
                </div>

                {/* List Area */}
                <div className="flex-1 overflow-y-auto px-6 py-2 space-y-2 min-h-[300px]">
                    {isFetchingMembers ? (
                        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 text-sky-500 animate-spin" /></div>
                    ) : availableMembers.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 text-sm">
                            {searchQuery ? "No matching members found" : "All workspace members are already in this project."}
                        </div>
                    ) : (
                        availableMembers.map(member => (
                            <div
                                key={member.user._id}
                                onClick={() => toggleUser(member.user._id)}
                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedUsers.includes(member.user._id) ? "bg-sky-500/10 border-sky-500/50" : "bg-slate-800/30 border-slate-800 hover:bg-slate-800"}`}
                            >
                                {/* Checkbox UI */}
                                <div className={`flex-shrink-0 `}>
                                    {selectedUsers.includes(member.user._id)
                                        ? <CheckCircle2 className="h-5 w-5 text-sky-500" />
                                        : <Circle className="h-5 w-5 text-slate-600" />
                                    }
                                </div>

                                {/* Avatar */}
                                <div className="h-9 w-9 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                                    {member.user.name?.[0]?.toUpperCase()}
                                </div>

                                {/* Info */}
                                <div className="flex-1 overflow-hidden">
                                    <h4 className={`text-sm font-medium ${selectedUsers.includes(member.user._id) ? "text-sky-400" : "text-slate-200"}`}>{member.user.name}</h4>
                                    <p className="text-xs text-slate-500 truncate">{member.user.email}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-800 bg-slate-900/50 rounded-b-2xl flex items-center justify-between">
                    <span className="text-sm text-slate-400">
                        {selectedUsers.length} selected
                    </span>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-slate-200 text-sm font-medium">Cancel</button>
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || selectedUsers.length === 0}
                            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-500/20"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                            Assign Members
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AssignProjectMemberModal;