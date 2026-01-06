import { Search } from "lucide-react";

export const HeaderCenter = () => {
  return (
    <div className="hidden md:flex flex-1 justify-center px-6">
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search tasks, projects..."
          className="w-full rounded-xl bg-slate-900/70 border border-slate-800/70
                     pl-9 pr-4 py-2 text-sm text-slate-200
                     placeholder:text-slate-500
                     focus:outline-none focus:ring-1 focus:ring-sky-500/40"
        />
      </div>
    </div>
  );
};
