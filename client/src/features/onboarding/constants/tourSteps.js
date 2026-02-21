export const TOUR_ROLE = {
  OWNER: "owner",
  MEMBER: "member",
};

export const OWNER_TOUR_STEPS = [
  {
    id: "owner-sidebar-overview",
    title: "Workspace Navigation",
    description:
      "Your main navigation lives here. Start from Overview to manage all workspace activity.",
    selector: '[data-tour="sidebar-overview-link"]',
    route: "/main",
    placement: "right",
  },
  {
    id: "owner-create",
    title: "Create Workspace Items",
    description:
      "Use Create for fast actions like new workspace flows, tasks, and updates.",
    selector: '[data-tour="header-create"]',
    route: "/main",
    placement: "bottom",
  },
  {
    id: "owner-overview-quick-create",
    title: "Quick Setup From Overview",
    description:
      "This shortcut helps workspace owners quickly spin up workspaces and tasks from the sidebar.",
    selector: '[data-tour="overview-quick-create"]',
    route: "/main",
    placement: "right",
  },
  {
    id: "owner-timeline",
    title: "Timeline Structure",
    description:
      "Track workspace, project, and task hierarchy here. Expand items to manage setup in detail.",
    selector: '[data-tour="overview-timeline-list"]',
    route: "/main",
    placement: "right",
  },
  {
    id: "owner-collaboration-pane",
    title: "Live Collaboration Area",
    description:
      "Team chat, updates, and task context appear here once you open a workspace item.",
    selector: '[data-tour="overview-chat-pane"]',
    route: "/main",
    placement: "left",
  },
  {
    id: "owner-help-reminder",
    title: "You Can Reopen This Tour",
    description:
      "Open your user menu, go to Help & Support, and use Take a Tour anytime.",
    selector: '[data-tour="header-user-menu"]',
    route: "/main",
    placement: "bottom",
  },
];

export const MEMBER_TOUR_STEPS = [
  {
    id: "member-sidebar-overview",
    title: "Start in Overview",
    description:
      "Overview is your command center for assigned tasks, conversations, and shared progress.",
    selector: '[data-tour="sidebar-overview-link"]',
    route: "/main",
    placement: "right",
  },
  {
    id: "member-create-task",
    title: "Create and Contribute",
    description:
      "Use Create to add a task or share updates with the team.",
    selector: '[data-tour="header-create"]',
    route: "/main",
    placement: "bottom",
  },
  {
    id: "member-timeline",
    title: "Track Work Items",
    description:
      "Follow your workspace and task timeline here. Open items to collaborate instantly.",
    selector: '[data-tour="overview-timeline-list"]',
    route: "/main",
    placement: "right",
  },
  {
    id: "member-chat-pane",
    title: "Collaborate in Context",
    description:
      "Messages and task discussion stay tied to each workspace item for focused collaboration.",
    selector: '[data-tour="overview-chat-pane"]',
    route: "/main",
    placement: "left",
  },
  {
    id: "member-notifications",
    title: "Stay Updated",
    description:
      "Use notifications to catch mentions, approvals, and important team activity.",
    selector: '[data-tour="header-notifications"]',
    route: "/main",
    placement: "bottom",
  },
  {
    id: "member-retake-tour",
    title: "Retake From Help & Support",
    description:
      "You can restart onboarding anytime from Help & Support with the Take a Tour action.",
    selector: '[data-tour="help-take-tour"]',
    route: "/main/support",
    placement: "bottom",
  },
];

export const getTourStepsByRole = (role) =>
  role === TOUR_ROLE.OWNER ? OWNER_TOUR_STEPS : MEMBER_TOUR_STEPS;
