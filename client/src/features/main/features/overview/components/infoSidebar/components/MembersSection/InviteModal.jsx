import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, X, Loader2 } from "lucide-react";

const InviteModal = ({ isOpen, onClose, onInvite, isLoading }) => {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("member");

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!email) return;
        const success = await onInvite(email, role);
        if (success) {
            setEmail("");
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2"><Mail className="h-5 w-5 text-purple-500" /> Invite Member</h3>
                    <button onClick={onClose}><X className="h-5 w-5 text-slate-500" /></button>
                </div>
                <div className="space-y-4">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@example.com" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200" />
                    <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200">
                        <option value="viewer">Viewer</option>
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                    </select>
                    <button onClick={handleSubmit} disabled={isLoading} className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium flex justify-center items-center gap-2">
                        {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Send Invite"}
                    </button>
                </div>
             </motion.div>
        </div>
    );
};
export default InviteModal;