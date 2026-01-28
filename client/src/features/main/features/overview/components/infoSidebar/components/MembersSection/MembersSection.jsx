import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, Mail, RefreshCw, Download, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { useMembersLogic } from "./useMembersLogic";
import MemberCard from "./MemberCard";
import MemberFilters from "./MemberFilters";
import InviteModal from "./InviteModal";
import AddMemberModal from "./AddMemberModal";
import AssignProjectMemberModal from "./AssignProjectMemberModal";

const MembersSection = ({ item }) => {
    // 1. Initialize Logic
    const {
        members, filteredMembers, roleStats, initialLoadComplete, isRefreshing, isGlobalLoading, canManageMembers, notification, setNotification,
        searchQuery, setSearchQuery, filterRole, setFilterRole,
        loadMembers, handleAddMember, handleAssignProjectMembers, handleInvite, handleRemoveMember, handleUpdateRole
    } = useMembersLogic(item);

    // 2. Local Modal UI State
    const [showInvite, setShowInvite] = useState(false);
    const [showAdd, setShowAdd] = useState(false);

    // 3. Handlers
    const handleExport = () => {
        const csv = [
            ["Name", "Email", "Role", "Status"],
            ...members.map(m => [m.user?.name, m.user?.email, m.role, m.online ? "Online" : "Offline"])
        ].map(r => r.join(",")).join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = "members.csv";
        a.click();
    };

    if (!initialLoadComplete) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="h-10 w-10 text-sky-500 animate-spin" /></div>;
    }

    return (
        <section className="space-y-6 pb-8 relative">
            {/* Notification Toast */}
            <AnimatePresence>
                {notification.message && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed top-4 right-4 z-50">
                        <div className={`flex items-center gap-3 p-4 rounded-xl border backdrop-blur-xl ${notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-rose-500/10 border-rose-500/30 text-rose-200'}`}>
                            {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                            <p className="text-sm font-medium">{notification.message}</p>
                            <button onClick={() => setNotification({ type: "", message: "" })}><X className="h-4 w-4" /></button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg">
                        <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-100">Team Members</h2>
                        <p className="text-sm text-slate-400">{members.length} members • {members.filter(m => m.online).length} online</p>
                    </div>
                </div>

                {canManageMembers && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => loadMembers(true)} disabled={isRefreshing} className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm border border-slate-700 flex items-center gap-2">
                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
                        </button>
                        <button onClick={handleExport} className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm border border-slate-700 flex items-center gap-2">
                            <Download className="h-4 w-4" /> Export
                        </button>
                        <button onClick={() => setShowAdd(true)} className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-sky-500/20">
                            <UserPlus className="h-4 w-4" /> Add
                        </button>
                        {item.type === 'workspace' && <button onClick={() => setShowInvite(true)} className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-purple-500/20">
                            <Mail className="h-4 w-4" /> Invite
                        </button>}
                    </div>
                )}
            </div>

            {/* Filters */}
            <MemberFilters
                searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                filterRole={filterRole} setFilterRole={setFilterRole}
                roleStats={roleStats}
            />

            {/* List */}
            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {filteredMembers.length > 0 ? (
                        filteredMembers.map(member => (
                            <MemberCard
                                key={member._id}
                                member={member}
                                canManageMembers={canManageMembers}
                                onRemove={handleRemoveMember}
                                onUpdateRole={handleUpdateRole}
                            />
                        ))
                    ) : (
                        <div className="text-center py-12 text-slate-500">No members found matching your criteria.</div>
                    )}
                </AnimatePresence>
            </div>

            {/* Modals */}
            <InviteModal isOpen={showInvite} onClose={() => setShowInvite(false)} onInvite={handleInvite} isLoading={isGlobalLoading} />
            {item.type === 'workspace' && <AddMemberModal isOpen={showAdd} onClose={() => setShowAdd(false)} onAdd={handleAddMember} isLoading={isGlobalLoading} />}
            {item.type === 'project' && <AssignProjectMemberModal
                isOpen={showAdd}
                onClose={() => setShowAdd(false)}
                onAssign={handleAssignProjectMembers}
                workspaceId={item.workspace}
                currentProjectMembers={members}
                isLoading={isGlobalLoading}
            />}
        </section>
    );
};

export default MembersSection;