import { motion } from "framer-motion";
import { KeyRound, Lock, ShieldCheck, UserCheck } from "lucide-react";

const securityPoints = [
    {
        icon: Lock,
        title: "Private account controls",
        detail: "Aurora supports private profile visibility and controlled social access behavior."
    },
    {
        icon: UserCheck,
        title: "Role-based workspace access",
        detail: "Owner, admin, member, and viewer roles govern who can act across workspace resources."
    },
    {
        icon: KeyRound,
        title: "Secure authentication sessions",
        detail: "Auth state uses HttpOnly cookies, secure mode in production, and protected route checks."
    },
    {
        icon: ShieldCheck,
        title: "Permission-aware interactions",
        detail: "Task, chat, and update actions respect role and workspace permission boundaries."
    }
];

function SecuritySection() {
    return (
        <section
            id="trust-security"
            className="mx-auto w-full max-w-7xl px-3 py-12 sm:px-6 lg:px-8"
        >
            <div className="grid gap-6 md:grid-cols-[1.2fr,1fr]">
                <motion.div
                    className="rounded-3xl border border-slate-800/80 bg-slate-900/75 p-4 backdrop-blur sm:p-6"
                    initial={{ opacity: 0, x: -24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.5 }}
                >
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Trust and Security</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-50 sm:text-3xl">
                        Built for teams that need velocity and control together.
                    </h2>
                    <p className="mt-3 text-[13px] text-slate-300 sm:text-base">
                        Aurora is not a marketing mockup. The controls below map directly to existing
                        account, auth, and role behavior implemented across your app stack.
                    </p>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        {securityPoints.map(({ icon: Icon, title, detail }) => (
                            <div
                                key={title}
                                className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3"
                            >
                                <div className="flex items-start gap-2">
                                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                                    <h3 className="text-sm font-semibold text-slate-100 break-words">{title}</h3>
                                </div>
                                <p className="mt-2 text-xs leading-relaxed text-slate-400 break-words">{detail}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div
                    className="rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900/75 via-slate-950/75 to-slate-950/90 p-4 sm:p-6"
                    initial={{ opacity: 0, x: 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.5 }}
                >
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Operational Confidence</p>
                    <div className="mt-4 space-y-3 text-sm text-slate-300">
                        <div className="flex flex-col items-start gap-1 rounded-xl border border-slate-800/70 bg-slate-950/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                            <span>Protected app routes</span>
                            <span className="font-semibold text-emerald-300">Enabled</span>
                        </div>
                        <div className="flex flex-col items-start gap-1 rounded-xl border border-slate-800/70 bg-slate-950/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                            <span>Role access model</span>
                            <span className="font-semibold text-cyan-300">Owner/Admin/Member/Viewer</span>
                        </div>
                        <div className="flex flex-col items-start gap-1 rounded-xl border border-slate-800/70 bg-slate-950/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                            <span>Private profile support</span>
                            <span className="font-semibold text-cyan-300">Available</span>
                        </div>
                        <div className="flex flex-col items-start gap-1 rounded-xl border border-slate-800/70 bg-slate-950/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                            <span>Session cookie policy</span>
                            <span className="font-semibold text-cyan-300">HttpOnly</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

export default SecuritySection;
