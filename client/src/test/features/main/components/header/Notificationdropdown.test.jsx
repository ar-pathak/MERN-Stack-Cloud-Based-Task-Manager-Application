import { vi, describe, it, expect, beforeEach } from 'vitest'

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}))

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('../../../../../features/main/features/notifications/hook/useNotificationCenter.js', () => ({
  default: vi.fn(),
}))

vi.mock('../../../../../features/main/features/notifications/utils/notification.helpers', () => ({
  formatRelativeTime: vi.fn(() => '2 hours ago'),
  resolveNotificationPath: vi.fn((notification) => `/notifications/${notification._id}`),
}))

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

const renderOpenDropdown = (overrides = {}) => {
  useNotificationCenter.mockReturnValue({ ...defaultHookReturn, ...overrides })
  render(<NotificationDropdown />)
  fireEvent.click(screen.getByRole('button', { name: /notifications/i }))
}

describe('NotificationDropdown', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    useNotificationCenter.mockReturnValue({ ...defaultHookReturn })
  })

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

  describe('dropdown content', () => {
    it('renders Notifications heading', () => {
      renderOpenDropdown()
      expect(screen.getByText('Notifications')).toBeInTheDocument()
    })

    it('renders unread count text', () => {
      renderOpenDropdown()
      expect(screen.getByText('0 unread')).toBeInTheDocument()
    })

    it('renders Mark all button', () => {
      renderOpenDropdown()
      expect(screen.getByText('Mark all')).toBeInTheDocument()
    })

    it('disables Mark all button when no unread notifications', () => {
      renderOpenDropdown()
      expect(screen.getByText('Mark all').closest('button')).toBeDisabled()
    })

    it('renders empty state when no notifications', () => {
      renderOpenDropdown()
      expect(screen.getByText('No notifications yet.')).toBeInTheDocument()
    })

    it('renders loading state when loading=true', () => {
      renderOpenDropdown({ loading: true })
      expect(screen.getByText('Loading notifications...')).toBeInTheDocument()
    })
  })

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

    const openWithNotifications = (overrides = {}) => {
      renderOpenDropdown({ notifications: mockNotifications, unreadCount: 1, ...overrides })
    }

    it('renders notification titles', () => {
      openWithNotifications()
      expect(screen.getByText('New comment on your post')).toBeInTheDocument()
      expect(screen.getByText('Task assigned')).toBeInTheDocument()
    })

    it('renders notification messages', () => {
      openWithNotifications()
      expect(screen.getByText('Alice commented on your post')).toBeInTheDocument()
      expect(screen.getByText('You have been assigned a task')).toBeInTheDocument()
    })

    it('renders relative timestamps', () => {
      openWithNotifications()
      expect(screen.getAllByText('2 hours ago').length).toBe(2)
    })

    it('renders Mark unread button for read notification', () => {
      openWithNotifications()
      expect(screen.getByText('Mark unread')).toBeInTheDocument()
    })

    it('renders Mark read button for unread notification', () => {
      openWithNotifications()
      expect(screen.getByText('Mark read')).toBeInTheDocument()
    })

    it('renders Delete buttons for each notification', () => {
      openWithNotifications()
      expect(screen.getAllByText('Delete').length).toBe(2)
    })

    it('applies unread background highlight to unread notification', () => {
      openWithNotifications()
      const unreadItem = screen.getByText('New comment on your post').closest('div.border-b')
      expect(unreadItem).toHaveClass('bg-sky-500/5')
    })

    it('calls toggleReadState when Mark read or unread is clicked', () => {
      const toggleReadState = vi.fn()
      openWithNotifications({ toggleReadState })
      fireEvent.click(screen.getByText('Mark read'))
      expect(toggleReadState).toHaveBeenCalledWith(mockNotifications[0])
    })

    it('calls removeNotification when Delete is clicked', () => {
      const removeNotification = vi.fn()
      openWithNotifications({ removeNotification })
      fireEvent.click(screen.getAllByText('Delete')[0])
      expect(removeNotification).toHaveBeenCalledWith('n1')
    })

    it('calls markAllRead when Mark all button is clicked', () => {
      const markAllRead = vi.fn()
      openWithNotifications({ markAllRead })
      fireEvent.click(screen.getByText('Mark all').closest('button'))
      expect(markAllRead).toHaveBeenCalledTimes(1)
    })
  })

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
      renderOpenDropdown({ notifications: [followRequestNotification], unreadCount: 1 })
      expect(screen.getByText('Approve')).toBeInTheDocument()
      expect(screen.getAllByText('Reject').length).toBeGreaterThan(0)
    })

    it('calls followRequestAction with approve when Approve is clicked', () => {
      const followRequestAction = vi.fn()
      renderOpenDropdown({
        notifications: [followRequestNotification],
        unreadCount: 1,
        followRequestAction,
      })
      fireEvent.click(screen.getByText('Approve'))
      expect(followRequestAction).toHaveBeenCalledWith(followRequestNotification, 'approve')
    })

    it('calls followRequestAction with reject when Reject is clicked', () => {
      const followRequestAction = vi.fn()
      renderOpenDropdown({
        notifications: [followRequestNotification],
        unreadCount: 1,
        followRequestAction,
      })
      fireEvent.click(screen.getAllByText('Reject')[0])
      expect(followRequestAction).toHaveBeenCalledWith(followRequestNotification, 'reject')
    })
  })

  describe('followed_you notification', () => {
    it('renders Follow back button for followed_you kind', () => {
      renderOpenDropdown({
        notifications: [
          {
            _id: 'n-fy1',
            title: 'Alice followed you',
            message: '',
            read: false,
            createdAt: new Date().toISOString(),
            metadata: { kind: 'followed_you', followActionState: null },
          },
        ],
        unreadCount: 1,
      })
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
      renderOpenDropdown({ notifications: [notification], unreadCount: 1, followBack })
      fireEvent.click(screen.getByText('Follow back'))
      expect(followBack).toHaveBeenCalledWith(notification)
    })
  })

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
      renderOpenDropdown({ notifications: [wsInviteNotification], unreadCount: 1 })
      expect(screen.getByText('Join')).toBeInTheDocument()
    })

    it('calls workspaceInviteAction with accept when Join is clicked', () => {
      const workspaceInviteAction = vi.fn()
      renderOpenDropdown({
        notifications: [wsInviteNotification],
        unreadCount: 1,
        workspaceInviteAction,
      })
      fireEvent.click(screen.getByText('Join'))
      expect(workspaceInviteAction).toHaveBeenCalledWith(wsInviteNotification, 'accept')
    })
  })

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
      renderOpenDropdown({ notifications: [notification], unreadCount: 1 })
      fireEvent.click(screen.getByText('Navigate test').closest('button'))
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          '/notifications/n-nav1',
          expect.objectContaining({ state: expect.objectContaining({ fromNotification: true }) })
        )
      })
    })
  })
})
