import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('react-router', () => ({
    useNavigate: () => mockNavigate,
}))

vi.mock('../../../../../service/notification.service.js', () => ({
    getUnreadNotificationCount: vi.fn().mockResolvedValue(0),
}))

vi.mock('../../../../../service/Chat.socket.service', () => ({
    onNotificationUnreadCount: vi.fn(() => () => { }),
}))

const mockNavigate = vi.fn()

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MobileBottomNav from '../../../../../features/main/components/navigation/MobileBottomNav'

describe('MobileBottomNav', () => {
    beforeEach(() => {
        mockNavigate.mockClear()
    })

    // ─── Visibility ──────────────────────────────────────────────────────────────
    describe('visibility', () => {
        it('renders when hidden=false (default)', () => {
            const { container } = render(<MobileBottomNav />)
            expect(container.firstChild).toBeInTheDocument()
        })

        it('renders nothing when hidden=true', () => {
            const { container } = render(<MobileBottomNav hidden={true} />)
            expect(container.firstChild).toBeNull()
        })
    })

    // ─── Nav Items ───────────────────────────────────────────────────────────────
    describe('nav items', () => {
        it('renders Overview item', () => {
            render(<MobileBottomNav />)
            expect(screen.getByText('Overview')).toBeInTheDocument()
        })

        it('renders Feed item', () => {
            render(<MobileBottomNav />)
            expect(screen.getByText('Feed')).toBeInTheDocument()
        })

        it('renders Activity item', () => {
            render(<MobileBottomNav />)
            expect(screen.getByText('Activity')).toBeInTheDocument()
        })

        it('renders Create item', () => {
            render(<MobileBottomNav />)
            expect(screen.getByText('Create')).toBeInTheDocument()
        })

        it('renders Alerts item', () => {
            render(<MobileBottomNav />)
            expect(screen.getByText('Alerts')).toBeInTheDocument()
        })

        it('renders Me item', () => {
            render(<MobileBottomNav />)
            expect(screen.getByText('Me')).toBeInTheDocument()
        })

        it('renders 6 total nav buttons (5 items + Me)', () => {
            render(<MobileBottomNav />)
            expect(screen.getAllByRole('button').length).toBe(6)
        })
    })

    // ─── Active State ────────────────────────────────────────────────────────────
    describe('active state', () => {
        it('applies active style to the active tab', () => {
            render(<MobileBottomNav activeTab="overview" />)
            const overviewBtn = screen.getByText('Overview').closest('button')
            expect(overviewBtn.className).toContain('bg-sky-500/15')
            expect(overviewBtn.className).toContain('text-sky-300')
        })

        it('does not apply active style to inactive tabs', () => {
            render(<MobileBottomNav activeTab="overview" />)
            const feedBtn = screen.getByText('Feed').closest('button')
            expect(feedBtn.className).toContain('text-slate-400')
        })

        it('applies active style to me tab when activeTab="me"', () => {
            render(<MobileBottomNav activeTab="me" />)
            const meBtn = screen.getByText('Me').closest('button')
            expect(meBtn.className).toContain('bg-sky-500/15')
        })

        it('defaults to overview active tab', () => {
            render(<MobileBottomNav />)
            const overviewBtn = screen.getByText('Overview').closest('button')
            expect(overviewBtn.className).toContain('bg-sky-500/15')
        })
    })

    // ─── Navigation ──────────────────────────────────────────────────────────────
    describe('navigation', () => {
        it('navigates to /main when Overview is clicked', () => {
            render(<MobileBottomNav />)
            fireEvent.click(screen.getByText('Overview').closest('button'))
            expect(mockNavigate).toHaveBeenCalledWith('/main')
        })

        it('navigates to /main/feed when Feed is clicked', () => {
            render(<MobileBottomNav />)
            fireEvent.click(screen.getByText('Feed').closest('button'))
            expect(mockNavigate).toHaveBeenCalledWith('/main/feed')
        })

        it('navigates to /main/activity when Activity is clicked', () => {
            render(<MobileBottomNav />)
            fireEvent.click(screen.getByText('Activity').closest('button'))
            expect(mockNavigate).toHaveBeenCalledWith('/main/activity')
        })

        it('navigates to /main/create when Create is clicked', () => {
            render(<MobileBottomNav />)
            fireEvent.click(screen.getByText('Create').closest('button'))
            expect(mockNavigate).toHaveBeenCalledWith('/main/create')
        })

        it('navigates to /main/notifications when Alerts is clicked', () => {
            render(<MobileBottomNav />)
            fireEvent.click(screen.getByText('Alerts').closest('button'))
            expect(mockNavigate).toHaveBeenCalledWith('/main/notifications')
        })

        it('does not navigate to profile when profileId is not set', () => {
            render(<MobileBottomNav profileId={undefined} />)
            fireEvent.click(screen.getByText('Me').closest('button'))
            expect(mockNavigate).not.toHaveBeenCalled()
        })

        it('navigates to profile when Me is clicked and profileId is provided', () => {
            render(<MobileBottomNav profileId="user-123" />)
            fireEvent.click(screen.getByText('Me').closest('button'))
            expect(mockNavigate).toHaveBeenCalledWith('/profile/user-123')
        })
    })

    // ─── Unread Badge ────────────────────────────────────────────────────────────
    describe('unread notification badge', () => {
        it('does not show badge when unread count is 0', async () => {
            const { getUnreadNotificationCount } = await import('../../../../service/notification.service')
            getUnreadNotificationCount.mockResolvedValue(0)
            render(<MobileBottomNav />)
            await waitFor(() =>
                expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument()
            )
        })

        it('shows badge with count when unread > 0', async () => {
            const { getUnreadNotificationCount } = await import('../../../../service/notification.service')
            getUnreadNotificationCount.mockResolvedValue(5)
            render(<MobileBottomNav />)
            await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument())
        })

        it('shows 99+ when unread count exceeds 99', async () => {
            const { getUnreadNotificationCount } = await import('../../../../service/notification.service')
            getUnreadNotificationCount.mockResolvedValue(120)
            render(<MobileBottomNav />)
            await waitFor(() => expect(screen.getByText('99+')).toBeInTheDocument())
        })

        it('handles service error gracefully and shows 0', async () => {
            const { getUnreadNotificationCount } = await import('../../../../service/notification.service')
            getUnreadNotificationCount.mockRejectedValue(new Error('Network error'))
            render(<MobileBottomNav />)
            // should not crash and badge should not appear
            await waitFor(() => expect(screen.queryByText('99+')).not.toBeInTheDocument())
        })
    })

    // ─── Layout ──────────────────────────────────────────────────────────────────
    describe('layout', () => {
        it('renders a fixed bottom bar', () => {
            const { container } = render(<MobileBottomNav />)
            expect(container.firstChild).toHaveClass('fixed', 'inset-x-0', 'bottom-0', 'z-40')
        })

        it('renders a 6-column grid', () => {
            const { container } = render(<MobileBottomNav />)
            const grid = container.querySelector('.grid-cols-6')
            expect(grid).toBeInTheDocument()
        })
    })
})