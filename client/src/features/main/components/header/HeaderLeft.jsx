import { motion } from "framer-motion";

export const HeaderLeft = () => {
  return (
    <div className="flex items-center gap-3">
      <motion.div
        whileHover={{ scale: 1.05 }}
        className="hidden md:block"
      >
        <h1 className="text-sm font-semibold text-slate-100">
          Dashboard
        </h1>
        <p className="text-[11px] text-slate-400">
          Overview & activity
        </p>
      </motion.div>
    </div>
  );
};
