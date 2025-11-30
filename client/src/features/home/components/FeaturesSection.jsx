import { motion } from "framer-motion";
function FeaturesSection() {
    const features = [
        {
            title: "Real-time cloud sync",
            body: "Every task, comment and status update is synced in milliseconds, so your team always works on the latest source of truth.",
            tag: "Live collaboration",
        },
        {
            title: "Projects, sprints & roadmaps",
            body: "Organize work by projects, epics and sprints, with flexible boards, lists and timelines that match your team’s style.",
            tag: "For agile teams",
        },
        {
            title: "Automation without code",
            body: "Auto-assign tasks, move cards, trigger alerts and post to Slack/Teams when conditions are met—no scripting required.",
            tag: "Workflows",
        },
        {
            title: "Cloud-first & secure",
            body: "Encrypted at rest and in transit, SSO/SAML support and granular roles so you choose exactly who can see what.",
            tag: "Enterprise ready",
        },
    ];

    return (
        <section
            id="features"
            className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8"
        >
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-slate-50 sm:text-2xl">
                        Built for cloud-first teams who hate context switching.
                    </h2>
                    <p className="mt-2 max-w-xl text-sm text-slate-300 sm:text-[15px]">
                        Replace scattered spreadsheets and chat TODOs with one place to plan,
                        execute and review every project—from anywhere.
                    </p>
                </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
                {features.map((f) => (
                    <motion.div
                        key={f.title}
                        className="group relative overflow-hidden rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-700/80 backdrop-blur"
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.45 }}
                    >
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100">
                            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/15 blur-3xl" />
                        </div>
                        <div className="relative flex flex-col gap-2">
                            <span className="inline-flex w-fit rounded-full bg-slate-800/80 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-300">
                                {f.tag}
                            </span>
                            <h3 className="text-sm font-semibold text-slate-50 sm:text-base">
                                {f.title}
                            </h3>
                            <p className="text-xs leading-relaxed text-slate-300 sm:text-[13px]">
                                {f.body}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}

export default FeaturesSection