import { vi, describe, it, expect, beforeEach } from 'vitest'

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}))

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('../../../../../service/notification.service.js', () => ({
  getUnreadNotificationCount: vi.fn(),
}))

vi.mock('../../../../../service/Chat.socket.service', () => ({
  onNotificationUnreadCount: vi.fn(() => () => {}),
}))

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { getUnreadNotificationCount } from '../../../../../service/notification.service.js'
import MobileBottomNav from '../../../../../features/main/components/navigation/MobileBottomNav'

describe('MobileBottomNav', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    getUnreadNotificationCount.mockReset()
    getUnreadNotificationCount.mockResolvedValue(0)
  })

  describe('visibility', () => {
    it('renders when hidden=false by default', () => {
      const { container } = render(<MobileBottomNav />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders nothing when hidden=true', () => {
      const { container } = render(<MobileBottomNav hidden={true} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('nav items', () => {
    it('renders all labels', () => {
      render(<MobileBottomNav />)
      expect(screen.getByText('Overview')).toBeInTheDocument()
      expect(screen.getByText('Feed')).toBeInTheDocument()
      expect(screen.getByText('Activity')).toBeInTheDocument()
      expect(screen.getByText('Create')).toBeInTheDocument()
      expect(screen.getByText('Alerts')).toBeInTheDocument()
      expect(screen.getByText('Me')).toBeInTheDocument()
    })

    it('renders 6 total nav buttons', () => {
      render(<MobileBottomNav />)
      expect(screen.getAllByRole('button')).toHaveLength(6)
    })
  })

  describe('active state', () => {
    it('applies active style to the active tab', () => {
      render(<MobileBottomNav activeTab="overview" />)
      expect(screen.getByText('Overview').closest('button')).toHaveClass('bg-sky-500/15', 'text-sky-300')
    })

    it('does not apply active style to inactive tabs', () => {
      render(<MobileBottomNav activeTab="overview" />)
      expect(screen.getByText('Feed').closest('button')).toHaveClass('text-slate-400')
    })

    it('applies active style to the me tab when activeTab=me', () => {
      render(<MobileBottomNav activeTab="me" />)
      expect(screen.getByText('Me').closest('button')).toHaveClass('bg-sky-500/15')
    })
  })

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

  describe('unread notification badge', () => {
    it('does not show badge when unread count is 0', async () => {
      getUnreadNotificationCount.mockResolvedValue(0)
      render(<MobileBottomNav />)
      await waitFor(() => expect(screen.queryByText(/^[1-9]\d*$/)).not.toBeInTheDocument())
    })

    it('shows badge with count when unread > 0', async () => {
      getUnreadNotificationCount.mockResolvedValue(5)
      render(<MobileBottomNav />)
      await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument())
    })

    it('shows 99+ when unread count exceeds 99', async () => {
      getUnreadNotificationCount.mockResolvedValue(120)
      render(<MobileBottomNav />)
      await waitFor(() => expect(screen.getByText('99+')).toBeInTheDocument())
    })

    it('handles service errors gracefully', async () => {
      getUnreadNotificationCount.mockRejectedValue(new Error('Network error'))
      render(<MobileBottomNav />)
      await waitFor(() => expect(screen.queryByText('99+')).not.toBeInTheDocument())
    })
  })

  describe('layout', () => {
    it('renders a fixed bottom bar', () => {
      const { container } = render(<MobileBottomNav />)
      expect(container.firstChild).toHaveClass('fixed', 'inset-x-0', 'bottom-0', 'z-40')
    })

    it('renders a 6-column grid', () => {
      const { container } = render(<MobileBottomNav />)
      expect(container.querySelector('.grid-cols-6')).toBeInTheDocument()
    })
  })
})
