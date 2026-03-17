import { vi, describe, it, expect, beforeEach } from 'vitest'

const { mockNavigate, mockLogout } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockLogout: vi.fn(),
}))

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get(_, tag) {
        return ({ children, animate, transition, initial, exit, variants,
          whileHover, whileTap, whileInView, viewport, layoutId, className, ...rest }) => {
          const Component = tag
          return <Component className={className} {...rest}>{children}</Component>
        }
      },
    }
  ),
  AnimatePresence: ({ children }) => <>{children}</>,
}))

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('../../../../../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    logout: mockLogout,
    user: { _id: 'auth-user-1', name: 'Auth User' },
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import UserMenu from '../../../../../features/main/components/header/UserMenu'

describe('UserMenu', () => {
  const mockUser = {
    _id: 'user-1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'Member',
  }

  beforeEach(() => {
    mockNavigate.mockReset()
    mockLogout.mockReset()
    mockLogout.mockResolvedValue(undefined)
  })

  describe('closed state', () => {
    it('renders the trigger button', () => {
      render(<UserMenu user={mockUser} />)
      expect(screen.getByRole('button', { name: /alice johnson/i })).toBeInTheDocument()
    })

    it('renders user initials in the avatar', () => {
      render(<UserMenu user={mockUser} />)
      expect(screen.getAllByText('AJ').length).toBeGreaterThan(0)
    })

    it('renders user name in trigger', () => {
      render(<UserMenu user={mockUser} />)
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    it('renders user email in trigger', () => {
      render(<UserMenu user={mockUser} />)
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    })

    it('renders fallback U initials when name is missing', () => {
      render(<UserMenu user={{ ...mockUser, name: null }} />)
      expect(screen.getAllByText('U').length).toBeGreaterThan(0)
    })

    it('renders fallback user email when email is missing', () => {
      render(<UserMenu user={{ ...mockUser, email: '' }} />)
      expect(screen.getByText('user@example.com')).toBeInTheDocument()
    })

    it('does not show dropdown menu initially', () => {
      render(<UserMenu user={mockUser} />)
      expect(screen.queryByText('My Profile')).not.toBeInTheDocument()
    })

    it('trigger button has aria-expanded=false initially', () => {
      render(<UserMenu user={mockUser} />)
      expect(screen.getByRole('button', { name: /alice johnson/i })).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('open state', () => {
    it('opens the dropdown when trigger is clicked', async () => {
      render(<UserMenu user={mockUser} />)
      fireEvent.click(screen.getByRole('button', { name: /alice johnson/i }))
      await waitFor(() => expect(screen.getByText('My Profile')).toBeInTheDocument())
    })

    it('renders all menu items when open', async () => {
      render(<UserMenu user={mockUser} />)
      fireEvent.click(screen.getByRole('button', { name: /alice johnson/i }))

      await waitFor(() => {
        expect(screen.getByText('My Profile')).toBeInTheDocument()
        expect(screen.getByText('Activity')).toBeInTheDocument()
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
        expect(screen.getByText('Settings')).toBeInTheDocument()
        expect(screen.getByText('Appearance')).toBeInTheDocument()
        expect(screen.getByText('Help & Support')).toBeInTheDocument()
        expect(screen.getByText('Log out')).toBeInTheDocument()
      })
    })

    it('renders user name in dropdown header', async () => {
      render(<UserMenu user={mockUser} />)
      fireEvent.click(screen.getByRole('button', { name: /alice johnson/i }))

      await waitFor(() => {
        expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThan(1)
      })
    })

    it('renders user email in dropdown header', async () => {
      render(<UserMenu user={mockUser} />)
      fireEvent.click(screen.getByRole('button', { name: /alice johnson/i }))

      await waitFor(() => {
        expect(screen.getAllByText('alice@example.com').length).toBeGreaterThan(1)
      })
    })

    it('shows Admin badge when role is Admin', async () => {
      render(<UserMenu user={{ ...mockUser, role: 'Admin' }} />)
      fireEvent.click(screen.getByRole('button', { name: /alice johnson/i }))
      await waitFor(() => expect(screen.getByText('Admin')).toBeInTheDocument())
    })

    it('does not show Admin badge for non-admin roles', async () => {
      render(<UserMenu user={mockUser} />)
      fireEvent.click(screen.getByRole('button', { name: /alice johnson/i }))
      await waitFor(() => expect(screen.queryByText('Admin')).not.toBeInTheDocument())
    })

    it('renders greeting text', async () => {
      render(<UserMenu user={mockUser} />)
      fireEvent.click(screen.getByRole('button', { name: /alice johnson/i }))
      await waitFor(() => {
        expect(screen.getByText(/Good (morning|afternoon|evening)/i)).toBeInTheDocument()
      })
    })

    it('renders sign out subtitle for log out button', async () => {
      render(<UserMenu user={mockUser} />)
      fireEvent.click(screen.getByRole('button', { name: /alice johnson/i }))
      await waitFor(() => expect(screen.getByText('Sign out of your account')).toBeInTheDocument())
    })
  })

  describe('toggle behaviour', () => {
    it('allows the trigger to be clicked again after opening', async () => {
      render(<UserMenu user={mockUser} />)
      fireEvent.click(screen.getByRole('button', { name: /alice johnson/i }))
      await waitFor(() => expect(screen.getByText('My Profile')).toBeInTheDocument())
      expect(() => fireEvent.click(screen.getByRole('button', { name: /alice johnson/i }))).not.toThrow()
    })

    it('closes dropdown on Escape key press', async () => {
      render(<UserMenu user={mockUser} />)
      fireEvent.click(screen.getByRole('button', { name: /alice johnson/i }))
      await waitFor(() => expect(screen.getByText('My Profile')).toBeInTheDocument())
      fireEvent.keyDown(document, { key: 'Escape' })
      await waitFor(() => expect(screen.queryByText('My Profile')).not.toBeInTheDocument())
    })

    it('closes on click outside', async () => {
      render(
        <div>
          <UserMenu user={mockUser} />
          <div data-testid="outside">Outside</div>
        </div>
      )
      fireEvent.click(screen.getByRole('button', { name: /alice johnson/i }))
      await waitFor(() => expect(screen.getByText('My Profile')).toBeInTheDocument())
      fireEvent.mouseDown(screen.getByTestId('outside'))
      await waitFor(() => expect(screen.queryByText('My Profile')).not.toBeInTheDocument())
    })
  })

  describe('logout', () => {
    it('calls logout when Log out button is clicked', async () => {
      render(<UserMenu user={mockUser} />)
      fireEvent.click(screen.getByRole('button', { name: /alice johnson/i }))
      await waitFor(() => expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /log out/i }))
      await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1))
    })
  })
})


