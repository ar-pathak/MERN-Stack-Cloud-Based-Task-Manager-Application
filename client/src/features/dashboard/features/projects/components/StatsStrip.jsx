import { motion } from "framer-motion";
import { CheckCircle2, Folder, Users } from "lucide-react";
import StatCard from "./StatCard";
export default function StatsStrip() {
    return (
        <motion.div
            className="grid gap-3 sm:grid-cols-3"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.3 } }
            }
        >
            <StatCard
                icon={Folder}
                label="Active projects"
                value="12"
                sub="+3 this week"
            />
            <StatCard
                icon={CheckCircle2}
                label="On–track rate"
                value="82%"
                sub="Based on due dates"
            />
            <StatCard
                icon={Users}
                label="Teams covered"
                value="5"
                sub="Product · Data · Infra"
            />
        </motion.div>
    );
}