import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, Mail, RefreshCw, Download, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { useMembersLogic } from "./useMembersLogic";
import MemberCard from "./MemberCard";
import MemberFilters from "./MemberFilters";
import InviteModal from "./InviteModal";
import AddMemberModal from "./AddMemberModal";
import AssignProjectMemberModal from "./AssignProjectMemberModal";

const toIdString = (value) => String(value?._id || value?.id || value || "");

const MembersSection = ({ item, presenceByUserId = {} }) => {
    const {
        members, taskData, subtaskData, filteredMembers, roleStats, initialLoadComplete, isRefreshing, isGlobalLoading, canManageMembers, notification, setNotification,
        searchQuery, setSearchQuery, filterRole, setFilterRole,
        loadMembers, handleAddMember, handleAssignProjectMembers, handleInvite, handleRemoveMember, handleUpdateRole
    } = useMembersLogic(item);

    const [showInvite, setShowInvite] = useState(false);
    const [showAdd, setShowAdd] = useState(false);

    const isWorkspaceLevel =
        item.type === "workspace" ||
        (taskData?.workspace === null && taskData?.project === null);

    const isMemberOnline = (member) => {
        const memberId = toIdString(member?.user || member);
        const liveStatus = presenceByUserId[memberId]?.isOnline;
        if (typeof liveStatus === "boolean") return liveStatus;
        return Boolean(member?.user?.isOnline || member?.isOnline || member?.online);
    };

    const onlineMembersCount = members.filter(isMemberOnline).length;

    const handleExport = () => {
        const csv = [
            ["Name", "Email", "Role", "Status"],
            ...members.map((m) => [
                m.user?.name || m?.name,
                m.user?.email || m?.email,
                m.role,
                isMemberOnline(m) ? "Online" : "Offline"
            ])
        ].map((r) => r.join(",")).join("\n");

        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = "members.csv";
        a.click();
    };

    if (!initialLoadComplete) {
        return (
            <div className="flex h-80 items-center justify-center sm:h-96">
                <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
            </div>
        );
    }

    return (
        <section className="relative space-y-5 pb-6 sm:space-y-6 sm:pb-8">
            <AnimatePresence>
                {notification.message && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="fixed left-3 right-3 top-3 z-50 sm:left-auto sm:right-4 sm:top-4 sm:max-w-md"
                    >
                        <div className={`flex items-center gap-2.5 rounded-xl border p-3 backdrop-blur-xl sm:gap-3 sm:p-4 ${notification.type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-rose-500/30 bg-rose-500/10 text-rose-200"}`}>
                            {notification.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                            <p className="text-xs font-medium sm:text-sm">{notification.message}</p>
                            <button onClick={() => setNotification({ type: "", message: "" })}>
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg sm:h-10 sm:w-10">
                        <Users className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-base font-bold leading-tight text-slate-100 sm:text-xl">
                            {item.type === "workspace" ? "Workspace Members" : item.type === "project" ? "Project Assignees" : item.type === "task" ? "Task Assignees" : "Subtask Assignees"}
                        </h2>
                        <p className="text-xs text-slate-400 sm:text-sm">{members.length} members - {onlineMembersCount} online</p>
                    </div>
                </div>

                {canManageMembers && (
                    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
                        <button
                            onClick={() => loadMembers(true)}
                            disabled={isRefreshing}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-2 text-xs text-slate-300 sm:px-3 sm:text-sm"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                            <span>Refresh</span>
                        </button>
                        <button
                            onClick={handleExport}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-2 text-xs text-slate-300 sm:px-3 sm:text-sm"
                        >
                            <Download className="h-4 w-4" />
                            <span>Export</span>
                        </button>
                        <button
                            onClick={() => setShowAdd(true)}
                            className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-2.5 py-2 text-xs text-white shadow-lg shadow-sky-500/20 hover:bg-sky-500 sm:col-span-1 sm:px-3 sm:text-sm"
                        >
                            <UserPlus className="h-4 w-4" />
                            <span>Add</span>
                        </button>
                        {item.type === "workspace" && (
                            <button
                                onClick={() => setShowInvite(true)}
                                className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-2.5 py-2 text-xs text-white shadow-lg shadow-purple-500/20 hover:bg-violet-500 sm:col-span-1 sm:px-3 sm:text-sm"
                            >
                                <Mail className="h-4 w-4" />
                                <span>Invite</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            <MemberFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filterRole={filterRole}
                setFilterRole={setFilterRole}
                roleStats={roleStats}
            />

            <div className="space-y-2.5 sm:space-y-3">
                <AnimatePresence mode="popLayout">
                    {filteredMembers.length > 0 ? (
                        filteredMembers.map((member) => (
                            <MemberCard
                                key={member._id}
                                item={item}
                                member={member}
                                presenceByUserId={presenceByUserId}
                                canManageMembers={canManageMembers}
                                onRemove={handleRemoveMember}
                                onUpdateRole={handleUpdateRole}
                            />
                        ))
                    ) : (
                        <div className="py-10 text-center text-sm text-slate-500 sm:py-12">
                            No members found matching your criteria.
                        </div>
                    )}
                </AnimatePresence>
            </div>

            <InviteModal
                isOpen={showInvite}
                onClose={() => setShowInvite(false)}
                onInvite={handleInvite}
                isLoading={isGlobalLoading}
            />

            {isWorkspaceLevel ? (
                <AddMemberModal
                    item={item}
                    isOpen={showAdd}
                    onClose={() => setShowAdd(false)}
                    onAdd={handleAddMember}
                    isLoading={isGlobalLoading}
                />
            ) : (
                <AssignProjectMemberModal
                    item={item}
                    isOpen={showAdd}
                    taskData={item.type === "subtask" ? subtaskData : taskData}
                    onClose={() => setShowAdd(false)}
                    onAssign={handleAssignProjectMembers}
                    workspaceId={item.workspace}
                    currentProjectMembers={members}
                    isLoading={isGlobalLoading}
                />
            )}
        </section>
    );
};

export default MembersSection;
