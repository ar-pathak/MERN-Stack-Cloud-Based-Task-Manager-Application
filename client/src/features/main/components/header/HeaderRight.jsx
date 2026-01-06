import { Bell, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { UserMenu } from "./UserMenu";

export const HeaderRight = () => {
    return (
        <div className="flex items-center gap-2">
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2 rounded-xl bg-slate-900/70 
                   border border-slate-800/70 hover:bg-slate-800/70"
            >
                <Bell className="h-4 w-4 text-slate-300" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500" />
            </motion.button>

            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="hidden md:flex items-center gap-1.5 px-3 py-2 
                   rounded-xl bg-sky-500/15 border border-sky-500/30
                   text-sky-300 text-sm font-medium"
            >
                <Plus className="h-4 w-4" />
                New Task
            </motion.button>

            <UserMenu />
        </div>
    );
};
