import { useState } from "react";
import { motion } from "framer-motion";
import {
    Shield, Link as LinkIcon, Download, Image as ImageIcon,
    Settings,
} from "lucide-react";




export const SettingsSection = ({ item }) => {
    const [notifications, setNotifications] = useState(true);
    const [emailUpdates, setEmailUpdates] = useState(false);
    const [autoArchive, setAutoArchive] = useState(true);

    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Settings className="h-4 w-4 text-slate-500" />
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Preferences</h3>
                </div>

                <div className="space-y-3">
                    <SettingToggle
                        label="Push Notifications"
                        description="Receive push notifications for updates"
                        checked={notifications}
                        onChange={setNotifications}
                    />
                    <SettingToggle
                        label="Email Updates"
                        description="Get email summaries of activity"
                        checked={emailUpdates}
                        onChange={setEmailUpdates}
                    />
                    <SettingToggle
                        label="Auto Archive"
                        description="Automatically archive completed tasks"
                        checked={autoArchive}
                        onChange={setAutoArchive}
                    />
                </div>
            </div>

            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4 text-slate-500" />
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Privacy</h3>
                </div>

                <div className="space-y-2">
                    <button className="w-full p-3 bg-slate-900/40 border border-slate-800/50 rounded-xl text-left hover:bg-slate-800/60 transition-colors group">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-300 group-hover:text-slate-100">Export Data</span>
                            <Download className="h-4 w-4 text-slate-500 group-hover:text-slate-300" />
                        </div>
                    </button>

                    <button className="w-full p-3 bg-slate-900/40 border border-slate-800/50 rounded-xl text-left hover:bg-slate-800/60 transition-colors group">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-300 group-hover:text-slate-100">Manage Permissions</span>
                            <Shield className="h-4 w-4 text-slate-500 group-hover:text-slate-300" />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

// Setting Toggle Component
export const SettingToggle = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between p-3 bg-slate-900/40 border border-slate-800/50 rounded-xl hover:border-slate-700/50 transition-colors">
        <div className="flex-1">
            <p className="text-sm text-slate-300 font-medium mb-0.5">{label}</p>
            <p className="text-xs text-slate-500">{description}</p>
        </div>
        <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(!checked)}
            className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-sky-500' : 'bg-slate-700'
                }`}
        >
            <motion.div
                animate={{ x: checked ? 20 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
            />
        </motion.button>
    </div>
);