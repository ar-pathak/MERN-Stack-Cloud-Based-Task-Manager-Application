import { NavLink } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "lucide-react";
import { getColorClasses } from "../utils/sidebarHelpers";

export const NavItem = ({
  item,
  isExpanded,
  isMobile,
  onNavigate
}) => {
  const Icon = Icons[item.icon];

  return (
    <NavLink
      to={item.path}
      end={item.exact}
      onClick={onNavigate}
      className="block"
    >
      {({ isActive }) => {
        const colorClasses = getColorClasses(item.color, isActive);

        return (
          <motion.div
            whileHover={{
              x: isExpanded || isMobile ? 3 : 0,
              scale: !isExpanded && !isMobile ? 1.08 : 1
            }}
            whileTap={{ scale: 0.96 }}
            className={`group relative flex items-center rounded-xl text-sm transition-all duration-200 ${
              isExpanded || isMobile
                ? "w-full gap-3 px-3 py-2.5"
                : "w-11 h-11 justify-center mx-auto"
            } ${
              isActive
                ? `${colorClasses.bg} ${colorClasses.text} ${colorClasses.glow} border ${colorClasses.border}`
                : `text-slate-400 hover:bg-slate-800/40 hover:text-slate-200`
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {/* Active indicator */}
            {isActive && (isExpanded || isMobile) && (
              <motion.div
                layoutId={isMobile ? "mobile-active" : "desktop-active"}
                className={`absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1 rounded-r-full bg-gradient-to-b ${colorClasses.gradient}`}
              />
            )}

            {/* Icon */}
            <div
              className={`relative flex items-center justify-center rounded-lg ${
                isExpanded || isMobile ? "h-8 w-8" : "h-7 w-7"
              } ${
                isActive
                  ? `${colorClasses.bg} ${colorClasses.glow}`
                  : "bg-slate-900/50 group-hover:bg-slate-800/50"
              }`}
            >
              <Icon
                className={`${
                  isExpanded || isMobile ? "h-4 w-4" : "h-4.5 w-4.5"
                } ${colorClasses.icon}`}
              />
            </div>

            {/* Label */}
            <AnimatePresence>
              {(isExpanded || isMobile) && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex-1 overflow-hidden"
                >
                  <span className="font-semibold whitespace-nowrap">
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      {item.description}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      }}
    </NavLink>
  );
};
