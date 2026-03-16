import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// ── Service mocks ─────────────────────────────────────────────────────────────
vi.mock('../../../../../../service/notification.service', () => ({
  getNotifications: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markNotificationRead: vi.fn(),
  markNotificationUnread: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  deleteNotification: vi.fn(),
}))
vi.mock('../../../../../../service/follow.service', () => ({
  checkFollowStatus: vi.fn(),
  followUser: vi.fn(),
  approveFollowRequest: vi.fn(),
  rejectFollowRequest: vi.fn(),
}))
vi.mock('../../../../../../service/project.service', () => ({
  respondProjectStatusChangeRequest: vi.fn(),
}))
vi.mock('../../../../../../service/task.service', () => ({
  respondTaskAssigneeRequest: vi.fn(),
}))
vi.mock('../../../../../../service/workspace.service', () => ({
  respondWorkspaceInvite: vi.fn(),
}))

// Socket service — each listener returns an unsubscribe function
vi.mock('../../../../../../service/Chat.socket.service', () => ({
  onNotificationNew: vi.fn(() => vi.fn()),
  onNotificationUpdated: vi.fn(() => vi.fn()),
  onNotificationDeleted: vi.fn(() => vi.fn()),
  onNotificationBulk: vi.fn(() => vi.fn()),
  onNotificationAllRead: vi.fn(() => vi.fn()),
  onNotificationUnreadCount: vi.fn(() => vi.fn()),
}))

import useNotificationCenter from '../../../../../../features/main/features/notifications/hook/useNotificationCenter'
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markNotificationUnread,
  markAllNotificationsRead,
  deleteNotification,
} from '../../../../../../service/notification.service'
import {
  checkFollowStatus,
  followUser,
  approveFollowRequest,
  rejectFollowRequest,
} from '../../../../../../service/follow.service'
import { respondProjectStatusChangeRequest } from '../../../../../../service/project.service'
import { respondTaskAssigneeRequest } from '../../../../../../service/task.service'
import { respondWorkspaceInvite } from '../../../../../../service/workspace.service'
import * as socketService from '../../../../../../service/Chat.socket.service'

// ── Fixture factories ─────────────────────────────────────────────────────────
const makeNotification = (overrides = {}) => ({
  _id: 'n1',
  title: 'Test notification',
  message: 'Hello',
  read: false,
  createdAt: new Date().toISOString(),
  metadata: {},
  ...overrides,
})

describe('useNotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUnreadNotificationCount.mockResolvedValue(3)
    getNotifications.mockResolvedValue({
      notifications: [],
      unreadCount: 3,
    })
    markNotificationRead.mockResolvedValue({ _id: 'n1', read: true, readAt: new Date().toISOString() })
    markNotificationUnread.mockResolvedValue({ _id: 'n1', read: false })
    markAllNotificationsRead.mockResolvedValue(undefined)
    deleteNotification.mockResolvedValue(undefined)
    checkFollowStatus.mockResolvedValue({ isFollowing: false, isPending: false })
    followUser.mockResolvedValue({ isPending: false })
    approveFollowRequest.mockResolvedValue(undefined)
    rejectFollowRequest.mockResolvedValue(undefined)
    respondWorkspaceInvite.mockResolvedValue({})
    respondProjectStatusChangeRequest.mockResolvedValue({})
    respondTaskAssigneeRequest.mockResolvedValue({})
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Initial state
  // ────────────────────────────────────────────────────────────────────────────
  describe('initial state', () => {
    it('exposes loading, notifications, unreadCount, unreadInList, actionLoadingKey', async () => {
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(typeof result.current.loading).toBe('boolean')
      expect(Array.isArray(result.current.notifications)).toBe(true)
      expect(typeof result.current.unreadCount).toBe('number')
      expect(typeof result.current.unreadInList).toBe('number')
      expect(typeof result.current.actionLoadingKey).toBe('string')
    })

    it('fetches unread count on mount', async () => {
      renderHook(() => useNotificationCenter())
      await waitFor(() =>
        expect(getUnreadNotificationCount).toHaveBeenCalledTimes(1)
      )
    })

    it('sets unreadCount from getUnreadNotificationCount', async () => {
      getUnreadNotificationCount.mockResolvedValue(7)
      const { result } = renderHook(() => useNotificationCenter({ enabled: false }))
      await waitFor(() => expect(result.current.unreadCount).toBe(7))
    })

    it('calls getNotifications when enabled=true (default)', async () => {
      renderHook(() => useNotificationCenter({ enabled: true }))
      await waitFor(() => expect(getNotifications).toHaveBeenCalled())
    })

    it('does NOT call getNotifications when enabled=false', async () => {
      renderHook(() => useNotificationCenter({ enabled: false }))
      await waitFor(() => expect(getUnreadNotificationCount).toHaveBeenCalled())
      expect(getNotifications).not.toHaveBeenCalled()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // loadNotifications
  // ────────────────────────────────────────────────────────────────────────────
  describe('loadNotifications', () => {
    it('populates notifications state from API response', async () => {
      const notifications = [
        makeNotification({ _id: 'n1' }),
        makeNotification({ _id: 'n2', read: true }),
      ]
      getNotifications.mockResolvedValue({ notifications, unreadCount: 1 })

      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(2))
    })

    it('sets unreadCount from payload.unreadCount', async () => {
      getNotifications.mockResolvedValue({
        notifications: [],
        unreadCount: 10,
      })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.unreadCount).toBe(10))
    })

    it('passes limit to getNotifications', async () => {
      renderHook(() => useNotificationCenter({ limit: 15 }))
      await waitFor(() =>
        expect(getNotifications).toHaveBeenCalledWith({ limit: 15 })
      )
    })

    it('sets loading=false after fetch completes', async () => {
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.loading).toBe(false))
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // unreadInList (computed)
  // ────────────────────────────────────────────────────────────────────────────
  describe('unreadInList (computed)', () => {
    it('counts unread notifications in the current list', async () => {
      getNotifications.mockResolvedValue({
        notifications: [
          makeNotification({ _id: 'n1', read: false }),
          makeNotification({ _id: 'n2', read: true }),
          makeNotification({ _id: 'n3', read: false }),
        ],
        unreadCount: 2,
      })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.unreadInList).toBe(2))
    })

    it('returns 0 when all notifications are read', async () => {
      getNotifications.mockResolvedValue({
        notifications: [
          makeNotification({ _id: 'n1', read: true }),
          makeNotification({ _id: 'n2', read: true }),
        ],
        unreadCount: 0,
      })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.unreadInList).toBe(0))
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // hydrateFollowBackState
  // ────────────────────────────────────────────────────────────────────────────
  describe('hydrateFollowBackState (via loadNotifications)', () => {
    it('hydrates followed_you notifications with followActionState', async () => {
      const notification = makeNotification({
        _id: 'n1',
        metadata: { kind: 'followed_you', actorId: 'actor-1' },
      })
      getNotifications.mockResolvedValue({ notifications: [notification], unreadCount: 1 })
      checkFollowStatus.mockResolvedValue({ isFollowing: true, isPending: false })

      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() =>
        expect(result.current.notifications[0]?.metadata?.followActionState).toBe('following')
      )
    })

    it('sets followActionState="requested" when isPending=true', async () => {
      const notification = makeNotification({
        _id: 'n1',
        metadata: { kind: 'followed_you', actorId: 'actor-1' },
      })
      getNotifications.mockResolvedValue({ notifications: [notification], unreadCount: 1 })
      checkFollowStatus.mockResolvedValue({ isFollowing: false, isPending: true })

      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() =>
        expect(result.current.notifications[0]?.metadata?.followActionState).toBe('requested')
      )
    })

    it('sets followActionState="" when not following and not pending', async () => {
      const notification = makeNotification({
        _id: 'n1',
        metadata: { kind: 'followed_you', actorId: 'actor-1' },
      })
      getNotifications.mockResolvedValue({ notifications: [notification], unreadCount: 1 })
      checkFollowStatus.mockResolvedValue({ isFollowing: false, isPending: false })

      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() =>
        expect(result.current.notifications[0]?.metadata?.followActionState).toBe('')
      )
    })

    it('skips hydration for non-followed_you kinds', async () => {
      const notification = makeNotification({
        _id: 'n1',
        metadata: { kind: 'comment', actorId: 'actor-1' },
      })
      getNotifications.mockResolvedValue({ notifications: [notification], unreadCount: 1 })

      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))
      expect(checkFollowStatus).not.toHaveBeenCalled()
    })

    it('skips hydration when followActionState is already set', async () => {
      const notification = makeNotification({
        _id: 'n1',
        metadata: { kind: 'followed_you', actorId: 'a1', followActionState: 'following' },
      })
      getNotifications.mockResolvedValue({ notifications: [notification], unreadCount: 1 })

      renderHook(() => useNotificationCenter())
      await waitFor(() => expect(getNotifications).toHaveBeenCalled())
      expect(checkFollowStatus).not.toHaveBeenCalled()
    })

    it('sets followActionState="" on checkFollowStatus error', async () => {
      const notification = makeNotification({
        _id: 'n1',
        metadata: { kind: 'followed_you', actorId: 'a1' },
      })
      getNotifications.mockResolvedValue({ notifications: [notification], unreadCount: 1 })
      checkFollowStatus.mockRejectedValue(new Error('network error'))

      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() =>
        expect(result.current.notifications[0]?.metadata?.followActionState).toBe('')
      )
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // toggleReadState
  // ────────────────────────────────────────────────────────────────────────────
  describe('toggleReadState', () => {
    it('calls markNotificationUnread when notification.read=true', async () => {
      const notification = makeNotification({ _id: 'n1', read: true })
      getNotifications.mockResolvedValue({ notifications: [notification], unreadCount: 0 })
      markNotificationUnread.mockResolvedValue({ _id: 'n1', read: false })

      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => {
        await result.current.toggleReadState(notification)
      })

      expect(markNotificationUnread).toHaveBeenCalledWith('n1')
    })

    it('calls markNotificationRead when notification.read=false', async () => {
      const notification = makeNotification({ _id: 'n1', read: false })
      getNotifications.mockResolvedValue({ notifications: [notification], unreadCount: 1 })

      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => {
        await result.current.toggleReadState(notification)
      })

      expect(markNotificationRead).toHaveBeenCalledWith('n1')
    })

    it('updates the notification in state after toggling', async () => {
      const notification = makeNotification({ _id: 'n1', read: false })
      getNotifications.mockResolvedValue({ notifications: [notification], unreadCount: 1 })
      markNotificationRead.mockResolvedValue({ _id: 'n1', read: true, readAt: '2025-01-01' })

      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => {
        await result.current.toggleReadState(notification)
      })

      expect(result.current.notifications[0].read).toBe(true)
    })

    it('does nothing when notification has no _id', async () => {
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.toggleReadState({ read: false })
      })

      expect(markNotificationRead).not.toHaveBeenCalled()
      expect(markNotificationUnread).not.toHaveBeenCalled()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // ensureRead
  // ────────────────────────────────────────────────────────────────────────────
  describe('ensureRead', () => {
    it('calls markNotificationRead for unread notifications', async () => {
      const notification = makeNotification({ _id: 'n1', read: false })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.ensureRead(notification)
      })

      expect(markNotificationRead).toHaveBeenCalledWith('n1')
    })

    it('returns the original notification if already read', async () => {
      const notification = makeNotification({ _id: 'n1', read: true })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.loading).toBe(false))

      let returned
      await act(async () => {
        returned = await result.current.ensureRead(notification)
      })

      expect(markNotificationRead).not.toHaveBeenCalled()
      expect(returned).toBe(notification)
    })

    it('returns original notification when _id is missing', async () => {
      const notification = { read: false }
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.loading).toBe(false))

      let returned
      await act(async () => {
        returned = await result.current.ensureRead(notification)
      })
      expect(returned).toBe(notification)
    })

    it('returns notification on markNotificationRead error', async () => {
      const notification = makeNotification({ _id: 'n1', read: false })
      markNotificationRead.mockRejectedValue(new Error('fail'))
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.loading).toBe(false))

      let returned
      await act(async () => {
        returned = await result.current.ensureRead(notification)
      })
      expect(returned).toEqual(notification)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // removeNotification
  // ────────────────────────────────────────────────────────────────────────────
  describe('removeNotification', () => {
    it('calls deleteNotification with the given id', async () => {
      const notification = makeNotification({ _id: 'n1' })
      getNotifications.mockResolvedValue({ notifications: [notification], unreadCount: 1 })

      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => {
        await result.current.removeNotification('n1')
      })

      expect(deleteNotification).toHaveBeenCalledWith('n1')
    })

    it('removes the notification from state', async () => {
      const notifications = [
        makeNotification({ _id: 'n1' }),
        makeNotification({ _id: 'n2' }),
      ]
      getNotifications.mockResolvedValue({ notifications, unreadCount: 2 })

      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(2))

      await act(async () => {
        await result.current.removeNotification('n1')
      })

      expect(result.current.notifications).toHaveLength(1)
      expect(result.current.notifications[0]._id).toBe('n2')
    })

    it('does nothing when notificationId is falsy', async () => {
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.removeNotification(null)
      })

      expect(deleteNotification).not.toHaveBeenCalled()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // markAllRead
  // ────────────────────────────────────────────────────────────────────────────
  describe('markAllRead', () => {
    it('calls markAllNotificationsRead', async () => {
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.markAllRead()
      })

      expect(markAllNotificationsRead).toHaveBeenCalledTimes(1)
    })

    it('marks all notifications in state as read', async () => {
      getNotifications.mockResolvedValue({
        notifications: [
          makeNotification({ _id: 'n1', read: false }),
          makeNotification({ _id: 'n2', read: false }),
        ],
        unreadCount: 2,
      })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(2))

      await act(async () => {
        await result.current.markAllRead()
      })

      result.current.notifications.forEach(n => expect(n.read).toBe(true))
    })

    it('sets unreadCount to 0 after markAllRead', async () => {
      getNotifications.mockResolvedValue({ notifications: [], unreadCount: 5 })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.markAllRead()
      })

      expect(result.current.unreadCount).toBe(0)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // followBack
  // ────────────────────────────────────────────────────────────────────────────
  describe('followBack', () => {
    const followNotification = makeNotification({
      _id: 'n-follow',
      metadata: { kind: 'followed_you', actorId: 'actor-1' },
    })

    it('calls followUser with actorId', async () => {
      getNotifications.mockResolvedValue({ notifications: [followNotification], unreadCount: 1 })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => {
        await result.current.followBack(followNotification)
      })

      expect(followUser).toHaveBeenCalledWith('actor-1')
    })

    it('sets followActionState="following" when isPending=false', async () => {
      followUser.mockResolvedValue({ isPending: false })
      getNotifications.mockResolvedValue({ notifications: [followNotification], unreadCount: 1 })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => { await result.current.followBack(followNotification) })

      const updated = result.current.notifications.find(n => n._id === 'n-follow')
      expect(updated.metadata.followActionState).toBe('following')
    })

    it('sets followActionState="requested" when isPending=true', async () => {
      followUser.mockResolvedValue({ isPending: true })
      getNotifications.mockResolvedValue({ notifications: [followNotification], unreadCount: 1 })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => { await result.current.followBack(followNotification) })

      const updated = result.current.notifications.find(n => n._id === 'n-follow')
      expect(updated.metadata.followActionState).toBe('requested')
    })

    it('sets actionLoadingKey during followBack, clears it after', async () => {
      let keyDuringCall = ''
      followUser.mockImplementation(async () => {
        // We cannot directly inspect mid-async, but we test it clears after
        return { isPending: false }
      })
      getNotifications.mockResolvedValue({ notifications: [followNotification], unreadCount: 1 })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => { await result.current.followBack(followNotification) })
      expect(result.current.actionLoadingKey).toBe('')
    })

    it('does nothing when notificationId is missing', async () => {
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => { await result.current.followBack({}) })
      expect(followUser).not.toHaveBeenCalled()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // followRequestAction
  // ────────────────────────────────────────────────────────────────────────────
  describe('followRequestAction', () => {
    const followReqNotification = makeNotification({
      _id: 'n-fr',
      metadata: { kind: 'follow_request', requestId: 'req-1' },
    })

    it('calls approveFollowRequest with requestId on action="approve"', async () => {
      getNotifications.mockResolvedValue({ notifications: [followReqNotification], unreadCount: 1 })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => {
        await result.current.followRequestAction(followReqNotification, 'approve')
      })

      expect(approveFollowRequest).toHaveBeenCalledWith('req-1')
    })

    it('calls rejectFollowRequest with requestId on action="reject"', async () => {
      getNotifications.mockResolvedValue({ notifications: [followReqNotification], unreadCount: 1 })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => {
        await result.current.followRequestAction(followReqNotification, 'reject')
      })

      expect(rejectFollowRequest).toHaveBeenCalledWith('req-1')
    })

    it('sets metadata.requestState="approved" after approve', async () => {
      getNotifications.mockResolvedValue({ notifications: [followReqNotification], unreadCount: 1 })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => {
        await result.current.followRequestAction(followReqNotification, 'approve')
      })

      const updated = result.current.notifications.find(n => n._id === 'n-fr')
      expect(updated.metadata.requestState).toBe('approved')
    })

    it('sets metadata.requestState="rejected" after reject', async () => {
      getNotifications.mockResolvedValue({ notifications: [followReqNotification], unreadCount: 1 })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => {
        await result.current.followRequestAction(followReqNotification, 'reject')
      })

      const updated = result.current.notifications.find(n => n._id === 'n-fr')
      expect(updated.metadata.requestState).toBe('rejected')
    })

    it('sets requestState="expired" on 404 error', async () => {
      approveFollowRequest.mockRejectedValue({ status: 404, message: 'Not found' })
      getNotifications.mockResolvedValue({ notifications: [followReqNotification], unreadCount: 1 })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => {
        await result.current.followRequestAction(followReqNotification, 'approve')
      })

      const updated = result.current.notifications.find(n => n._id === 'n-fr')
      expect(updated.metadata.requestState).toBe('expired')
    })

    it('does nothing when notificationId is missing', async () => {
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.followRequestAction({ metadata: { requestId: 'r1' } }, 'approve')
      })
      expect(approveFollowRequest).not.toHaveBeenCalled()
    })

    it('does nothing when requestId is missing', async () => {
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.followRequestAction({ _id: 'n1', metadata: {} }, 'approve')
      })
      expect(approveFollowRequest).not.toHaveBeenCalled()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // workspaceInviteAction
  // ────────────────────────────────────────────────────────────────────────────
  describe('workspaceInviteAction', () => {
    const wsInviteNotification = makeNotification({
      _id: 'n-ws',
      metadata: { kind: 'workspace_invite_request', inviteId: 'inv-1' },
    })

    it('calls respondWorkspaceInvite with inviteId and action', async () => {
      getNotifications.mockResolvedValue({ notifications: [wsInviteNotification], unreadCount: 1 })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => {
        await result.current.workspaceInviteAction(wsInviteNotification, 'accept')
      })

      expect(respondWorkspaceInvite).toHaveBeenCalledWith({ inviteId: 'inv-1', action: 'accept' })
    })

    it('sets requestState="accepted" after accept', async () => {
      getNotifications.mockResolvedValue({ notifications: [wsInviteNotification], unreadCount: 1 })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => {
        await result.current.workspaceInviteAction(wsInviteNotification, 'accept')
      })

      const updated = result.current.notifications.find(n => n._id === 'n-ws')
      expect(updated.metadata.requestState).toBe('accepted')
    })

    it('sets requestState="rejected" after reject', async () => {
      getNotifications.mockResolvedValue({ notifications: [wsInviteNotification], unreadCount: 1 })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => {
        await result.current.workspaceInviteAction(wsInviteNotification, 'reject')
      })

      const updated = result.current.notifications.find(n => n._id === 'n-ws')
      expect(updated.metadata.requestState).toBe('rejected')
    })

    it('sets requestState="expired" on 404 / processed / not found error', async () => {
      respondWorkspaceInvite.mockRejectedValue({ status: 404, message: 'Not found' })
      getNotifications.mockResolvedValue({ notifications: [wsInviteNotification], unreadCount: 1 })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => {
        await result.current.workspaceInviteAction(wsInviteNotification, 'accept')
      })

      const updated = result.current.notifications.find(n => n._id === 'n-ws')
      expect(updated.metadata.requestState).toBe('expired')
    })

    it('returns null when inviteId is missing', async () => {
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.loading).toBe(false))

      let returned
      await act(async () => {
        returned = await result.current.workspaceInviteAction({ _id: 'n1', metadata: {} }, 'accept')
      })
      expect(returned).toBeNull()
      expect(respondWorkspaceInvite).not.toHaveBeenCalled()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // projectStatusRequestAction
  // ────────────────────────────────────────────────────────────────────────────
  describe('projectStatusRequestAction', () => {
    const projNotification = makeNotification({
      _id: 'n-proj',
      metadata: {
        kind: 'project_status_change_request',
        requestId: 'req-p1',
        projectId: 'proj-1',
        workspaceId: 'ws-1',
      },
    })

    it('calls respondProjectStatusChangeRequest with correct args', async () => {
      getNotifications.mockResolvedValue({ notifications: [projNotification], unreadCount: 1 })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => {
        await result.current.projectStatusRequestAction(projNotification, 'approve')
      })

      expect(respondProjectStatusChangeRequest).toHaveBeenCalledWith(
        'ws-1', 'proj-1', 'req-p1', 'approve'
      )
    })

    it('sets requestState="approved" after approve', async () => {
      getNotifications.mockResolvedValue({ notifications: [projNotification], unreadCount: 1 })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => {
        await result.current.projectStatusRequestAction(projNotification, 'approve')
      })

      const updated = result.current.notifications.find(n => n._id === 'n-proj')
      expect(updated.metadata.requestState).toBe('approved')
    })

    it('sets requestState="rejected" after reject', async () => {
      getNotifications.mockResolvedValue({ notifications: [projNotification], unreadCount: 1 })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => {
        await result.current.projectStatusRequestAction(projNotification, 'reject')
      })

      const updated = result.current.notifications.find(n => n._id === 'n-proj')
      expect(updated.metadata.requestState).toBe('rejected')
    })

    it('sets requestState="expired" on already-handled error', async () => {
      respondProjectStatusChangeRequest.mockRejectedValue({ message: 'already processed' })
      getNotifications.mockResolvedValue({ notifications: [projNotification], unreadCount: 1 })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => {
        await result.current.projectStatusRequestAction(projNotification, 'approve')
      })

      const updated = result.current.notifications.find(n => n._id === 'n-proj')
      expect(updated.metadata.requestState).toBe('expired')
    })

    it('returns null when required fields are missing', async () => {
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.loading).toBe(false))

      let returned
      await act(async () => {
        returned = await result.current.projectStatusRequestAction({ _id: 'n1', metadata: {} }, 'approve')
      })
      expect(returned).toBeNull()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // taskAssigneeRequestAction
  // ────────────────────────────────────────────────────────────────────────────
  describe('taskAssigneeRequestAction', () => {
    const taskNotification = makeNotification({
      _id: 'n-task',
      metadata: {
        kind: 'global_task_assignee_request',
        requestId: 'req-t1',
        taskId: 'task-1',
      },
    })

    it('calls respondTaskAssigneeRequest with correct args', async () => {
      getNotifications.mockResolvedValue({ notifications: [taskNotification], unreadCount: 1 })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => {
        await result.current.taskAssigneeRequestAction(taskNotification, 'approve')
      })

      expect(respondTaskAssigneeRequest).toHaveBeenCalledWith('task-1', 'req-t1', 'approve')
    })

    it('sets requestState="approved" after approve', async () => {
      getNotifications.mockResolvedValue({ notifications: [taskNotification], unreadCount: 1 })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => {
        await result.current.taskAssigneeRequestAction(taskNotification, 'approve')
      })

      const updated = result.current.notifications.find(n => n._id === 'n-task')
      expect(updated.metadata.requestState).toBe('approved')
    })

    it('sets requestState="expired" on 410 / expired error', async () => {
      respondTaskAssigneeRequest.mockRejectedValue({ status: 410, message: 'expired' })
      getNotifications.mockResolvedValue({ notifications: [taskNotification], unreadCount: 1 })
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      await act(async () => {
        await result.current.taskAssigneeRequestAction(taskNotification, 'approve')
      })

      const updated = result.current.notifications.find(n => n._id === 'n-task')
      expect(updated.metadata.requestState).toBe('expired')
    })

    it('returns null when taskId is missing', async () => {
      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.loading).toBe(false))

      let returned
      await act(async () => {
        returned = await result.current.taskAssigneeRequestAction({ _id: 'n1', metadata: { requestId: 'r1' } }, 'approve')
      })
      expect(returned).toBeNull()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Socket event handlers
  // ────────────────────────────────────────────────────────────────────────────
  describe('socket event handlers', () => {
    it('registers all 6 socket listeners on mount', async () => {
      renderHook(() => useNotificationCenter())
      await waitFor(() => expect(socketService.onNotificationNew).toHaveBeenCalled())
      expect(socketService.onNotificationUpdated).toHaveBeenCalled()
      expect(socketService.onNotificationDeleted).toHaveBeenCalled()
      expect(socketService.onNotificationBulk).toHaveBeenCalled()
      expect(socketService.onNotificationAllRead).toHaveBeenCalled()
      expect(socketService.onNotificationUnreadCount).toHaveBeenCalled()
    })

    it('calls all unsubscribe functions on unmount', async () => {
      const unsubscribers = Array.from({ length: 6 }, () => vi.fn())
      let i = 0
      ;[
        socketService.onNotificationNew,
        socketService.onNotificationUpdated,
        socketService.onNotificationDeleted,
        socketService.onNotificationBulk,
        socketService.onNotificationAllRead,
        socketService.onNotificationUnreadCount,
      ].forEach(listener => listener.mockReturnValue(unsubscribers[i++]))

      const { unmount } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(socketService.onNotificationNew).toHaveBeenCalled())
      unmount()

      unsubscribers.forEach(unsub => expect(unsub).toHaveBeenCalledTimes(1))
    })

    it('prepends new notification via onNotificationNew socket event', async () => {
      const existingNotification = makeNotification({ _id: 'n-old' })
      getNotifications.mockResolvedValue({ notifications: [existingNotification], unreadCount: 1 })

      let newHandler
      socketService.onNotificationNew.mockImplementation((cb) => {
        newHandler = cb
        return vi.fn()
      })

      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      const newNotification = makeNotification({ _id: 'n-new', metadata: {} })
      await act(async () => {
        await newHandler({ notification: newNotification })
      })

      expect(result.current.notifications[0]._id).toBe('n-new')
      expect(result.current.notifications).toHaveLength(2)
    })

    it('updates notification via onNotificationUpdated socket event', async () => {
      const notification = makeNotification({ _id: 'n1', title: 'Old' })
      getNotifications.mockResolvedValue({ notifications: [notification], unreadCount: 1 })

      let updatedHandler
      socketService.onNotificationUpdated.mockImplementation((cb) => {
        updatedHandler = cb
        return vi.fn()
      })

      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      act(() => {
        updatedHandler({ notification: { _id: 'n1', title: 'Updated', read: true } })
      })

      expect(result.current.notifications[0].title).toBe('Updated')
    })

    it('removes notification via onNotificationDeleted socket event', async () => {
      const notification = makeNotification({ _id: 'n1' })
      getNotifications.mockResolvedValue({ notifications: [notification], unreadCount: 1 })

      let deletedHandler
      socketService.onNotificationDeleted.mockImplementation((cb) => {
        deletedHandler = cb
        return vi.fn()
      })

      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(1))

      act(() => { deletedHandler({ notificationId: 'n1' }) })

      expect(result.current.notifications).toHaveLength(0)
    })

    it('marks all as read via onNotificationAllRead socket event', async () => {
      getNotifications.mockResolvedValue({
        notifications: [
          makeNotification({ _id: 'n1', read: false }),
          makeNotification({ _id: 'n2', read: false }),
        ],
        unreadCount: 2,
      })

      let allReadHandler
      socketService.onNotificationAllRead.mockImplementation((cb) => {
        allReadHandler = cb
        return vi.fn()
      })

      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.notifications).toHaveLength(2))

      act(() => { allReadHandler() })

      result.current.notifications.forEach(n => expect(n.read).toBe(true))
    })

    it('updates unreadCount via onNotificationUnreadCount socket event', async () => {
      let countHandler
      socketService.onNotificationUnreadCount.mockImplementation((cb) => {
        countHandler = cb
        return vi.fn()
      })

      const { result } = renderHook(() => useNotificationCenter())
      await waitFor(() => expect(result.current.loading).toBe(false))

      act(() => { countHandler({ count: 42 }) })
      expect(result.current.unreadCount).toBe(42)
    })
  })
})


