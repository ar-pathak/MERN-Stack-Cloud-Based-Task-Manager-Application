import { enrichTimeline as enrichTimelineFromBackend } from '../../../../../service/overview.service';

const toIdString = (value) => String(value || "");

export const getItemId = (item) => toIdString(item?.id || item?._id);

export const getItemChatId = (item) =>
  toIdString(item?.chatId || item?.id || item?._id);

export const normalizeOverviewNode = (item) => {
  if (item.type === "workspace") {
    const projects = (item.projects || []).map(normalizeOverviewNode);
    const tasks = (item.tasks || []).map(normalizeOverviewNode);

    return {
      ...item,
      id: item.id || item._id,
      name: item.name,
      projects,
      tasks,
      hasChildren: projects.length > 0 || tasks.length > 0,
    };
  }

  if (item.type === "project") {
    const tasks = (item.tasks || []).map(normalizeOverviewNode);

    return {
      ...item,
      id: item.id || item._id,
      name: item.name,
      tasks,
      hasChildren: tasks.length > 0,
    };
  }

  const subtasks = (item.subtasks || []).map((subtask) => ({
    ...subtask,
    type: "subtask",
    id: subtask.id || subtask._id,
  }));

  return {
    ...item,
    id: item.id || item._id,
    title: item.title,
    subtasks,
    hasChildren: subtasks.length > 0,
  };
};

export const updateTreeItemById = (items, targetId, updateFn) => {
  let found = false;

  const updatedItems = items.map((item) => {
    if (getItemId(item) === toIdString(targetId)) {
      found = true;
      return updateFn(item);
    }

    let nextItem = { ...item };
    let childFound = false;

    if (item.projects) {
      const updatedProjects = updateTreeItemById(item.projects, targetId, updateFn);
      if (updatedProjects.found) {
        nextItem.projects = updatedProjects.items;
        childFound = true;
      }
    }

    if (item.tasks) {
      const updatedTasks = updateTreeItemById(item.tasks, targetId, updateFn);
      if (updatedTasks.found) {
        nextItem.tasks = updatedTasks.items;
        childFound = true;
      }
    }

    if (item.subtasks) {
      const updatedSubtasks = updateTreeItemById(item.subtasks, targetId, updateFn);
      if (updatedSubtasks.found) {
        nextItem.subtasks = updatedSubtasks.items;
        childFound = true;
      }
    }

    if (childFound) {
      found = true;
    }

    return nextItem;
  });

  return { items: updatedItems, found };
};

export const applySidebarActivityUpdate = (timeline, chatId, messageData) => {
  const updateNode = (node) => ({
    ...node,
    lastMessage: messageData,
    latestActivity: Date.now(),
  });

  const result = updateTreeItemById(timeline, chatId, updateNode);
  if (!result.found) {
    return timeline;
  }

  const nextTimeline = [...result.items];
  const rootIndex = nextTimeline.findIndex(
    (item) => getItemId(item) === toIdString(chatId)
  );

  if (rootIndex > 0) {
    const [movedItem] = nextTimeline.splice(rootIndex, 1);
    nextTimeline.unshift(movedItem);
    return nextTimeline;
  }

  if (rootIndex === -1) {
    nextTimeline.sort((a, b) => {
      const timeA = new Date(a.latestActivity || 0).getTime();
      const timeB = new Date(b.latestActivity || 0).getTime();
      return timeB - timeA;
    });
  }

  return nextTimeline;
};

export const applyUnreadUpdate = (timeline, data) => {
  const { chatId, incrementBy, reset } = data || {};

  const recurse = (items) =>
    items.map((item) => {
      if (getItemId(item) === toIdString(chatId)) {
        let unreadCount = item.unreadCount || 0;

        if (reset) {
          unreadCount = 0;
        } else if (incrementBy) {
          unreadCount += incrementBy;
        }

        return { ...item, unreadCount };
      }

      const nextItem = { ...item };
      if (item.projects) nextItem.projects = recurse(item.projects);
      if (item.tasks) nextItem.tasks = recurse(item.tasks);
      if (item.subtasks) nextItem.subtasks = recurse(item.subtasks);
      return nextItem;
    });

  return recurse(timeline);
};

export const enrichTimeline = async (
  timeline,
  activeCallsByChatId,
  mentionByChatId,
  callInviteByChatId = {}
) => {
  try {
    // Call backend service instead of doing computation in frontend
    return await enrichTimelineFromBackend(
      timeline,
      activeCallsByChatId,
      mentionByChatId,
      callInviteByChatId
    );
  } catch (error) {
    console.error('Backend enrichTimeline failed, using fallback:', error);
    // Fallback to original logic if backend fails
    return enrichTimelineFallback(
      timeline,
      activeCallsByChatId,
      mentionByChatId,
      callInviteByChatId
    );
  }
};

// Keep original logic as fallback
const enrichTimelineFallback = (
  timeline,
  activeCallsByChatId,
  mentionByChatId,
  callInviteByChatId = {}
) => {
  const recurse = (items) =>
    items.map((item) => {
      const nextItem = { ...item };
      let deepUnreadCount = 0;
      let deepMentionUnreadCount = 0;
      let deepCallInviteUnreadCount = 0;
      let deepActiveCallCount = 0;

      if (nextItem.projects) {
        nextItem.projects = recurse(nextItem.projects);
        deepUnreadCount += nextItem.projects.reduce(
          (acc, project) => acc + (project.unreadCount || 0) + (project.deepUnreadCount || 0),
          0
        );
        deepMentionUnreadCount += nextItem.projects.reduce(
          (acc, project) =>
            acc + (project.mentionUnreadCount || 0) + (project.deepMentionUnreadCount || 0),
          0
        );
        deepCallInviteUnreadCount += nextItem.projects.reduce(
          (acc, project) =>
            acc + (project.callInviteUnreadCount || 0) + (project.deepCallInviteUnreadCount || 0),
          0
        );
        deepActiveCallCount += nextItem.projects.reduce(
          (acc, project) =>
            acc + (project.activeCallCount || 0) + (project.deepActiveCallCount || 0),
          0
        );
      }

      if (nextItem.tasks) {
        nextItem.tasks = recurse(nextItem.tasks);
        deepUnreadCount += nextItem.tasks.reduce(
          (acc, task) => acc + (task.unreadCount || 0) + (task.deepUnreadCount || 0),
          0
        );
        deepMentionUnreadCount += nextItem.tasks.reduce(
          (acc, task) => acc + (task.mentionUnreadCount || 0) + (task.deepMentionUnreadCount || 0),
          0
        );
        deepCallInviteUnreadCount += nextItem.tasks.reduce(
          (acc, task) =>
            acc + (task.callInviteUnreadCount || 0) + (task.deepCallInviteUnreadCount || 0),
          0
        );
        deepActiveCallCount += nextItem.tasks.reduce(
          (acc, task) => acc + (task.activeCallCount || 0) + (task.deepActiveCallCount || 0),
          0
        );
      }

      if (nextItem.subtasks) {
        nextItem.subtasks = recurse(nextItem.subtasks);
        deepUnreadCount += nextItem.subtasks.reduce(
          (acc, subtask) => acc + (subtask.unreadCount || 0) + (subtask.deepUnreadCount || 0),
          0
        );
        deepMentionUnreadCount += nextItem.subtasks.reduce(
          (acc, subtask) =>
            acc + (subtask.mentionUnreadCount || 0) + (subtask.deepMentionUnreadCount || 0),
          0
        );
        deepCallInviteUnreadCount += nextItem.subtasks.reduce(
          (acc, subtask) =>
            acc + (subtask.callInviteUnreadCount || 0) + (subtask.deepCallInviteUnreadCount || 0),
          0
        );
        deepActiveCallCount += nextItem.subtasks.reduce(
          (acc, subtask) =>
            acc + (subtask.activeCallCount || 0) + (subtask.deepActiveCallCount || 0),
          0
        );
      }

      const itemChatId = getItemChatId(nextItem);
      const mentionInfo = mentionByChatId[itemChatId] || null;
      const callInviteInfo = callInviteByChatId[itemChatId] || null;
      const ownActiveCall = nextItem.type === "chat" ? activeCallsByChatId[itemChatId] : null;

      nextItem.deepUnreadCount = deepUnreadCount;
      nextItem.hasChildUnread = deepUnreadCount > 0;

      nextItem.mentionUnreadCount = mentionInfo?.unreadMentionCount || 0;
      nextItem.nextMentionMessageId = mentionInfo?.nextMentionMessageId || null;
      nextItem.nextMentionCreatedAt = mentionInfo?.nextMentionCreatedAt || null;
      nextItem.nextMentionContent = mentionInfo?.nextMentionContent || "";
      nextItem.deepMentionUnreadCount = deepMentionUnreadCount;
      nextItem.hasChildMentionUnread = deepMentionUnreadCount > 0;

      nextItem.callInviteUnreadCount = callInviteInfo?.unreadInviteCount || 0;
      nextItem.nextCallInviteMessageId = callInviteInfo?.nextInviteMessageId || null;
      nextItem.nextCallInviteCreatedAt = callInviteInfo?.nextInviteCreatedAt || null;
      nextItem.nextCallInviteContent = callInviteInfo?.nextInviteContent || "";
      nextItem.deepCallInviteUnreadCount = deepCallInviteUnreadCount;
      nextItem.hasChildCallInviteUnread = deepCallInviteUnreadCount > 0;

      nextItem.activeCall = ownActiveCall || null;
      nextItem.hasActiveCall = !!ownActiveCall;
      nextItem.activeCallCount = ownActiveCall ? 1 : 0;
      nextItem.deepActiveCallCount = deepActiveCallCount;
      nextItem.hasChildActiveCall = deepActiveCallCount > 0;

      return nextItem;
    });

  return recurse(timeline || []);
};

export const filterTimelineItems = (items, searchQuery) => {
  return (items || []).filter((item) => {
    const label = item.name || item.title || "";

    return !searchQuery || label.toLowerCase().includes(searchQuery.toLowerCase());
  });
};

export const getWorkspaceOptions = (timeline) => {
  return (timeline || [])
    .filter((item) => item.type === "workspace")
    .map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      workspace: workspace.id,
    }));
};

export const getProjectOptions = (timeline) => {
  const projects = [];

  (timeline || [])
    .filter((item) => item.type === "workspace")
    .forEach((workspace) => {
      (workspace.projects || []).forEach((project) => {
        projects.push({
          id: project.id,
          name: project.name,
          workspace: workspace.id,
        });
      });
    });

  return projects;
};
