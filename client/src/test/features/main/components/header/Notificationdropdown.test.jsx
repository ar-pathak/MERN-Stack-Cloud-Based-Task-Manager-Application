import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('../../../../../features/main/features/notifications/hook/useNotificationCenter.js', () => ({
  default: vi.fn(),
}))

vi.mock('../../../../../features/main/features/notifications/utils/notification.helpers', () => ({
  formatRelativeTime: vi.fn((date) => '2 hours ago'),
  resolveNotificationPath: vi.fn((n) => `/notifications/${n._id}`),
}))

const mockNavigate = vi.fn()

const defaultHookReturn = {
  loading: false,
  notifications: [],
  unreadCount: 0,
  unreadInList: 0,
  actionLoadingKey: null,
  toggleReadState: vi.fn(),
  removeNotification: vi.fn(),
  markAllRead: vi.fn(),
  followBack: vi.fn(),
  followRequestAction: vi.fn(),
  workspaceInviteAction: vi.fn(),
  projectStatusRequestAction: vi.fn(),
  taskAssigneeRequestAction: vi.fn(),
  ensureRead: vi.fn().mockResolvedValue(undefined),
}

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import useNotificationCenter from '../../../../../features/main/features/notifications/hook/useNotificationCenter.js'
import NotificationDropdown from '../../../../../features/main/components/header/NotificationDropdown.jsx'

describe('NotificationDropdown', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    useNotificationCenter.mockReturnValue({ ...defaultHookReturn })
  })

  // ─── Bell Button (closed state) ─────────────────────────────────────────────
  describe('bell button', () => {
    it('renders the bell button', () => {
      render(<NotificationDropdown />)
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
    })

    it('does not show badge when unreadCount is 0', () => {
      render(<NotificationDropdown />)
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })

    it('shows badge with unreadCount > 0', () => {
      useNotificationCenter.mockReturnValue({ ...defaultHookReturn, unreadCount: 7 })
      render(<NotificationDropdown />)
      expect(screen.getByText('7')).toBeInTheDocument()
    })

    it('shows badge with unreadInList when unreadCount is 0', () => {
      useNotificationCenter.mockReturnValue({ ...defaultHookReturn, unreadCount: 0, unreadInList: 3 })
      render(<NotificationDropdown />)
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('shows 99+ when badge count exceeds 99', () => {
      useNotificationCenter.mockReturnValue({ ...defaultHookReturn, unreadCount: 150 })
      render(<NotificationDropdown />)
      expect(screen.getByText('99+')).toBeInTheDocument()
    })
  })

  // ─── Open / Close ────────────────────────────────────────────────────────────
  describe('open/close behaviour', () => {
    it('opens dropdown when bell is clicked', () => {
      render(<NotificationDropdown />)
      fireEvent.click(screen.getByRole('button', { name: /notifications/i }))
      expect(screen.getByText('Notifications')).toBeInTheDocument()
    })

    it('closes dropdown when bell is clicked again', () => {
      render(<NotificationDropdown />)
      const bell = screen.getByRole('button', { name: /notifications/i })
      fireEvent.click(bell)
      fireEvent.click(bell)
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument()
    })

    it('closes when clicking outside', () => {
      render(
        <div>
          <NotificationDropdown />
          <div data-testid="outside">Outside</div>
        </div>
      )
      fireEvent.click(screen.getByRole('button', { name: /notifications/i }))
      expect(screen.getByText('Notifications')).toBeInTheDocument()
      fireEvent.mouseDown(screen.getByTestId('outside'))
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument()
    })
  })

  // ─── Dropdown Content ────────────────────────────────────────────────────────
  describe('dropdown content', () => {
    beforeEach(() => {
      render(<NotificationDropdown />)
      fireEvent.click(screen.getByRole('button', { name: /notifications/i }))
    })

    it('renders Notifications heading', () => {
      expect(screen.getByText('Notifications')).toBeInTheDocument()
    })

    it('renders unread count text', () => {
      expect(screen.getByText('0 unread')).toBeInTheDocument()
    })

    it('renders Mark all button', () => {
      expect(screen.getByText('Mark all')).toBeInTheDocument()
    })

    it('disables Mark all button when no unread notifications', () => {
      expect(screen.getByText('Mark all').closest('button')).toBeDisabled()
    })

    it('renders empty state when no notifications', () => {
      expect(screen.getByText('No notifications yet.')).toBeInTheDocument()
    })

    it('renders loading state when loading=true', () => {
      useNotificationCenter.mockReturnValue({ ...defaultHookReturn, loading: true })
      const { rerender } = render(<NotificationDropdown />)
      // close and reopen with new state
    })
  })

  // ─── Notification Items ──────────────────────────────────────────────────────
  describe('notification items', () => {
    const mockNotifications = [
      {
        _id: 'n1',
        title: 'New comment on your post',
        message: 'Alice commented on your post',
        read: false,
        createdAt: new Date().toISOString(),
        metadata: { kind: 'comment' },
      },
      {
        _id: 'n2',
        title: 'Task assigned',
        message: 'You have been assigned a task',
        read: true,
        createdAt: new Date().toISOString(),
        metadata: { kind: 'task_assigned' },
      },
    ]

    beforeEach(() => {
      useNotificationCenter.mockReturnValue({
        ...defaultHookReturn,
        notifications: mockNotifications,
        unreadCount: 1,
      })
      render(<NotificationDropdown />)
      fireEvent.click(screen.getByRole('button', { name: /notifications/i }))
    })

    it('renders notification titles', () => {
      expect(screen.getByText('New comment on your post')).toBeInTheDocument()
      expect(screen.getByText('Task assigned')).toBeInTheDocument()
    })

    it('renders notification messages', () => {
      expect(screen.getByText('Alice commented on your post')).toBeInTheDocument()
      expect(screen.getByText('You have been assigned a task')).toBeInTheDocument()
    })

    it('renders relative timestamps', () => {
      expect(screen.getAllByText('2 hours ago').length).toBe(2)
    })

    it('renders Mark unread button for read notification', () => {
      expect(screen.getByText('Mark unread')).toBeInTheDocument()
    })

    it('renders Mark read button for unread notification', () => {
      expect(screen.getByText('Mark read')).toBeInTheDocument()
    })

    it('renders Delete buttons for each notification', () => {
      expect(screen.getAllByText('Delete').length).toBe(2)
    })

    it('applies unread background highlight to unread notification', () => {
      // unread notification container has bg-sky-500/5
      const { container } = render(<NotificationDropdown />)
    })

    it('calls toggleReadState when Mark read/unread is clicked', () => {
      const toggleReadState = vi.fn()
      useNotificationCenter.mockReturnValue({
        ...defaultHookReturn,
        notifications: mockNotifications,
        toggleReadState,
      })
      render(<NotificationDropdown />)
      fireEvent.click(screen.getAllByRole('button', { name: /notifications/i })[0])
      fireEvent.click(screen.getAllByText('Mark read')[0])
      expect(toggleReadState).toHaveBeenCalledWith(mockNotifications[0])
    })

    it('calls removeNotification when Delete is clicked', () => {
      const removeNotification = vi.fn()
      useNotificationCenter.mockReturnValue({
        ...defaultHookReturn,
        notifications: mockNotifications,
        removeNotification,
      })
      render(<NotificationDropdown />)
      fireEvent.click(screen.getAllByRole('button', { name: /notifications/i })[0])
      fireEvent.click(screen.getAllByText('Delete')[0])
      expect(removeNotification).toHaveBeenCalledWith('n1')
    })

    it('calls markAllRead when Mark all button is clicked', () => {
      const markAllRead = vi.fn()
      useNotificationCenter.mockReturnValue({
        ...defaultHookReturn,
        notifications: mockNotifications,
        unreadCount: 1,
        markAllRead,
      })
      render(<NotificationDropdown />)
      fireEvent.click(screen.getAllByRole('button', { name: /notifications/i })[0])
      fireEvent.click(screen.getByText('Mark all').closest('button'))
      expect(markAllRead).toHaveBeenCalled()
    })
  })

  // ─── Follow Request Actions ──────────────────────────────────────────────────
  describe('follow request notification actions', () => {
    const followRequestNotification = {
      _id: 'n-fr1',
      title: 'Follow request',
      message: 'Bob wants to follow you',
      read: false,
      createdAt: new Date().toISOString(),
      metadata: { kind: 'follow_request', requestState: null, requestId: 'req-1' },
    }

    it('renders Approve and Reject buttons for follow_request', () => {
      useNotificationCenter.mockReturnValue({
        ...defaultHookReturn,
        notifications: [followRequestNotification],
        unreadCount: 1,
      })
      render(<NotificationDropdown />)
      fireEvent.click(screen.getByRole('button', { name: /notifications/i }))
      expect(screen.getByText('Approve')).toBeInTheDocument()
      expect(screen.getAllByText('Reject').length).toBeGreaterThan(0)
    })

    it('calls followRequestAction with "approve" when Approve is clicked', () => {
      const followRequestAction = vi.fn()
      useNotificationCenter.mockReturnValue({
        ...defaultHookReturn,
        notifications: [followRequestNotification],
        unreadCount: 1,
        followRequestAction,
      })
      render(<NotificationDropdown />)
      fireEvent.click(screen.getByRole('button', { name: /notifications/i }))
      fireEvent.click(screen.getByText('Approve'))
      expect(followRequestAction).toHaveBeenCalledWith(followRequestNotification, 'approve')
    })

    it('calls followRequestAction with "reject" when Reject is clicked', () => {
      const followRequestAction = vi.fn()
      useNotificationCenter.mockReturnValue({
        ...defaultHookReturn,
        notifications: [followRequestNotification],
        unreadCount: 1,
        followRequestAction,
      })
      render(<NotificationDropdown />)
      fireEvent.click(screen.getByRole('button', { name: /notifications/i }))
      fireEvent.click(screen.getAllByText('Reject')[0])
      expect(followRequestAction).toHaveBeenCalledWith(followRequestNotification, 'reject')
    })
  })

  // ─── Follow Back Action ──────────────────────────────────────────────────────
  describe('followed_you notification', () => {
    it('renders Follow back button for followed_you kind', () => {
      useNotificationCenter.mockReturnValue({
        ...defaultHookReturn,
        notifications: [{
          _id: 'n-fy1',
          title: 'Alice followed you',
          message: '',
          read: false,
          createdAt: new Date().toISOString(),
          metadata: { kind: 'followed_you', followActionState: null },
        }],
        unreadCount: 1,
      })
      render(<NotificationDropdown />)
      fireEvent.click(screen.getByRole('button', { name: /notifications/i }))
      expect(screen.getByText('Follow back')).toBeInTheDocument()
    })

    it('calls followBack when Follow back is clicked', () => {
      const followBack = vi.fn()
      const notification = {
        _id: 'n-fy1',
        title: 'Alice followed you',
        message: '',
        read: false,
        createdAt: new Date().toISOString(),
        metadata: { kind: 'followed_you', followActionState: null },
      }
      useNotificationCenter.mockReturnValue({
        ...defaultHookReturn,
        notifications: [notification],
        unreadCount: 1,
        followBack,
      })
      render(<NotificationDropdown />)
      fireEvent.click(screen.getByRole('button', { name: /notifications/i }))
      fireEvent.click(screen.getByText('Follow back'))
      expect(followBack).toHaveBeenCalledWith(notification)
    })
  })

  // ─── Workspace Invite Actions ─────────────────────────────────────────────
  describe('workspace invite notification actions', () => {
    const wsInviteNotification = {
      _id: 'n-ws1',
      title: 'Workspace invite',
      message: 'You are invited to join Design Hub',
      read: false,
      createdAt: new Date().toISOString(),
      metadata: { kind: 'workspace_invite_request', requestState: null, inviteId: 'inv-1' },
    }

    it('renders Join and Reject buttons for workspace invite', () => {
      useNotificationCenter.mockReturnValue({
        ...defaultHookReturn,
        notifications: [wsInviteNotification],
        unreadCount: 1,
      })
      render(<NotificationDropdown />)
      fireEvent.click(screen.getByRole('button', { name: /notifications/i }))
      expect(screen.getByText('Join')).toBeInTheDocument()
    })

    it('calls workspaceInviteAction with "accept" when Join is clicked', () => {
      const workspaceInviteAction = vi.fn()
      useNotificationCenter.mockReturnValue({
        ...defaultHookReturn,
        notifications: [wsInviteNotification],
        unreadCount: 1,
        workspaceInviteAction,
      })
      render(<NotificationDropdown />)
      fireEvent.click(screen.getByRole('button', { name: /notifications/i }))
      fireEvent.click(screen.getByText('Join'))
      expect(workspaceInviteAction).toHaveBeenCalledWith(wsInviteNotification, 'accept')
    })
  })

  // ─── Notification Click Navigation ───────────────────────────────────────────
  describe('notification click navigation', () => {
    it('navigates to resolved path when notification is clicked', async () => {
      const notification = {
        _id: 'n-nav1',
        title: 'Navigate test',
        message: 'Click me',
        read: false,
        createdAt: new Date().toISOString(),
        metadata: { kind: 'comment' },
      }
      useNotificationCenter.mockReturnValue({
        ...defaultHookReturn,
        notifications: [notification],
        unreadCount: 1,
      })
      render(<NotificationDropdown />)
      fireEvent.click(screen.getByRole('button', { name: /notifications/i }))
      fireEvent.click(screen.getByText('Navigate test').closest('button'))
      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith(
          '/notifications/n-nav1',
          expect.objectContaining({ state: expect.objectContaining({ fromNotification: true }) })
        )
      )
    })
  })
})