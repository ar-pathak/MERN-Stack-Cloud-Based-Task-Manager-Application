import { motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, type = 'danger', loading }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full ${type === 'danger' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-800/50 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 transition-all shadow-lg ${type === 'danger'
                            ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
                            : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                            }`}
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {type === 'danger' ? 'Delete' : 'Confirm'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};


export default ConfirmationModal;