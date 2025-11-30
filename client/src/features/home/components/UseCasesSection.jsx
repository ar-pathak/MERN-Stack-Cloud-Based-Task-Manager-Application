import { motion } from "framer-motion";
function UseCasesSection() {
    const useCases = [
        {
            title: "Product & engineering",
            desc: "Plan sprints, triage bugs, and track releases with linked docs, PRs and incidents in one place.",
        },
        {
            title: "Agencies & client work",
            desc: "Group tasks by client, share read-only boards and keep approvals moving with automated nudges.",
        },
        {
            title: "Operations & back office",
            desc: "Standardize recurring workflows like onboarding, audits and monthly closes with reusable templates.",
        },
    ];

    return (
        <section
            id="use-cases"
            className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8"
        >
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-50 sm:text-2xl">
                    One cloud workspace, infinite ways to run your work.
                </h2>
                <p className="mt-2 max-w-xl text-sm text-slate-300 sm:text-[15px]">
                    NimbusTask Cloud adapts to your team—whether you ship software, run
                    a service business or manage internal operations.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {useCases.map((u) => (
                    <motion.div
                        key={u.title}
                        className="rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-700/80"
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.4 }}
                        transition={{ duration: 0.45 }}
                    >
                        <h3 className="text-sm font-semibold text-slate-50 sm:text-[15px]">
                            {u.title}
                        </h3>
                        <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-[13px]">
                            {u.desc}
                        </p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}

export default UseCasesSection;