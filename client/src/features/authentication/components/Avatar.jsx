function Avatar() {
  return (
    <div className="relative">
      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-400 via-sky-400 to-cyan-300 flex items-center justify-center text-slate-900 text-xs font-semibold shadow-lg shadow-indigo-500/30">
        AU
      </div>
      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 text-[0.6rem] flex items-center justify-center border-2 border-slate-950">
        ✔
      </span>
    </div>
  );
}

export default Avatar;