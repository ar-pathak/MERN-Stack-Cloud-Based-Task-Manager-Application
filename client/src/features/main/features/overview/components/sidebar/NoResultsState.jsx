import { motion } from "framer-motion";

const NoResultsState = ({ searchQuery }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full p-8 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <h3 className="text-sm font-medium text-slate-300 mb-1">No results found</h3>
      <p className="text-xs text-slate-500">
        {searchQuery ? "Try changing your search query" : "Try changing your filter"}
      </p>
    </motion.div>
  );
};

export default NoResultsState;
