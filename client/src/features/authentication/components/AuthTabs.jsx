import { views } from "../utils/view";

function AuthTabs({ activeView, setActiveView }) {
  const tabs = [
    { id: views.LOGIN, label: "Login" },
    { id: views.SIGNUP, label: "Sign up" },
  ];

  return (
    <div className="grid w-full grid-cols-2 gap-1 rounded-2xl border border-slate-700/80 bg-slate-800/80 p-1 text-xs">
      {tabs.map((tab) => {
        const isActive = activeView === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`relative rounded-xl px-3 py-2 text-[11px] font-medium transition-all duration-200 sm:text-xs ${
              isActive
                ? "bg-slate-950/90 text-slate-50 shadow-sm shadow-slate-900"
                : "text-slate-300/90 hover:text-slate-100"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default AuthTabs;
