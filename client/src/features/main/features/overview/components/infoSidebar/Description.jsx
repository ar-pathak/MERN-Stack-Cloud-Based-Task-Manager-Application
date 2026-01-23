import { useState } from "react";
import { motion } from "framer-motion";
import {
    AlignLeft,Link as LinkIcon, Edit2, Image as ImageIcon
} from "lucide-react";


const Description = ({ item }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [description, setDescription] = useState(item.description || '');

    return (
        <section>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <AlignLeft className="h-4 w-4 text-slate-500" />
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Description</h3>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsEditing(!isEditing)}
                    className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-300 transition-colors"
                >
                    <Edit2 className="h-3.5 w-3.5" />
                </motion.button>
            </div>

            {isEditing ? (
                <div className="space-y-2">
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 resize-none min-h-[100px]"
                        placeholder="Add a description..."
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="flex-1 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                            Save
                        </button>
                        <button
                            onClick={() => {
                                setDescription(item.description || '');
                                setIsEditing(false);
                            }}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap bg-slate-900/20 p-4 rounded-xl border border-slate-800/30">
                    {description || <span className="text-slate-600 italic">No description provided.</span>}
                </div>
            )}
        </section>
    );
};

export default Description