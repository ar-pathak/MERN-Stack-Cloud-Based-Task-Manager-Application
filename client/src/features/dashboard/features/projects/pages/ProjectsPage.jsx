import { useState } from "react";
import { PROJECTS } from "../utils/dummyData";
import pageVariants from "../utils/pageVariants";
import { shimmerBg } from "../utils/shimmerBg";
import Header from "../components/Header";
import Toolbar from "../components/Toolbar";
import StatsStrip from "../components/StatsStrip";
import ProjectsArea from "../components/ProjectsArea";
import { motion } from "framer-motion";

export default function ProjectsPage() {
    const [viewMode, setViewMode] = useState("grid");
    const [activeFilter, setActiveFilter] = useState("All");
    const [search, setSearch] = useState("");

    const filters = ["All", "In Progress", "Planning", "Review"];

    const filteredProjects = PROJECTS.filter((p) => {
        const matchesFilter =
            activeFilter === "All" ? true : p.status === activeFilter;
        const q = search.toLowerCase();
        const matchesSearch =
            !q ||
            p.name.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q) ||
            p.tag.toLowerCase().includes(q);
        return matchesFilter && matchesSearch;
    });

    return (
        <motion.div
            className="relative h-full w-full overflow-hidden"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            {/* Ambient background */}
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                <div className={`absolute inset-0 opacity-60 ${shimmerBg}`} />
                <div className="absolute -left-32 top-40 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
                <div className="absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
            </div>

            <div className="flex h-full flex-col gap-6 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
                <Header />

                <Toolbar
                    filters={filters}
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    search={search}
                    setSearch={setSearch}
                />

                <StatsStrip />

                <ProjectsArea projects={filteredProjects} viewMode={viewMode} />
            </div>
        </motion.div>
    );
}