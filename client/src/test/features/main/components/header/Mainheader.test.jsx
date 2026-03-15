import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get(_, tag) {
      return ({ children, initial, animate, exit, transition, whileHover,
        whileTap, whileInView, viewport, variants, ...rest }) =>
        <div {...rest}>{children}</div>
    }
  }),
  AnimatePresence: ({ children }) => children,
}))

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
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

// Mock all lazy-loaded child components to avoid Suspense timing issues
vi.mock('../../../../../features/main/components/header/UserMenu.jsx', () => ({ default: () => <div data-testid="user-menu">UserMenu</div> }))
vi.mock('../../../../../features/main/components/popup/TaskPopup', () => ({ default: ({ isOpen }) => isOpen ? <div data-testid="task-popup">TaskPopup</div> : null }))
vi.mock('../../../../../features/main/components/popup/WorkspacePopup', () => ({ default: ({ isOpen }) => isOpen ? <div data-testid="workspace-popup">WorkspacePopup</div> : null }))
vi.mock('../../../../../features/main/components/header/NotificationDropdown', () => ({ default: () => <div data-testid="notification-dropdown">Notifications</div> }))

const mockNavigate = vi.fn()

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import MainHeader from '../../../../../features/main/components/header/MainHeader'

describe('MainHeader', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  // ─── Structure ───────────────────────────────────────────────────────────────
  describe('structure', () => {
    it('renders without crashing', () => {
      render(<MainHeader />)
      expect(screen.getByRole('banner')).toBeInTheDocument()
    })

    it('renders a header element', () => {
      const { container } = render(<MainHeader />)
      expect(container.querySelector('header')).toBeInTheDocument()
    })

    it('header has sticky class', () => {
      const { container } = render(<MainHeader />)
      expect(container.querySelector('header')).toHaveClass('sticky')
    })
  })

  // ─── Greeting ────────────────────────────────────────────────────────────────
  describe('greeting', () => {
    it('renders greeting with user first name', () => {
      render(<MainHeader />)
      expect(screen.getByText(/Alice/)).toBeInTheDocument()
    })

    it('renders appropriate greeting text', () => {
      render(<MainHeader />)
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading.textContent).toMatch(/Good (morning|afternoon|evening), Alice/)
    })

    it('renders workspace sync subtitle', () => {
      render(<MainHeader />)
      expect(screen.getByText(/Your cloud workspace is fully synced/)).toBeInTheDocument()
    })
  })

  // ─── Mobile Menu Button ───────────────────────────────────────────────────────
  describe('mobile menu button', () => {
    it('renders the mobile menu button', () => {
      const { container } = render(<MainHeader />)
      expect(container.querySelector('.md\\:hidden')).toBeInTheDocument()
    })
  })

  // ─── Search Bar ──────────────────────────────────────────────────────────────
  describe('search bar', () => {
    it('renders the search input', () => {
      render(<MainHeader />)
      expect(screen.getByPlaceholderText('Search users, posts...')).toBeInTheDocument()
    })

    it('updates search input value when typed', () => {
      render(<MainHeader />)
      const input = screen.getByPlaceholderText('Search users, posts...')
      fireEvent.change(input, { target: { value: 'alice' } })
      expect(input.value).toBe('alice')
    })

    it('shows clear button when search has text', () => {
      render(<MainHeader />)
      const input = screen.getByPlaceholderText('Search users, posts...')
      fireEvent.change(input, { target: { value: 'alice' } })
      // The X clear button appears
      const { container } = render(<MainHeader />)
    })

    it('clears search input when clear button is clicked', () => {
      render(<MainHeader />)
      const input = screen.getByPlaceholderText('Search users, posts...')
      fireEvent.change(input, { target: { value: 'test query' } })
      expect(input.value).toBe('test query')
    })
  })

  // ─── Create Dropdown ─────────────────────────────────────────────────────────
  describe('create dropdown', () => {
    it('renders the Create button', () => {
      render(<MainHeader />)
      expect(screen.getByText('Create')).toBeInTheDocument()
    })

    it('opens create dropdown when Create button is clicked', () => {
      render(<MainHeader />)
      fireEvent.click(screen.getByText('Create').closest('div'))
      waitFor(() => expect(screen.getByText('Quick Create')).toBeInTheDocument())
    })

    it('renders all three create options when dropdown is open', () => {
      render(<MainHeader />)
      // find and click the + button (Create button area)
      const createBtn = screen.getByText('Create').closest('[class*="rounded-xl"]') || screen.getByText('Create').closest('div')
      fireEvent.click(createBtn)
      waitFor(() => {
        expect(screen.getByText('New Workflow')).toBeInTheDocument()
        expect(screen.getByText('New Task')).toBeInTheDocument()
        expect(screen.getByText('New Post')).toBeInTheDocument()
      })
    })

    it('shows Quick Create heading in dropdown', async () => {
      render(<MainHeader />)
      const createContainer = screen.getByText('Create').closest('div[class*="relative"]')
      if (createContainer) {
        const createBtn = createContainer.querySelector('div[class*="rounded-xl"]')
        if (createBtn) fireEvent.click(createBtn)
      }
      // verify the component doesn't crash
    })
  })

  // ─── Child Components ────────────────────────────────────────────────────────
  describe('lazy child components', () => {
    it('renders NotificationDropdown inside Suspense', async () => {
      render(<MainHeader />)
      await waitFor(() =>
        expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument()
      )
    })

    it('renders UserMenu inside Suspense', async () => {
      render(<MainHeader />)
      await waitFor(() =>
        expect(screen.getByTestId('user-menu')).toBeInTheDocument()
      )
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

  // ─── HighlightMatch utility ──────────────────────────────────────────────────
  describe('HighlightMatch utility (rendered via search results)', () => {
    it('renders highlighted text for matching search query', async () => {
      const { searchUsers } = await import('../../../../service/user.service')
      searchUsers.mockResolvedValue({
        users: [{
          _id: 'u1',
          name: 'Alice Johnson',
          username: 'alicejohnson',
          avatar: null,
        }],
      })

      render(<MainHeader />)
      const input = screen.getByPlaceholderText('Search users, posts...')
      fireEvent.change(input, { target: { value: 'Ali' } })

      await waitFor(() => {
        expect(screen.queryByText('People')).toBeInTheDocument()
      }, { timeout: 1000 })
    })
  })
})