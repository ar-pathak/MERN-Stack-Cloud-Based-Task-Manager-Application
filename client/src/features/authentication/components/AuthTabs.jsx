import { views } from "../utils/view";

function AuthTabs({ activeView, setActiveView }) {
  const tabs = [
    { id: views.LOGIN, label: "Login" },
    { id: views.SIGNUP, label: "Sign up" },
  ];

  return (
    <div className="inline-flex p-1 bg-slate-800/80 rounded-full border border-slate-700/80 text-xs">
      {tabs.map((tab) => {
        const isActive = activeView === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`relative px-4 py-1.5 rounded-full transition-all duration-200 ${isActive
                ? "bg-slate-950/90 text-slate-50 shadow-sm shadow-slate-900"
                : "text-slate-300/80 hover:text-slate-100/90"
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