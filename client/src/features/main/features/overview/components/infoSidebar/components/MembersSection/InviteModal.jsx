import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileUp, Loader2, Mail, X } from "lucide-react";

const InviteModal = ({ isOpen, onClose, onInvite, isLoading }) => {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("member");
    const [file, setFile] = useState(null);
    const [mode, setMode] = useState("single");

    const isSubmitDisabled = useMemo(() => {
        if (mode === "csv") return !file;
        return !email.trim();
    }, [email, file, mode]);

    if (!isOpen) return null;

    const resetForm = () => {
        setEmail("");
        setFile(null);
        setRole("member");
        setMode("single");
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async () => {
        if (isSubmitDisabled) return;
        const success = await onInvite({
            email: mode === "single" ? email.trim() : "",
            role,
            file: mode === "csv" ? file : null
        });

        if (success) {
            handleClose();
        }
    };

    const onCsvSelect = (event) => {
        const selected = event.target.files?.[0] || null;
        setFile(selected);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
            >
                <div className="mb-5 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-slate-100">
                        <Mail className="h-5 w-5 text-sky-400" />
                        Invite Members
                    </h3>
                    <button onClick={handleClose} className="text-slate-500 hover:text-slate-300">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
                    <button
                        type="button"
                        onClick={() => setMode("single")}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                            mode === "single"
                                ? "bg-sky-600 text-white"
                                : "text-slate-300 hover:bg-slate-800"
                        }`}
                    >
                        Single Email
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode("csv")}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                            mode === "csv"
                                ? "bg-sky-600 text-white"
                                : "text-slate-300 hover:bg-slate-800"
                        }`}
                    >
                        CSV Upload
                    </button>
                </div>

                <div className="space-y-4">
                    {mode === "single" ? (
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="colleague@example.com"
                            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-200"
                        />
                    ) : (
                        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/70 p-3">
                            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                                <FileUp className="h-4 w-4 text-sky-400" />
                                <span>{file?.name || "Upload CSV file with email column"}</span>
                                <input
                                    type="file"
                                    accept=".csv,text/csv"
                                    className="hidden"
                                    onChange={onCsvSelect}
                                />
                            </label>
                            <p className="mt-2 text-[11px] text-slate-500">
                                Supports one or multiple email columns. First row can be header.
                            </p>
                        </div>
                    )}

                    <select
                        value={role}
                        onChange={(event) => setRole(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-200"
                    >
                        <option value="viewer">Viewer</option>
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                    </select>

                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || isSubmitDisabled}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-2.5 font-medium text-white hover:bg-sky-500 disabled:opacity-60"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : mode === "csv" ? (
                            "Upload CSV & Invite"
                        ) : (
                            "Send Invite"
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default InviteModal;
