import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router";

function CTASection() {
    return (
        <section className="mx-auto w-full max-w-6xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
            <motion.div
                className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-500/15 via-sky-500/20 to-blue-500/15 p-6 ring-1 ring-cyan-500/40 backdrop-blur"
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5 }}
            >
                <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-cyan-400/40 blur-3xl" />
                <div className="absolute -left-16 bottom-[-60px] h-52 w-52 rounded-full bg-sky-500/40 blur-3xl" />

                <div className="relative flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-50 sm:text-2xl">
                            Turn your cloud workspace into a task management OS.
                        </h2>
                        <p className="mt-2 max-w-xl text-sm text-slate-100/80 sm:text-[15px]">
                            Create your first workspace, invite your team and move one real
                            project into NimbusTask Cloud. Most teams see clarity within a week.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 text-xs text-slate-50 sm:text-[13px]">
                        <div className="flex gap-2">
                            <Link to={'auth'} className="inline-flex items-center gap-2 rounded-xl bg-slate-950/90 px-4 py-2.5 text-sm font-semibold text-cyan-200 shadow-md shadow-slate-900/80 ring-1 ring-cyan-400/60">
                                Get started free
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <button className="rounded-xl bg-slate-900/70 px-4 py-2.5 text-sm font-medium text-slate-100 ring-1 ring-slate-700/80">
                                Talk to us
                            </button>
                        </div>
                        <p>Onboarding help included for teams of 5+ members.</p>
                    </div>
                </div>
            </motion.div>
        </section>
    );
}

export default CTASection;