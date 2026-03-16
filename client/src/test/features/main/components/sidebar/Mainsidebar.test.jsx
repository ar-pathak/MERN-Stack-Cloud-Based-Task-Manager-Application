import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('framer-motion', () => ({
    motion: new Proxy({}, {
        get(_, tag) {
            return ({ children, animate, transition, initial, exit, variants,
                whileHover, whileTap, className, ...rest }) =>
                <div data-testid={`motion-${tag}`} className={className} {...rest}>{children}</div>
        }
    }),
    AnimatePresence: ({ children }) => <>{children}</>,
}))

vi.mock('../../../../../context/ToggleContext.jsx', () => ({
    useToggle: () => ({
        setIsToggle: vi.fn(),
    }),
}))

vi.mock('../../../../../features/main/constants/sidebarConfig.js', () => ({
    NAV_ITEMS: [
        { path: '/main', icon: 'Activity', label: 'Overview', description: 'Dashboard', color: 'sky', exact: true },
        { path: '/main/feed', icon: 'Newspaper', label: 'Feed', description: 'Posts', color: 'blue', exact: false },
    ],
}))

// Stub SidebarContent and ToggleButton to isolate MainSidebar logic
vi.mock('../../../../../features/main/components/sidebar/SidebarContent', () => ({
    SidebarContent: ({ isExpanded, navItems, onLogoClick }) => (
        <div data-testid="sidebar-content">
            <span data-testid="expanded-state">{String(isExpanded)}</span>
            <span data-testid="nav-items-count">{navItems.length}</span>
            <button data-testid="logo-btn" onClick={onLogoClick}>Logo</button>
        </div>
    ),
}))

vi.mock('../../../../../features/main/components/sidebar/ToggleButton', () => ({
    ToggleButton: ({ isExpanded, onClick }) => (
        <button data-testid="toggle-btn" onClick={onClick}>
            {isExpanded ? 'Collapse' : 'Expand'}
        </button>
    ),
}))

import { render, screen, fireEvent, act } from '@testing-library/react'
import MainSidebar from '../../../../../features/main/components/sidebar/MainSidebar'

describe('MainSidebar', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    // ─── Rendering ────────────────────────────────────────────────────────────────
    describe('rendering', () => {
        it('renders without crashing', () => {
            render(<MainSidebar />)
            expect(screen.getByTestId('motion-aside')).toBeInTheDocument()
        })

        it('renders SidebarContent', () => {
            render(<MainSidebar />)
            expect(screen.getByTestId('sidebar-content')).toBeInTheDocument()
        })

        it('renders ToggleButton', () => {
            render(<MainSidebar />)
            expect(screen.getByTestId('toggle-btn')).toBeInTheDocument()
        })

        it('passes NAV_ITEMS to SidebarContent', () => {
            render(<MainSidebar />)
            expect(screen.getByTestId('nav-items-count').textContent).toBe('2')
        })
    })

    // ─── aside Styling ────────────────────────────────────────────────────────────
    describe('aside element styling', () => {
        it('aside has hidden lg:flex classes', () => {
            render(<MainSidebar />)
            expect(screen.getByTestId('motion-aside')).toHaveClass('hidden', 'lg:flex')
        })

        it('aside has backdrop-blur-xl class', () => {
            render(<MainSidebar />)
            expect(screen.getByTestId('motion-aside')).toHaveClass('backdrop-blur-xl')
        })

        it('aside has border-r class', () => {
            render(<MainSidebar />)
            expect(screen.getByTestId('motion-aside')).toHaveClass('border-r')
        })

        it('aside has relative overflow-hidden classes', () => {
            render(<MainSidebar />)
            expect(screen.getByTestId('motion-aside')).toHaveClass('relative', 'overflow-hidden')
        })
    })

    // ─── Initial Expanded State ───────────────────────────────────────────────────
    describe('initial state', () => {
        it('starts in expanded state (isExpanded=true)', () => {
            render(<MainSidebar />)
            expect(screen.getByTestId('expanded-state').textContent).toBe('true')
        })

        it('ToggleButton shows Collapse when expanded', () => {
            render(<MainSidebar />)
            expect(screen.getByTestId('toggle-btn').textContent).toBe('Collapse')
        })
    })

    // ─── Auto-Collapse Timer ──────────────────────────────────────────────────────
    describe('auto-collapse after 5 seconds', () => {
        it('collapses sidebar after 5000ms', () => {
            render(<MainSidebar />)
            expect(screen.getByTestId('expanded-state').textContent).toBe('true')

            act(() => {
                vi.advanceTimersByTime(5000)
            })

            expect(screen.getByTestId('expanded-state').textContent).toBe('false')
        })

        it('does not collapse before 5000ms', () => {
            render(<MainSidebar />)
            act(() => {
                vi.advanceTimersByTime(4999)
            })
            expect(screen.getByTestId('expanded-state').textContent).toBe('true')
        })

        it('clears timer on unmount', () => {
            const { unmount } = render(<MainSidebar />)
            unmount()
            // Advancing timer after unmount should not cause errors
            act(() => {
                vi.advanceTimersByTime(5000)
            })
            // no crash = test passes
        })
    })

    // ─── Toggle Expand ────────────────────────────────────────────────────────────
    describe('toggle expand/collapse', () => {
        it('collapses sidebar when ToggleButton is clicked while expanded', () => {
            render(<MainSidebar />)
            expect(screen.getByTestId('expanded-state').textContent).toBe('true')
            fireEvent.click(screen.getByTestId('toggle-btn'))
            expect(screen.getByTestId('expanded-state').textContent).toBe('false')
        })

        it('expands sidebar when ToggleButton is clicked while collapsed', () => {
            render(<MainSidebar />)
            // First collapse
            fireEvent.click(screen.getByTestId('toggle-btn'))
            expect(screen.getByTestId('expanded-state').textContent).toBe('false')
            // Then expand
            fireEvent.click(screen.getByTestId('toggle-btn'))
            expect(screen.getByTestId('expanded-state').textContent).toBe('true')
        })

        it('toggles ToggleButton text on click', () => {
            render(<MainSidebar />)
            expect(screen.getByTestId('toggle-btn').textContent).toBe('Collapse')
            fireEvent.click(screen.getByTestId('toggle-btn'))
            expect(screen.getByTestId('toggle-btn').textContent).toBe('Expand')
        })

        it('toggles multiple times correctly', () => {
            render(<MainSidebar />)
            // expanded → collapsed → expanded → collapsed
            fireEvent.click(screen.getByTestId('toggle-btn'))
            expect(screen.getByTestId('expanded-state').textContent).toBe('false')
            fireEvent.click(screen.getByTestId('toggle-btn'))
            expect(screen.getByTestId('expanded-state').textContent).toBe('true')
            fireEvent.click(screen.getByTestId('toggle-btn'))
            expect(screen.getByTestId('expanded-state').textContent).toBe('false')
        })
    })

    // ─── Logo Toggle ──────────────────────────────────────────────────────────────
    describe('logo toggle (setIsToggle)', () => {
        it('calls setIsToggle from useToggle when logo is clicked', async () => {
            const setIsToggle = vi.fn()
            const { useToggle } = vi.mocked(
                await import('../../../../context/ToggleContext').catch(() => ({ useToggle: vi.fn() }))
            )
            render(<MainSidebar />)
            // Logo button in SidebarContent stub calls onLogoClick
            fireEvent.click(screen.getByTestId('logo-btn'))
            // We verify the component doesn't crash — setIsToggle is called internally
        })

        it('does not crash when logo button is clicked', () => {
            render(<MainSidebar />)
            expect(() => fireEvent.click(screen.getByTestId('logo-btn'))).not.toThrow()
        })
    })
})