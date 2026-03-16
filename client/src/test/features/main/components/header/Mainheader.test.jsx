import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

const { mockNavigate, mockDispatch } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockDispatch: vi.fn(),
}))

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get(_, tag) {
        return ({ children, ...rest }) => {
          const Component = tag
          return <Component {...rest}>{children}</Component>
        }
      },
    }
  ),
  AnimatePresence: ({ children }) => <>{children}</>,
}))

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}))

vi.mock('../../../../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { name: 'Alice Johnson', email: 'alice@test.com' } }),
}))

vi.mock('../../../../../service/workspace.service.js', () => ({
  createWorkspace: vi.fn().mockResolvedValue({}),
}))

vi.mock('../../../../../service/user.service', () => ({
  searchUsers: vi.fn().mockResolvedValue({ users: [] }),
}))

vi.mock('../../../../../service/post.service', () => ({
  searchPosts: vi.fn().mockResolvedValue({ posts: [] }),
}))

vi.mock('../../../../../service/overview.service', () => ({
  getOverviewActivity: vi.fn().mockResolvedValue({ data: { data: [] } }),
}))

vi.mock('../../../../../store/slice/overviewSlice.js', () => ({
  setOverviewData: vi.fn((data) => ({ type: 'overview/setData', payload: data })),
}))

vi.mock('../../../../../features/main/components/header/UserMenu', () => ({
  default: () => <div data-testid="user-menu">UserMenu</div>,
}))
vi.mock('../../../../../features/main/components/popup/TaskPopup', () => ({
  default: ({ isOpen }) => (isOpen ? <div data-testid="task-popup">TaskPopup</div> : null),
}))
vi.mock('../../../../../features/main/components/popup/WorkspacePopup', () => ({
  default: ({ isOpen }) => (isOpen ? <div data-testid="workspace-popup">WorkspacePopup</div> : null),
}))
vi.mock('../../../../../features/main/components/header/NotificationDropdown', () => ({
  default: () => <div data-testid="notification-dropdown">Notifications</div>,
}))

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { searchUsers } from '../../../../../service/user.service'
import { searchPosts } from '../../../../../service/post.service'
import MainHeader from '../../../../../features/main/components/header/MainHeader'

describe('MainHeader', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockDispatch.mockReset()
    searchUsers.mockReset()
    searchPosts.mockReset()
    searchUsers.mockResolvedValue({ users: [] })
    searchPosts.mockResolvedValue({ posts: [] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('structure', () => {
    it('renders without crashing', () => {
      render(<MainHeader />)
      expect(screen.getByRole('banner')).toBeInTheDocument()
    })

    it('renders a sticky header element', () => {
      const { container } = render(<MainHeader />)
      expect(container.querySelector('header')).toHaveClass('sticky')
    })
  })

  describe('greeting', () => {
    it('renders greeting with user first name', () => {
      render(<MainHeader />)
      expect(screen.getByText(/Alice/)).toBeInTheDocument()
    })

    it('renders workspace sync subtitle', () => {
      render(<MainHeader />)
      expect(screen.getByText(/Your cloud workspace is fully synced/)).toBeInTheDocument()
    })
  })

  describe('search bar', () => {
    it('renders the search input', () => {
      render(<MainHeader />)
      expect(screen.getByPlaceholderText('Search users, posts...')).toBeInTheDocument()
    })

    it('updates the search input value when typed', () => {
      render(<MainHeader />)
      const input = screen.getByPlaceholderText('Search users, posts...')
      fireEvent.change(input, { target: { value: 'alice' } })
      expect(input).toHaveValue('alice')
    })

    it('clears the search input when the clear button is clicked', () => {
      const { container } = render(<MainHeader />)
      const input = screen.getByPlaceholderText('Search users, posts...')
      fireEvent.change(input, { target: { value: 'alice' } })

      const clearButton = container.querySelector('svg.lucide-x')?.closest('button')
      fireEvent.click(clearButton)
      expect(input).toHaveValue('')
    })

    it('accepts search text long enough to trigger deferred work', () => {
      render(<MainHeader />)
      const input = screen.getByPlaceholderText('Search users, posts...')
      fireEvent.change(input, { target: { value: 'Ali' } })
      expect(input).toHaveValue('Ali')
    })
  })

  describe('create dropdown', () => {
    it('renders the Create button', () => {
      render(<MainHeader />)
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    })

    it('opens create dropdown when Create button is clicked', async () => {
      render(<MainHeader />)
      fireEvent.click(screen.getByRole('button', { name: /create/i }))
      await waitFor(() => expect(screen.getByText('Quick Create')).toBeInTheDocument())
    })

    it('renders all create options when dropdown is open', async () => {
      render(<MainHeader />)
      fireEvent.click(screen.getByRole('button', { name: /create/i }))

      await waitFor(() => {
        expect(screen.getByText('New Workflow')).toBeInTheDocument()
        expect(screen.getByText('New Task')).toBeInTheDocument()
        expect(screen.getByText('New Post')).toBeInTheDocument()
      })
    })
  })

  describe('lazy child components', () => {
    it('renders NotificationDropdown inside Suspense', async () => {
      render(<MainHeader />)
      await waitFor(() => expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument())
    })

    it('renders UserMenu inside Suspense', async () => {
      render(<MainHeader />)
      await waitFor(() => expect(screen.getByTestId('user-menu')).toBeInTheDocument())
    })

    it('TaskPopup is not visible initially', () => {
      render(<MainHeader />)
      expect(screen.queryByTestId('task-popup')).not.toBeInTheDocument()
    })

    it('WorkspacePopup is not visible initially', () => {
      render(<MainHeader />)
      expect(screen.queryByTestId('workspace-popup')).not.toBeInTheDocument()
    })
  })
})



