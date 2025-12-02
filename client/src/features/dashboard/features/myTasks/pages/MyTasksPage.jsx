// src/pages/MyTasksPage.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";

import { mockTasks } from "../utils/myTaskPageData";
import HeaderSection from "../components/HeaderSection";
import TopBar from "../components/TopBar";
import TaskListArea from "../components/TaskListArea";
import TaskStats from "../components/TaskStats";
import SelectedTaskPanel from "../components/SelectedTaskPanel";

export default function MyTasksPage() {
    const [activeTab, setActiveTab] = useState("All");
    const [view, setView] = useState("list"); // list | grid
    const [search, setSearch] = useState("");
    const [selectedTask, setSelectedTask] = useState(mockTasks[0]);
    const [priorityFilter, setPriorityFilter] = useState("All");

    const filteredTasks = mockTasks.filter((task) => {
        const matchesSearch =
            task.title.toLowerCase().includes(search.toLowerCase()) ||
            task.project.toLowerCase().includes(search.toLowerCase());

        const matchesTab =
            activeTab === "All"
                ? true
                : activeTab === "Today"
                    ? task.dueDate.toLowerCase().includes("today")
                    : activeTab === "Upcoming"
                        ? !task.dueDate.toLowerCase().includes("yesterday") &&
                        !task.dueDate.toLowerCase().includes("today")
                        : activeTab === "Completed"
                            ? task.status === "Done"
                            : true;

        const matchesPriority =
            priorityFilter === "All" ? true : task.priority === priorityFilter;

        return matchesSearch && matchesTab && matchesPriority;
    });

    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
            {/* Water / Flowing gradient background */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -left-32 -top-40 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-indigo-500/25 blur-3xl" />
                {/* Subtle flowing lines */}
                <div className="absolute inset-x-0 top-10 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent opacity-60" />
                <div className="absolute inset-x-0 bottom-16 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent opacity-60" />
            </div>

            {/* Glassy overlay with enhanced effect */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.18),transparent_60%)]" />

            {/* Main content */}
            <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 pb-10 pt-6 lg:px-8">
                <HeaderSection />

                <motion.div
                    className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)]"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                >
                    <div className="space-y-4">
                        <TopBar
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            view={view}
                            setView={setView}
                            search={search}
                            setSearch={setSearch}
                            priorityFilter={priorityFilter}
                            setPriorityFilter={setPriorityFilter}
                        />

                        <TaskListArea
                            tasks={filteredTasks}
                            view={view}
                            selectedTask={selectedTask}
                            setSelectedTask={setSelectedTask}
                        />
                    </div>

                    <div className="space-y-4">
                        <TaskStats tasks={mockTasks} />
                        <SelectedTaskPanel task={selectedTask} />

                    </div>
                </motion.div>
            </div>
        </div>
    );
}