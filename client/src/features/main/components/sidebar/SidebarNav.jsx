import { NavItem } from "./NavItem";

export const SidebarNav = ({
  navItems,
  isExpanded,
  isMobile,
  onNavigate
}) => {
  return (
    <nav
      role="navigation"
      className={`flex-1 space-y-1.5 py-4 overflow-y-auto scrollbar-hide ${
        isExpanded || isMobile ? "px-3" : "px-2"
      }`}
    >
      {navItems.map((item) => (
        <NavItem
          key={item.path}
          item={item}
          isExpanded={isExpanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
};
