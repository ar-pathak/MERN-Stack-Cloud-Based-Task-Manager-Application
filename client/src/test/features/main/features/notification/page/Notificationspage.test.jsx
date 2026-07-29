import { vi, describe, it, expect, beforeEach } from 'vitest'

const { mockNavigate, mockLoaderData } = vi.hoisted(() => ({
    mockNavigate: vi.fn(),
    mockLoaderData: vi.fn(),
}))

vi.mock('framer-motion', () => ({
    motion: new Proxy({}, {
        get(_, tag) {
            return ({ children, animate, transition, initial, exit, variants,
                whileHover, whileTap, className, ...rest }) =>
                <div className={className} {...rest}>{children}</div>
        }
    }),
    AnimatePresence: ({ children }) => <>{children}</>,
}))

vi.mock('react-router', () => ({
    useNavigate: () => mockNavigate,
    useLoaderData: () => mockLoaderData(),
}))

vi.mock('../../../../../../context/AuthContext', () => ({
    useAuth: () => ({ user: { _id: 'user-1' } }),
}))

vi.mock('../../../../../../features/main/features/notifications/hook/useNotificationCenter.js', () => ({
    default: vi.fn(),
}))

vi.mock('../../../../../../features/main/features/notifications/utils/notification.helpers', () => ({
    formatRelativeTime: vi.fn(() => '5m ago'),
    resolveNotificationPath: vi.fn((n) => `/notifications/${n?._id}`),
    toIdString: vi.fn((v) => String(v?._id || v?.id || v || '')),
}))

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NotificationsPage from '../../../../../../features/main/features/notifications/pages/NotificationsPage'
import useNotificationCenter from '../../../../../../features/main/features/notifications/hook/useNotificationCenter'

// ── Default hook return ───────────────────────────────────────────────────────
const buildHookReturn = (overrides = {}) => ({
    loading: false,
    notifications: [],
    unreadCount: 0,
    unreadInList: 0,
    actionLoadingKey: '',
    toggleReadState: vi.fn(),
    removeNotification: vi.fn(),
    markAllRead: vi.fn(),
    followBack: vi.fn(),
    followRequestAction: vi.fn(),
    workspaceInviteAction: vi.fn(),
    projectStatusRequestAction: vi.fn(),
    taskAssigneeRequestAction: vi.fn(),
    ensureRead: vi.fn().mockResolvedValue(undefined),
    ...overrides,
})

const makeNotification = (overrides = {}) => ({
    _id: 'n1',
    title: 'Test notification',
    message: 'Something happened',
    read: false,
    createdAt: new Date().toISOString(),
    metadata: {},
    ...overrides,
})

describe('NotificationsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockNavigate.mockClear()
        mockLoaderData.mockReturnValue(null)
        useNotificationCenter.mockReturnValue(buildHookReturn())
        Object.defineProperty(window, 'innerWidth', { writable: true, value: 1200 })
    })

    // ────────────────────────────────────────────────────────────────────────────
    // Core structure
    // ────────────────────────────────────────────────────────────────────────────
    describe('core structure', () => {
        it('renders without crashing', () => {
            render(<NotificationsPage />)
            expect(screen.getByText('Notifications')).toBeInTheDocument()
        })

        it('renders the Back arrow button', () => {
            render(<NotificationsPage />)
            const backBtn = screen.getByRole('button', { name: 'Go back' })
            expect(backBtn).toBeInTheDocument()
        })

        it('renders the "Mark all" button', () => {
            render(<NotificationsPage />)
            expect(screen.getByText('Mark all')).toBeInTheDocument()
        })

        it('renders unread count text', () => {
            useNotificationCenter.mockReturnValue(buildHookReturn({ unreadCount: 5 }))
            render(<NotificationsPage />)
            expect(screen.getByText('5 unread')).toBeInTheDocument()
        })

        it('shows "0 unread" when nothing is unread', () => {
            render(<NotificationsPage />)
            expect(screen.getByText('0 unread')).toBeInTheDocument()
        })

        it('uses unreadInList as fallback when unreadCount is 0', () => {
            useNotificationCenter.mockReturnValue(buildHookReturn({ unreadCount: 0, unreadInList: 3 }))
            render(<NotificationsPage />)
            expect(screen.getByText('3 unread')).toBeInTheDocument()
        })
    })

    // ────────────────────────────────────────────────────────────────────────────
    // Loading state
    // ────────────────────────────────────────────────────────────────────────────
    describe('loading state', () => {
        it('shows skeleton placeholders when loading and no cached notifications exist', () => {
            useNotificationCenter.mockReturnValue(buildHookReturn({ loading: true }))
            const { container } = render(<NotificationsPage />)
            expect(container.querySelectorAll('.animate-pulse')).toHaveLength(6)
        })

        it('renders loader notifications while hook data is still loading', () => {
            mockLoaderData.mockReturnValue({
                notifications: [makeNotification({ _id: 'n-cached', title: 'Cached item' })],
                unreadCount: 1,
            })
            useNotificationCenter.mockReturnValue(buildHookReturn({
                loading: true,
                notifications: [],
            }))
            render(<NotificationsPage />)
            expect(screen.getByText('Cached item')).toBeInTheDocument()
        })
    })

    // ────────────────────────────────────────────────────────────────────────────
    // Empty state
    // ────────────────────────────────────────────────────────────────────────────
    describe('empty state', () => {
        it('shows "No notifications yet." when notifications list is empty', () => {
            render(<NotificationsPage />)
            expect(screen.getByText('No notifications yet.')).toBeInTheDocument()
        })
    })

    // ────────────────────────────────────────────────────────────────────────────
    // Notification items rendering
    // ────────────────────────────────────────────────────────────────────────────
    describe('notification items', () => {
        it('renders notification title', () => {
            useNotificationCenter.mockReturnValue(buildHookReturn({
                notifications: [makeNotification({ title: 'New follower!' })],
            }))
            render(<NotificationsPage />)
            expect(screen.getByText('New follower!')).toBeInTheDocument()
        })

        it('renders notification message', () => {
            useNotificationCenter.mockReturnValue(buildHookReturn({
                notifications: [makeNotification({ message: 'Alice started following you' })],
            }))
            render(<NotificationsPage />)
            expect(screen.getByText('Alice started following you')).toBeInTheDocument()
        })

        it('renders relative time from formatRelativeTime', () => {
            useNotificationCenter.mockReturnValue(buildHookReturn({
                notifications: [makeNotification()],
            }))
            render(<NotificationsPage />)
            expect(screen.getAllByText('5m ago').length).toBeGreaterThan(0)
        })

        it('renders "Mark unread" button for read notifications', () => {
            useNotificationCenter.mockReturnValue(buildHookReturn({
                notifications: [makeNotification({ read: true })],
            }))
            render(<NotificationsPage />)
            expect(screen.getByText('Mark unread')).toBeInTheDocument()
        })

        it('renders "Mark read" button for unread notifications', () => {
            useNotificationCenter.mockReturnValue(buildHookReturn({
                notifications: [makeNotification({ read: false })],
            }))
            render(<NotificationsPage />)
            expect(screen.getByText('Mark read')).toBeInTheDocument()
        })

        it('renders Delete button for each notification', () => {
            useNotificationCenter.mockReturnValue(buildHookReturn({
                notifications: [makeNotification({ _id: 'n1' }), makeNotification({ _id: 'n2' })],
            }))
            render(<NotificationsPage />)
            expect(screen.getAllByText('Delete').length).toBe(2)
        })

        it('applies bg-sky-500/5 class to unread notification', () => {
            useNotificationCenter.mockReturnValue(buildHookReturn({
                notifications: [makeNotification({ _id: 'n1', read: false })],
            }))
            const { container } = render(<NotificationsPage />)
            expect(container.querySelector('.bg-sky-500\\/5')).toBeInTheDocument()
        })

        it('applies bg-transparent to read notification', () => {
            useNotificationCenter.mockReturnValue(buildHookReturn({
                notifications: [makeNotification({ _id: 'n1', read: true })],
            }))
            const { container } = render(<NotificationsPage />)
            expect(container.querySelector('.bg-transparent')).toBeInTheDocument()
        })

        it('renders multiple notifications', () => {
            useNotificationCenter.mockReturnValue(buildHookReturn({
                notifications: [
                    makeNotification({ _id: 'n1', title: 'First' }),
                    makeNotification({ _id: 'n2', title: 'Second' }),
                    makeNotification({ _id: 'n3', title: 'Third' }),
                ],
            }))
            render(<NotificationsPage />)
            expect(screen.getByText('First')).toBeInTheDocument()
            expect(screen.getByText('Second')).toBeInTheDocument()
            expect(screen.getByText('Third')).toBeInTheDocument()
        })
    })

    // ────────────────────────────────────────────────────────────────────────────
    // Follow request actions
    // ────────────────────────────────────────────────────────────────────────────
    describe('follow request action buttons', () => {
        it('renders Approve and Reject buttons for unread follow_request with requestId', () => {
            useNotificationCenter.mockReturnValue(buildHookReturn({
                notifications: [makeNotification({
                    _id: 'n-fr',
                    read: false,
                    metadata: { kind: 'follow_request', requestId: 'req-1', requestState: null },
                })],
            }))
            render(<NotificationsPage />)
            expect(screen.getByText('Approve')).toBeInTheDocument()
            expect(screen.getAllByText('Reject').length).toBeGreaterThan(0)
        })

        it('does NOT render Approve/Reject when requestState is set', () => {
            useNotificationCenter.mockReturnValue(buildHookReturn({
                notifications: [makeNotification({
                    _id: 'n-fr',
                    read: false,
                    metadata: { kind: 'follow_request', requestId: 'req-1', requestState: 'approved' },
                })],
            }))
            render(<NotificationsPage />)
            expect(screen.queryByText('Approve')).not.toBeInTheDocument()
        })

        it('calls followRequestAction with "approve" when Approve is clicked', () => {
            const followRequestAction = vi.fn()
            const notification = makeNotification({
                _id: 'n-fr',
                read: false,
                metadata: { kind: 'follow_request', requestId: 'req-1', requestState: null },
            })
            useNotificationCenter.mockReturnValue(buildHookReturn({ notifications: [notification], followRequestAction }))
            render(<NotificationsPage />)
            fireEvent.click(screen.getByText('Approve'))
            expect(followRequestAction).toHaveBeenCalledWith(notification, 'approve')
        })

        it('calls followRequestAction with "reject" when Reject button is clicked', () => {
            const followRequestAction = vi.fn()
            const notification = makeNotification({
                _id: 'n-fr',
                read: false,
                metadata: { kind: 'follow_request', requestId: 'req-1', requestState: null },
            })
            useNotificationCenter.mockReturnValue(buildHookReturn({ notifications: [notification], followRequestAction }))
            render(<NotificationsPage />)
            fireEvent.click(screen.getAllByText('Reject')[0])
            expect(followRequestAction).toHaveBeenCalledWith(notification, 'reject')
        })

        it('disables Approve button when actionLoadingKey matches', () => {
            const notification = makeNotification({
                _id: 'n-fr',
                read: false,
                metadata: { kind: 'follow_request', requestId: 'req-1', requestState: null },
            })
            useNotificationCenter.mockReturnValue(buildHookReturn({
                notifications: [notification],
                actionLoadingKey: 'approve:n-fr',
            }))
            render(<NotificationsPage />)
            expect(screen.getByText('...').closest('button')).toBeDisabled()
        })
    })

    // ────────────────────────────────────────────────────────────────────────────
    // Follow back action
    // ────────────────────────────────────────────────────────────────────────────
    describe('followed_you — Follow back button', () => {
        it('renders Follow back button for followed_you notification without followActionState', () => {
            useNotificationCenter.mockReturnValue(buildHookReturn({
                notifications: [makeNotification({
                    _id: 'n-fy',
                    metadata: { kind: 'followed_you', followActionState: null },
                })],
            }))
            render(<NotificationsPage />)
            expect(screen.getByText('Follow back')).toBeInTheDocument()
        })

        it('does NOT render Follow back when followActionState is set', () => {
            useNotificationCenter.mockReturnValue(buildHookReturn({
                notifications: [makeNotification({
                    _id: 'n-fy',
                    metadata: { kind: 'followed_you', followActionState: 'following' },
                })],
            }))
            render(<NotificationsPage />)
            expect(screen.queryByText('Follow back')).not.toBeInTheDocument()
        })

        it('calls followBack when Follow back is clicked', () => {
            const followBack = vi.fn()
            const notification = makeNotification({
                _id: 'n-fy',
                metadata: { kind: 'followed_you', followActionState: null },
            })
            useNotificationCenter.mockReturnValue(buildHookReturn({ notifications: [notification], followBack }))
            render(<NotificationsPage />)
            fireEvent.click(screen.getByText('Follow back'))
            expect(followBack).toHaveBeenCalledWith(notification)
        })
    })

    // ────────────────────────────────────────────────────────────────────────────
    // Workspace invite actions
    // ────────────────────────────────────────────────────────────────────────────
    describe('workspace invite action buttons', () => {
        it('renders Join and Reject buttons for workspace_invite_request', () => {
            useNotificationCenter.mockReturnValue(buildHookReturn({
                notifications: [makeNotification({
                    _id: 'n-ws',
                    metadata: { kind: 'workspace_invite_request', inviteId: 'inv-1', requestState: null },
                })],
            }))
            render(<NotificationsPage />)
            expect(screen.getByText('Join')).toBeInTheDocument()
        })

        it('calls workspaceInviteAction with "accept" when Join is clicked', () => {
            const workspaceInviteAction = vi.fn()
            const notification = makeNotification({
                _id: 'n-ws',
                metadata: { kind: 'workspace_invite_request', inviteId: 'inv-1', requestState: null },
            })
            useNotificationCenter.mockReturnValue(buildHookReturn({ notifications: [notification], workspaceInviteAction }))
            render(<NotificationsPage />)
            fireEvent.click(screen.getByText('Join'))
            expect(workspaceInviteAction).toHaveBeenCalledWith(notification, 'accept')
        })
    })

    // ────────────────────────────────────────────────────────────────────────────
    // Mark all button
    // ────────────────────────────────────────────────────────────────────────────
    describe('Mark all button', () => {
        it('disables Mark all when no unread notifications', () => {
            render(<NotificationsPage />)
            expect(screen.getByText('Mark all').closest('button')).toBeDisabled()
        })

        it('enables Mark all when there are unread notifications', () => {
            useNotificationCenter.mockReturnValue(buildHookReturn({ unreadCount: 3 }))
            render(<NotificationsPage />)
            expect(screen.getByText('Mark all').closest('button')).not.toBeDisabled()
        })

        it('calls markAllRead when Mark all is clicked', () => {
            const markAllRead = vi.fn()
            useNotificationCenter.mockReturnValue(buildHookReturn({ unreadCount: 5, markAllRead }))
            render(<NotificationsPage />)
            fireEvent.click(screen.getByText('Mark all'))
            expect(markAllRead).toHaveBeenCalledTimes(1)
        })
    })

    // ────────────────────────────────────────────────────────────────────────────
    // Toggle read state
    // ────────────────────────────────────────────────────────────────────────────
    describe('Mark read / Mark unread', () => {
        it('calls toggleReadState when "Mark read" is clicked', () => {
            const toggleReadState = vi.fn()
            const notification = makeNotification({ read: false })
            useNotificationCenter.mockReturnValue(buildHookReturn({ notifications: [notification], toggleReadState }))
            render(<NotificationsPage />)
            fireEvent.click(screen.getByText('Mark read'))
            expect(toggleReadState).toHaveBeenCalledWith(notification)
        })

        it('calls toggleReadState when "Mark unread" is clicked', () => {
            const toggleReadState = vi.fn()
            const notification = makeNotification({ read: true })
            useNotificationCenter.mockReturnValue(buildHookReturn({ notifications: [notification], toggleReadState }))
            render(<NotificationsPage />)
            fireEvent.click(screen.getByText('Mark unread'))
            expect(toggleReadState).toHaveBeenCalledWith(notification)
        })
    })

    // ────────────────────────────────────────────────────────────────────────────
    // Delete notification
    // ────────────────────────────────────────────────────────────────────────────
    describe('Delete button', () => {
        it('calls removeNotification with notification._id', () => {
            const removeNotification = vi.fn()
            const notification = makeNotification({ _id: 'n-del' })
            useNotificationCenter.mockReturnValue(buildHookReturn({ notifications: [notification], removeNotification }))
            render(<NotificationsPage />)
            fireEvent.click(screen.getByText('Delete'))
            expect(removeNotification).toHaveBeenCalledWith('n-del')
        })
    })

    // ────────────────────────────────────────────────────────────────────────────
    // Notification click navigation
    // ────────────────────────────────────────────────────────────────────────────
    describe('notification click navigation', () => {
        it('calls ensureRead and navigates to resolved path on click', async () => {
            const ensureRead = vi.fn().mockResolvedValue(undefined)
            const notification = makeNotification({ _id: 'n1' })
            useNotificationCenter.mockReturnValue(buildHookReturn({ notifications: [notification], ensureRead }))
            render(<NotificationsPage />)

            fireEvent.click(screen.getByText('Test notification').closest('button'))
            await waitFor(() => expect(ensureRead).toHaveBeenCalledWith(notification))
            expect(mockNavigate).toHaveBeenCalledWith(
                '/notifications/n1',
                expect.objectContaining({ state: { fromNotification: true, notificationId: 'n1' } })
            )
        })

        it('navigates even when ensureRead throws', async () => {
            const ensureRead = vi.fn().mockRejectedValue(new Error('read failed'))
            const notification = makeNotification({ _id: 'n1' })
            useNotificationCenter.mockReturnValue(buildHookReturn({ notifications: [notification], ensureRead }))
            render(<NotificationsPage />)

            fireEvent.click(screen.getByText('Test notification').closest('button'))
            await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
        })
    })

    // ────────────────────────────────────────────────────────────────────────────
    // Back button
    // ────────────────────────────────────────────────────────────────────────────
    describe('Back button', () => {
        it('calls navigate(-1) when back arrow is clicked', () => {
            render(<NotificationsPage />)
            fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
            expect(mockNavigate).toHaveBeenCalledWith(-1)
        })
    })

    // ────────────────────────────────────────────────────────────────────────────
    // useNotificationCenter called with correct options
    // ────────────────────────────────────────────────────────────────────────────
    describe('hook configuration', () => {
        it('calls useNotificationCenter with enabled=true and limit=50', () => {
            render(<NotificationsPage />)
            expect(useNotificationCenter).toHaveBeenCalledWith({
                enabled: true,
                limit: 50,
                initialNotifications: [],
                initialUnreadCount: 0,
                initialDataLoaded: false,
            })
        })

        it('passes loader payload into useNotificationCenter when route data is available', () => {
            const loaderNotification = makeNotification({ _id: 'n-loader', title: 'From loader' })
            mockLoaderData.mockReturnValue({
                notifications: [loaderNotification],
                unreadCount: 4,
            })

            render(<NotificationsPage />)

            expect(useNotificationCenter).toHaveBeenCalledWith({
                enabled: true,
                limit: 50,
                initialNotifications: [loaderNotification],
                initialUnreadCount: 4,
                initialDataLoaded: true,
            })
        })
    })

    // ────────────────────────────────────────────────────────────────────────────
    // MobileBottomNav
    // ────────────────────────────────────────────────────────────────────────────
    describe('mobile layout spacing', () => {
        it('adds bottom spacing on mobile viewport for the shared bottom nav', () => {
            Object.defineProperty(window, 'innerWidth', { writable: true, value: 600 })
            const { container } = render(<NotificationsPage />)
            expect(container.firstChild).toHaveClass('pb-[5.25rem]')
        })

        it('uses desktop spacing when the shared bottom nav is not visible', () => {
            const { container } = render(<NotificationsPage />)
            expect(container.firstChild).toHaveClass('pb-8')
        })
    })
})

