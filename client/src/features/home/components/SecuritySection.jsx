import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

function SecuritySection() {
    return (
        <section
            id="security"
            className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8"
        >
            <div className="grid gap-6 md:grid-cols-[1.1fr,1fr]">
                <motion.div
                    className="rounded-3xl bg-slate-900/80 p-6 ring-1 ring-slate-700/80 backdrop-blur"
                    initial={{ opacity: 0, x: -24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-cyan-300" />
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Cloud security
                        </p>
                    </div>
                    <h2 className="mt-3 text-xl font-semibold text-slate-50 sm:text-2xl">
                        Enterprise-grade security, by default.
                    </h2>
                    <p className="mt-2 text-sm text-slate-300 sm:text-[15px]">
                        Your workspace is protected with industry-standard encryption,
                        granular permissions and detailed audit trails—without any complex setup.
                    </p>

                    <dl className="mt-5 grid gap-3 text-xs text-slate-300 sm:text-[13px] md:grid-cols-2">
                        <div>
                            <dt className="font-medium text-slate-100">Data protection</dt>
                            <dd className="mt-1">
                                Encryption at rest & in transit, nightly backups and regional
                                data residency options.
                            </dd>
                        </div>
                        <div>
                            <dt className="font-medium text-slate-100">Access control</dt>
                            <dd className="mt-1">
                                Role-based permissions, SSO/SAML support and workspace-level
                                audit logs.
                            </dd>
                        </div>
                        <div>
                            <dt className="font-medium text-slate-100">Compliance ready</dt>
                            <dd className="mt-1">
                                Built to align with SOC2-style controls and modern cloud
                                security practices.
                            </dd>
                        </div>
                        <div>
                            <dt className="font-medium text-slate-100">Regional hosting</dt>
                            <dd className="mt-1">
                                Choose data centers close to your team for lower latency and
                                compliance needs.
                            </dd>
                        </div>
                    </dl>
                </motion.div>

                <motion.div
                    className="rounded-3xl bg-gradient-to-b from-slate-900/80 via-slate-950/80 to-slate-950/90 p-6 ring-1 ring-slate-700/80"
                    initial={{ opacity: 0, x: 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.5 }}
                >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Live workspace health
                    </p>
                    <div className="mt-4 space-y-3 text-xs text-slate-300 sm:text-[13px]">
                        <div className="flex items-center justify-between">
                            <span>Uptime (last 90 days)</span>
                            <span className="font-semibold text-emerald-300">99.98%</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Avg. API latency</span>
                            <span className="font-semibold text-cyan-300">120 ms</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Incidents this quarter</span>
                            <span className="font-semibold text-slate-100">0</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

export default SecuritySection;