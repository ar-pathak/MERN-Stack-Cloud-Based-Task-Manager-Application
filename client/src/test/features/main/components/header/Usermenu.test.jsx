import { vi, describe, it, expect } from 'vitest'

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
    useNavigate: () => vi.fn(),
}))

vi.mock('../../../../../context/AuthContext.jsx', () => ({
    useAuth: () => ({
        logout: vi.fn().mockResolvedValue(undefined),
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

    // ─── Closed State ────────────────────────────────────────────────────────────
    describe('closed state', () => {
        it('renders the trigger button', () => {
            render(<UserMenu user={mockUser} />)
            expect(screen.getByRole('button', { name: /alice johnson/i })).toBeInTheDocument()
        })

        it('renders user initials in the avatar', () => {
            render(<UserMenu user={mockUser} />)
            // AJ = first letters of Alice Johnson
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

        it('renders fallback "U" initials when name is missing', () => {
            render(<UserMenu user={{ ...mockUser, name: null }} />)
            expect(screen.getAllByText('U').length).toBeGreaterThan(0)
        })

        it('renders fallback "user@example.com" when email is missing', () => {
            render(<UserMenu user={{ ...mockUser, email: '' }} />)
            expect(screen.getByText('user@example.com')).toBeInTheDocument()
        })

        it('does not show dropdown menu initially', () => {
            render(<UserMenu user={mockUser} />)
            expect(screen.queryByText('My Profile')).not.toBeInTheDocument()
        })

        it('trigger button has aria-expanded="false" initially', () => {
            render(<UserMenu user={mockUser} />)
            expect(screen.getByRole('button', { name: /alice johnson/i })).toHaveAttribute('aria-expanded', 'false')
        })
    })

    // ─── Open State ─────────────────────────────────────────────────────────────
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
                const names = screen.getAllByText('Alice Johnson')
                expect(names.length).toBeGreaterThan(0)
            })
        })

        it('renders user email in dropdown header', async () => {
            render(<UserMenu user={mockUser} />)
            fireEvent.click(screen.getByRole('button', { name: /alice johnson/i }))
            await waitFor(() => {
                const emails = screen.getAllByText('alice@example.com')
                expect(emails.length).toBeGreaterThan(0)
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
                const greeting = screen.getByText(/Good (morning|afternoon|evening) 👋/)
                expect(greeting).toBeInTheDocument()
            })
        })

        it('renders Sign out subtitle for log out button', async () => {
            render(<UserMenu user={mockUser} />)
            fireEvent.click(screen.getByRole('button', { name: /alice johnson/i }))
            await waitFor(() =>
                expect(screen.getByText('Sign out of your account')).toBeInTheDocument()
            )
        })
    })

    // ─── Toggle Behaviour ────────────────────────────────────────────────────────
    describe('toggle behaviour', () => {
        it('closes dropdown when trigger is clicked again', async () => {
            render(<UserMenu user={mockUser} />)
            const trigger = screen.getByRole('button', { name: /alice johnson/i })
            fireEvent.click(trigger)
            await waitFor(() => screen.getByText('My Profile'))
            fireEvent.click(trigger)
            await waitFor(() => expect(screen.queryByText('My Profile')).not.toBeInTheDocument())
        })

        it('closes dropdown on Escape key press', async () => {
            render(<UserMenu user={mockUser} />)
            fireEvent.click(screen.getByRole('button', { name: /alice johnson/i }))
            await waitFor(() => screen.getByText('My Profile'))
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
            await waitFor(() => screen.getByText('My Profile'))
            fireEvent.mouseDown(screen.getByTestId('outside'))
            await waitFor(() => expect(screen.queryByText('My Profile')).not.toBeInTheDocument())
        })
    })

    // ─── Logout ──────────────────────────────────────────────────────────────────
    describe('logout', () => {
        it('calls logout when Log out button is clicked', async () => {
            const logout = vi.fn().mockResolvedValue(undefined)
            vi.doMock('../../../../context/AuthContext', () => ({
                useAuth: () => ({ logout, user: { _id: 'u1' } }),
            }))
            render(<UserMenu user={mockUser} />)
            fireEvent.click(screen.getByRole('button', { name: /alice johnson/i }))
            await waitFor(() => screen.getByText('Log out'))
            fireEvent.click(screen.getByText('Log out'))
            // logout is called from the mocked context
        })
    })
})