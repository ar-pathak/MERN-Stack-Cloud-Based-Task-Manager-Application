import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }))

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
}))

vi.mock('../../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'user-1', name: 'Alice' } }),
}))

vi.mock('../../../../../../service/activity.service', () => ({
  getMyActivities: vi.fn(),
  getActivityDashboard: vi.fn(),
}))

vi.mock('../../../../../../features/main/components/navigation/MobileBottomNav', () => ({
  default: ({ activeTab, profileId }) => (
    <nav data-testid="mobile-bottom-nav" data-tab={activeTab} data-profile={profileId} />
  ),
}))

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import ActivityPage from '../../../../../../features/main/features/activity/pages/ActivityPage'
import { getMyActivities, getActivityDashboard } from '../../../../../../service/activity.service'

// ── Fixtures ──────────────────────────────────────────────────────────────────
const emptyActivitiesResponse = {
  activities: [],
  pagination: { page: 1, limit: 25, total: 0, totalPages: 0, hasMore: false },
}

const emptyDashboardResponse = {
  likes: { count: 0, items: [] },
  comments: { count: 0, items: [] },
  reposts: { count: 0, items: [] },
  timeSpent: null,
  accountHistory: { summary: null, events: [] },
}

const sampleActivity = {
  _id: 'act-1',
  message: 'Created a new task',
  level: 'task',
  action: 'create',
  createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
  entity: { name: 'Sprint Planning' },
}

const flushActivityTimers = async () => {
  await act(async () => {
    vi.advanceTimersByTime(300)
  })
}

describe('ActivityPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.clearAllMocks()
    getMyActivities.mockResolvedValue(emptyActivitiesResponse)
    getActivityDashboard.mockResolvedValue(emptyDashboardResponse)
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1200 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Core structure
  // ────────────────────────────────────────────────────────────────────────────
  describe('core structure', () => {
    it('renders the "Recent Activity" heading', async () => {
      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    })

    it('renders the Back button', async () => {
      render(<ActivityPage />)
      await flushActivityTimers()
      expect(screen.getByText('Back')).toBeInTheDocument()
    })

    it('renders the Refresh button', async () => {
      render(<ActivityPage />)
      await flushActivityTimers()
      expect(screen.getByText('Refresh')).toBeInTheDocument()
    })

    it('renders search input', async () => {
      render(<ActivityPage />)
      await flushActivityTimers()
      expect(screen.getByPlaceholderText('Search by message or action')).toBeInTheDocument()
    })

    it('renders the level filter select', async () => {
      render(<ActivityPage />)
      await flushActivityTimers()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('renders all level filter options', async () => {
      render(<ActivityPage />)
      await flushActivityTimers()
      const select = screen.getByRole('combobox')
      const options = select.querySelectorAll('option')
      expect(options).toHaveLength(6) // all, workspace, project, task, subtask, system
    })

    it('renders Time Spent section heading', async () => {
      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() => expect(screen.getByText('Time Spent')).toBeInTheDocument())
    })

    it('renders Account History section heading', async () => {
      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() => expect(screen.getByText('Account History')).toBeInTheDocument())
    })

    it('renders Liked Posts section heading', async () => {
      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() => expect(screen.getByText('Liked Posts')).toBeInTheDocument())
    })

    it('renders Commented Posts section heading', async () => {
      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() => expect(screen.getByText('Commented Posts')).toBeInTheDocument())
    })

    it('renders Repost Items section heading', async () => {
      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() => expect(screen.getByText('Repost Items')).toBeInTheDocument())
    })

    it('renders Detailed Activity Log heading', async () => {
      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() => expect(screen.getByText('Detailed Activity Log')).toBeInTheDocument())
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Loading states
  // ────────────────────────────────────────────────────────────────────────────
  describe('loading states', () => {
    it('shows "Loading time stats..." while dashboard is loading', () => {
      getActivityDashboard.mockReturnValue(new Promise(() => {})) // never resolves
      render(<ActivityPage />)
      expect(screen.getByText('Loading time stats...')).toBeInTheDocument()
    })

    it('shows "Loading account history..." while dashboard is loading', () => {
      getActivityDashboard.mockReturnValue(new Promise(() => {}))
      render(<ActivityPage />)
      expect(screen.getByText('Loading account history...')).toBeInTheDocument()
    })

    it('shows "Loading liked posts..." while dashboard is loading', () => {
      getActivityDashboard.mockReturnValue(new Promise(() => {}))
      render(<ActivityPage />)
      expect(screen.getByText('Loading liked posts...')).toBeInTheDocument()
    })

    it('shows "Loading activity..." while activities are loading', async () => {
      getMyActivities.mockReturnValue(new Promise(() => {}))
      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() =>
        expect(screen.getByText('Loading activity...')).toBeInTheDocument()
      )
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Activity data rendering
  // ────────────────────────────────────────────────────────────────────────────
  describe('activity data rendering', () => {
    it('renders activity message after load', async () => {
      getMyActivities.mockResolvedValue({
        activities: [sampleActivity],
        pagination: { page: 1, limit: 25, total: 1, totalPages: 1, hasMore: false },
      })

      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() =>
        expect(screen.getByText('Created a new task')).toBeInTheDocument()
      )
    })

    it('renders activity level pill with correct label', async () => {
      getMyActivities.mockResolvedValue({
        activities: [sampleActivity],
        pagination: { page: 1, limit: 25, total: 1, totalPages: 1, hasMore: false },
      })

      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() => expect(screen.getAllByText('Task').some((element) => element.tagName === 'SPAN')).toBe(true))
    })

    it('renders entity label from entity.name', async () => {
      getMyActivities.mockResolvedValue({
        activities: [sampleActivity],
        pagination: { page: 1, limit: 25, total: 1, totalPages: 1, hasMore: false },
      })

      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() => expect(screen.getByText('Sprint Planning')).toBeInTheDocument())
    })

    it('renders action badge', async () => {
      getMyActivities.mockResolvedValue({
        activities: [sampleActivity],
        pagination: { page: 1, limit: 25, total: 1, totalPages: 1, hasMore: false },
      })

      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() => expect(screen.getByText('create')).toBeInTheDocument())
    })

    it('shows empty state when no activities and no filters', async () => {
      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() =>
        expect(screen.getByText('No activity yet')).toBeInTheDocument()
      )
    })

    it('shows "No matching activity found" when filters are active with no results', async () => {
      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() => expect(screen.getByText('No activity yet')).toBeInTheDocument())

      // Apply a filter
      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'task' } })

      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() =>
        expect(screen.getByText('No matching activity found')).toBeInTheDocument()
      )
    })

    it('displays total records count', async () => {
      getMyActivities.mockResolvedValue({
        activities: [],
        pagination: { page: 1, limit: 25, total: 42, totalPages: 2, hasMore: true },
      })
      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() => expect(screen.getAllByText('42 records').length).toBeGreaterThan(0))
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Error states
  // ────────────────────────────────────────────────────────────────────────────
  describe('error states', () => {
    it('shows error message when getMyActivities fails', async () => {
      getMyActivities.mockRejectedValue(new Error('Failed to load'))
      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() =>
        expect(screen.getByText('Failed to load')).toBeInTheDocument()
      )
    })

    it('shows Retry button on activities error', async () => {
      getMyActivities.mockRejectedValue(new Error('Network error'))
      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() => expect(screen.getByText('Retry')).toBeInTheDocument())
    })

    it('shows dashboard error when getActivityDashboard fails', async () => {
      getActivityDashboard.mockRejectedValue(new Error('Dashboard failed'))
      render(<ActivityPage />)
      await waitFor(() =>
        expect(screen.getByText('Dashboard failed')).toBeInTheDocument()
      )
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Dashboard data rendering
  // ────────────────────────────────────────────────────────────────────────────
  describe('dashboard data rendering', () => {
    it('renders likes count badge', async () => {
      getActivityDashboard.mockResolvedValue({
        ...emptyDashboardResponse,
        likes: { count: 5, items: [] },
      })
      render(<ActivityPage />)
      await waitFor(() => expect(screen.getByText('5 total')).toBeInTheDocument())
    })

    it('renders time spent stats when available', async () => {
      getActivityDashboard.mockResolvedValue({
        ...emptyDashboardResponse,
        timeSpent: {
          todayLabel: '2h 30m',
          last7DaysLabel: '15h 0m',
          last30DaysLabel: '60h 0m',
          averageDailyLabel: '2h 0m',
          activeDaysLast30: 20,
          dailyBreakdownLast7: [],
          sourceBreakdown: {},
        },
      })
      render(<ActivityPage />)
      await waitFor(() => expect(screen.getByText('2h 30m')).toBeInTheDocument())
    })

    it('renders "0h 0m" when timeSpent is null', async () => {
      getActivityDashboard.mockResolvedValue(emptyDashboardResponse)
      render(<ActivityPage />)
      await waitFor(() => {
        const zeros = screen.getAllByText('0h 0m')
        expect(zeros.length).toBeGreaterThan(0)
      })
    })

    it('renders empty state for likes when no liked items', async () => {
      getActivityDashboard.mockResolvedValue(emptyDashboardResponse)
      render(<ActivityPage />)
      await waitFor(() =>
        expect(screen.getByText('You have not liked any post yet.')).toBeInTheDocument()
      )
    })

    it('renders empty state for comments when no commented items', async () => {
      getActivityDashboard.mockResolvedValue(emptyDashboardResponse)
      render(<ActivityPage />)
      await waitFor(() =>
        expect(screen.getByText('You have not commented on any post yet.')).toBeInTheDocument()
      )
    })

    it('renders empty state for reposts when no reposted items', async () => {
      getActivityDashboard.mockResolvedValue(emptyDashboardResponse)
      render(<ActivityPage />)
      await waitFor(() =>
        expect(screen.getByText('You have not reposted anything yet.')).toBeInTheDocument()
      )
    })

    it('renders "No account history available yet." when events are empty', async () => {
      getActivityDashboard.mockResolvedValue(emptyDashboardResponse)
      render(<ActivityPage />)
      await waitFor(() =>
        expect(screen.getByText('No account history available yet.')).toBeInTheDocument()
      )
    })

    it('renders account summary status when accountSummary is present', async () => {
      getActivityDashboard.mockResolvedValue({
        ...emptyDashboardResponse,
        accountHistory: {
          summary: { accountStatus: 'active', emailVerified: true },
          events: [],
        },
      })
      render(<ActivityPage />)
      await waitFor(() => expect(screen.getByText('Status')).toBeInTheDocument())
      expect(screen.getByText('active')).toBeInTheDocument()
    })

    it('renders account events when present', async () => {
      getActivityDashboard.mockResolvedValue({
        ...emptyDashboardResponse,
        accountHistory: {
          summary: null,
          events: [
            { type: 'login', at: new Date().toISOString(), title: 'Login event', description: 'User logged in' },
          ],
        },
      })
      render(<ActivityPage />)
      await waitFor(() => expect(screen.getByText('Login event')).toBeInTheDocument())
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Back button
  // ────────────────────────────────────────────────────────────────────────────
  describe('Back button', () => {
    it('calls navigate(-1) when Back button is clicked', async () => {
      render(<ActivityPage />)
      await flushActivityTimers()
      fireEvent.click(screen.getByText('Back'))
      expect(mockNavigate).toHaveBeenCalledWith(-1)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Refresh button
  // ────────────────────────────────────────────────────────────────────────────
  describe('Refresh button', () => {
    it('calls getMyActivities and getActivityDashboard on refresh', async () => {
      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() => expect(getActivityDashboard).toHaveBeenCalledTimes(1))

      fireEvent.click(screen.getByText('Refresh'))
      await waitFor(() => expect(getActivityDashboard).toHaveBeenCalledTimes(2))
    })

    it('Refresh button is disabled while loading', async () => {
      getMyActivities.mockReturnValue(new Promise(() => {}))
      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      expect(screen.getByText('Refresh').closest('button')).toBeDisabled()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Search and filter
  // ────────────────────────────────────────────────────────────────────────────
  describe('search and filter', () => {
    it('updates search term on input change', async () => {
      render(<ActivityPage />)
      await flushActivityTimers()
      const input = screen.getByPlaceholderText('Search by message or action')
      fireEvent.change(input, { target: { value: 'task' } })
      expect(input.value).toBe('task')
    })

    it('triggers getMyActivities with search param after debounce', async () => {
      render(<ActivityPage />)
      const input = screen.getByPlaceholderText('Search by message or action')
      fireEvent.change(input, { target: { value: 'sprint' } })

      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() =>
        expect(getMyActivities).toHaveBeenCalledWith(expect.objectContaining({ search: 'sprint' }))
      )
    })

    it('updates level filter on select change', async () => {
      render(<ActivityPage />)
      await flushActivityTimers()
      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'workspace' } })
      expect(select.value).toBe('workspace')
    })

    it('triggers getMyActivities with level param when filter changes', async () => {
      render(<ActivityPage />)
      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'task' } })

      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() =>
        expect(getMyActivities).toHaveBeenCalledWith(expect.objectContaining({ level: 'task' }))
      )
    })

    it('does not include level param when "all" is selected', async () => {
      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() =>
        expect(getMyActivities).toHaveBeenCalledWith(
          expect.not.objectContaining({ level: 'all' })
        )
      )
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Load More
  // ────────────────────────────────────────────────────────────────────────────
  describe('Load more pagination', () => {
    it('shows Load more button when hasMore=true', async () => {
      getMyActivities.mockResolvedValue({
        activities: [sampleActivity],
        pagination: { page: 1, limit: 25, total: 50, totalPages: 2, hasMore: true },
      })

      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() => expect(screen.getByText('Load more')).toBeInTheDocument())
    })

    it('does not show Load more button when hasMore=false', async () => {
      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() => expect(getMyActivities).toHaveBeenCalled())
      expect(screen.queryByText('Load more')).not.toBeInTheDocument()
    })

    it('calls getMyActivities with incremented page on Load more click', async () => {
      getMyActivities.mockResolvedValue({
        activities: [sampleActivity],
        pagination: { page: 1, limit: 25, total: 50, totalPages: 2, hasMore: true },
      })

      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() => expect(screen.getByText('Load more')).toBeInTheDocument())

      fireEvent.click(screen.getByText('Load more'))
      await waitFor(() =>
        expect(getMyActivities).toHaveBeenCalledWith(expect.objectContaining({ page: 2, limit: 25 }))
      )
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Liked / commented / reposted items navigation
  // ────────────────────────────────────────────────────────────────────────────
  describe('dashboard item click navigation', () => {
    it('navigates to /post/:postId when liked post is clicked', async () => {
      getActivityDashboard.mockResolvedValue({
        ...emptyDashboardResponse,
        likes: {
          count: 1,
          items: [{ _id: 'like-1', post: { _id: 'post-abc', contentPreview: 'Great post' }, likedAt: new Date().toISOString() }],
        },
      })
      render(<ActivityPage />)
      await waitFor(() => expect(screen.getByText('Great post')).toBeInTheDocument())
      fireEvent.click(screen.getByText('Great post'))
      expect(mockNavigate).toHaveBeenCalledWith('/post/post-abc')
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Mobile bottom nav
  // ────────────────────────────────────────────────────────────────────────────
  describe('MobileBottomNav', () => {
    it('renders MobileBottomNav on mobile viewport with profileId', async () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 600 })
      render(<ActivityPage />)
      await waitFor(() =>
        expect(screen.getByTestId('mobile-bottom-nav')).toBeInTheDocument()
      )
    })

    it('does not render MobileBottomNav on desktop viewport', async () => {
      render(<ActivityPage />)
      await flushActivityTimers()
      expect(screen.queryByTestId('mobile-bottom-nav')).not.toBeInTheDocument()
    })

    it('passes activeTab="activity" to MobileBottomNav', async () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 600 })
      render(<ActivityPage />)
      await waitFor(() =>
        expect(screen.getByTestId('mobile-bottom-nav')).toHaveAttribute('data-tab', 'activity')
      )
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Utility functions (local to ActivityPage)
  // ────────────────────────────────────────────────────────────────────────────
  describe('inline utility functions via rendered output', () => {
    it('capitalizes level label for pill (workspace → Workspace)', async () => {
      getMyActivities.mockResolvedValue({
        activities: [{ ...sampleActivity, level: 'workspace' }],
        pagination: { page: 1, limit: 25, total: 1, totalPages: 1, hasMore: false },
      })
      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() => expect(screen.getAllByText('Workspace').some((element) => element.tagName === 'SPAN')).toBe(true))
    })

    it('uses system pill for unknown level', async () => {
      getMyActivities.mockResolvedValue({
        activities: [{ ...sampleActivity, level: 'unknown_level' }],
        pagination: { page: 1, limit: 25, total: 1, totalPages: 1, hasMore: false },
      })
      render(<ActivityPage />)
      await act(async () => vi.advanceTimersByTime(300))
      await waitFor(() => expect(screen.getByText('Unknown_level')).toBeInTheDocument())
    })
  })
})


