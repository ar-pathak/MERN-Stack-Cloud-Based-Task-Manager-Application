import { motion, AnimatePresence } from "framer-motion";
import { Folder } from "lucide-react";
import ProjectCard from "./ProjectCard";

export default function ProjectsArea({ projects, viewMode }) {
    if (!projects.length) {
        return (
            <motion.div
                className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/60 py-12 text-center"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.3 } }}
            >
                <Folder className="h-7 w-7 text-slate-500" />
                <p className="mt-3 text-sm font-medium text-slate-200">
                    No projects match the filters
                </p>
                <p className="mt-1 text-xs text-slate-400">
                    Try clearing search or changing the status filter.
                </p>
            </motion.div>
        );
    }

    return (
        <AnimatePresence mode="popLayout">
            {viewMode === "grid" ? (
                <motion.div
                    key="grid"
                    className="grid flex-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.25 } }}
                    exit={{ opacity: 0, y: 8, transition: { duration: 0.2 } }}
                >
                    {projects.map((p, i) => (
                        <ProjectCard key={p.id} project={p} index={i} />
                    ))}
                </motion.div>
            ) : (
                <motion.div
                    key="list"
                    className="flex-1 space-y-3"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.25 } }}
                    exit={{ opacity: 0, y: 8, transition: { duration: 0.2 } }}
                >
                    {projects.map((p, i) => (
                        <ProjectRow key={p.id} project={p} index={i} />
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

