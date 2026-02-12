const TimelineSkeleton = () => {
  return (
    <div className="space-y-3 p-2 animate-pulse">
      {[1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30">
            <div className="w-8 h-8 rounded-lg bg-slate-700/50" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-700/50 rounded w-3/4" />
              <div className="h-3 bg-slate-700/30 rounded w-1/2" />
            </div>
            <div className="w-16 h-6 bg-slate-700/30 rounded" />
          </div>

          {item % 2 === 0 && (
            <div className="ml-8 space-y-2">
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/20">
                <div className="w-6 h-6 rounded bg-slate-700/40" />
                <div className="flex-1">
                  <div className="h-3 bg-slate-700/40 rounded w-2/3" />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TimelineSkeleton;
