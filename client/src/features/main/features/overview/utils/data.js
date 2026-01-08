import { Briefcase, FolderOpen } from "lucide-react";

export const mockData = {
  workspaces: [
    {
      id: "ws-1",
      name: "Product Development",
      type: "workspace",
      icon: Briefcase,
      starred: true,
      muted: false,
      archived: false,
      lastMessage: "Sarah: Let's review the designs tomorrow",
      lastMessageTime: "2m ago",
      unreadCount: 3,
      pinned: true,
      members: [
        { id: 1, name: "Sarah Chen", avatar: "SC", online: true, typing: false },
        { id: 2, name: "Mike Ross", avatar: "MR", online: false, typing: false },
        { id: 3, name: "Emma Wilson", avatar: "EW", online: true, typing: true }
      ],
      projects: [
        {
          id: "proj-1",
          name: "Mobile App Redesign",
          type: "project",
          icon: FolderOpen,
          status: "active",
          progress: 65,
          lastMessage: "Mike: Updated the wireframes",
          lastMessageTime: "1h ago",
          unreadCount: 1,
          muted: false,
          members: [
            { id: 1, name: "Sarah Chen", avatar: "SC", online: true, typing: false },
            { id: 2, name: "Mike Ross", avatar: "MR", online: false, typing: false }
          ],
          tasks: [
            { id: "task-1", name: "Design system audit", type: "task", status: "completed", priority: "high", assignee: "Sarah Chen" },
            { id: "task-2", name: "User flow mapping", type: "task", status: "in-progress", priority: "medium", assignee: "Mike Ross" },
            { id: "task-3", name: "Prototype screens", type: "task", status: "pending", priority: "high", assignee: "Emma Wilson" }
          ]
        },
        {
          id: "proj-2",
          name: "API Integration",
          type: "project",
          icon: FolderOpen,
          status: "active",
          progress: 30,
          lastMessage: "You: Completed endpoint docs",
          lastMessageTime: "3h ago",
          unreadCount: 0,
          muted: false,
          members: [
            { id: 2, name: "Mike Ross", avatar: "MR", online: false, typing: false },
            { id: 3, name: "Emma Wilson", avatar: "EW", online: true, typing: false }
          ],
          tasks: [
            { id: "task-4", name: "Endpoint documentation", type: "task", status: "completed", priority: "medium", assignee: "You" },
            { id: "task-5", name: "Auth implementation", type: "task", status: "in-progress", priority: "high", assignee: "Emma Wilson" }
          ]
        }
      ]
    },
    {
      id: "ws-2",
      name: "Marketing Campaign",
      type: "workspace",
      icon: Briefcase,
      starred: false,
      muted: false,
      archived: false,
      lastMessage: "Team meeting at 3 PM",
      lastMessageTime: "5h ago",
      unreadCount: 0,
      pinned: false,
      members: [
        { id: 4, name: "Alex Turner", avatar: "AT", online: true, typing: false },
        { id: 5, name: "Lisa Park", avatar: "LP", online: false, typing: false }
      ],
      projects: [
        {
          id: "proj-3",
          name: "Q1 Launch",
          type: "project",
          icon: FolderOpen,
          status: "active",
          progress: 85,
          lastMessage: "Lisa: Campaign is live!",
          lastMessageTime: "1d ago",
          unreadCount: 0,
          muted: false,
          members: [
            { id: 4, name: "Alex Turner", avatar: "AT", online: true, typing: false },
            { id: 5, name: "Lisa Park", avatar: "LP", online: false, typing: false }
          ],
          tasks: []
        }
      ]
    }
  ]
};

// Enhanced mock messages with more features
export const mockMessages = {
  "ws-1": [
    { id: 1, sender: "Sarah Chen", avatar: "SC", message: "Hey team! How's the progress on the mobile app?", time: "10:30 AM", isOwn: false, read: true, pinned: false, type: "text" },
    { id: 2, sender: "You", avatar: "ME", message: "Going well! We're at 65% completion.", time: "10:32 AM", isOwn: true, read: true, pinned: false, type: "text" },
    { id: 3, sender: "Mike Ross", avatar: "MR", message: "Just finished the wireframes. Ready for review.", time: "10:35 AM", isOwn: false, read: true, pinned: false, type: "text", attachment: { name: "wireframes_v2.fig", size: "3.2 MB", type: "file" } },
    { id: 4, sender: "Sarah Chen", avatar: "SC", message: "Perfect! Let's review the designs tomorrow morning.", time: "2m ago", isOwn: false, read: false, pinned: false, type: "text" }
  ],
  "proj-1": [
    { id: 1, sender: "Mike Ross", avatar: "MR", message: "I've updated the wireframes with the new feedback", time: "1h ago", isOwn: false, read: false, pinned: false, type: "text" },
    { id: 2, sender: "Sarah Chen", avatar: "SC", message: "Looks great! Can you also update the color scheme?", time: "45m ago", isOwn: false, read: false, pinned: false, type: "text" }
  ]
};