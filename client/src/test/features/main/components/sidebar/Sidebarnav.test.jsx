import { vi, describe, it, expect } from 'vitest'

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get(_, tag) {
      return ({ children, animate, transition, initial, exit, variants,
                whileHover, whileTap, layoutId, className, ...rest }) =>
        <div data-testid={`motion-${tag}`} className={className} {...rest}>{children}</div>
    }
  }),
  AnimatePresence: ({ children }) => <>{children}</>,
}))

vi.mock('react-router', () => ({
  NavLink: ({ to, children, onClick, className }) => {
    const isActive = to === '/main'
    return (
      <a
        href={to}
        onClick={onClick}
        className={typeof className === 'function' ? className({ isActive }) : className}
        data-testid={`navlink-${to.replace(/\//g, '-')}`}
      >
        {typeof children === 'function' ? children({ isActive }) : children}
      </a>
    )
  },
}))

vi.mock('../../../../../features/main/components/utils/sidebarHelpers.js', () => ({
  getColorClasses: vi.fn(() => ({
    bg: 'bg-sky-500/15',
    text: 'text-sky-300',
    glow: '',
    border: '',
    gradient: 'from-sky-400 to-sky-500',
    icon: 'text-sky-300',
  })),
}))

import { render, screen } from '@testing-library/react'
import { SidebarNav } from '../../../../../features/main/components/sidebar/SidebarNav'

const mockNavItems = [
  { path: '/main', icon: 'Activity', label: 'Overview', description: 'Main overview', color: 'sky', exact: true },
  { path: '/main/feed', icon: 'Newspaper', label: 'Feed', description: 'Activity feed', color: 'blue', exact: false },
  { path: '/main/dashboard', icon: 'BarChart3', label: 'Dashboard', description: 'Analytics', color: 'violet', exact: false },
]

describe('SidebarNav', () => {
  // ─── Rendering ────────────────────────────────────────────────────────────────
  describe('rendering', () => {
    it('renders a nav element with role="navigation"', () => {
      render(
        <SidebarNav
          navItems={mockNavItems}
          isExpanded={true}
          isMobile={false}
          onNavigate={vi.fn()}
        />
      )
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('renders all nav items', () => {
      render(
        <SidebarNav
          navItems={mockNavItems}
          isExpanded={true}
          isMobile={false}
          onNavigate={vi.fn()}
        />
      )
      expect(screen.getByText('Overview')).toBeInTheDocument()
      expect(screen.getByText('Feed')).toBeInTheDocument()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('renders correct number of nav links', () => {
      render(
        <SidebarNav
          navItems={mockNavItems}
          isExpanded={true}
          isMobile={false}
          onNavigate={vi.fn()}
        />
      )
      expect(screen.getAllByRole('link').length).toBe(3)
    })

    it('renders empty nav without crashing when navItems is empty', () => {
      render(
        <SidebarNav
          navItems={[]}
          isExpanded={true}
          isMobile={false}
          onNavigate={vi.fn()}
        />
      )
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('renders single nav item correctly', () => {
      render(
        <SidebarNav
          navItems={[mockNavItems[0]]}
          isExpanded={true}
          isMobile={false}
          onNavigate={vi.fn()}
        />
      )
      expect(screen.getByText('Overview')).toBeInTheDocument()
      expect(screen.queryByText('Feed')).not.toBeInTheDocument()
    })
  })

  // ─── Styling ──────────────────────────────────────────────────────────────────
  describe('styling based on state', () => {
    it('applies px-3 when isExpanded=true', () => {
      render(
        <SidebarNav
          navItems={mockNavItems}
          isExpanded={true}
          isMobile={false}
          onNavigate={vi.fn()}
        />
      )
      expect(screen.getByRole('navigation').className).toContain('px-3')
    })

    it('applies px-2 when isExpanded=false and isMobile=false', () => {
      render(
        <SidebarNav
          navItems={mockNavItems}
          isExpanded={false}
          isMobile={false}
          onNavigate={vi.fn()}
        />
      )
      expect(screen.getByRole('navigation').className).toContain('px-2')
    })

    it('applies px-3 when isMobile=true', () => {
      render(
        <SidebarNav
          navItems={mockNavItems}
          isExpanded={false}
          isMobile={true}
          onNavigate={vi.fn()}
        />
      )
      expect(screen.getByRole('navigation').className).toContain('px-3')
    })

    it('has flex-1 class to fill available space', () => {
      render(
        <SidebarNav
          navItems={mockNavItems}
          isExpanded={true}
          isMobile={false}
          onNavigate={vi.fn()}
        />
      )
      expect(screen.getByRole('navigation')).toHaveClass('flex-1')
    })

    it('has overflow-y-auto for scrollability', () => {
      render(
        <SidebarNav
          navItems={mockNavItems}
          isExpanded={true}
          isMobile={false}
          onNavigate={vi.fn()}
        />
      )
      expect(screen.getByRole('navigation')).toHaveClass('overflow-y-auto')
    })

    it('has py-4 padding top', () => {
      render(
        <SidebarNav
          navItems={mockNavItems}
          isExpanded={true}
          isMobile={false}
          onNavigate={vi.fn()}
        />
      )
      expect(screen.getByRole('navigation')).toHaveClass('py-4')
    })
  })

  // ─── Props Forwarding ─────────────────────────────────────────────────────────
  describe('props forwarding to NavItem', () => {
    it('passes isExpanded=true to each NavItem (labels visible)', () => {
      render(
        <SidebarNav
          navItems={mockNavItems}
          isExpanded={true}
          isMobile={false}
          onNavigate={vi.fn()}
        />
      )
      // when expanded, labels are shown
      expect(screen.getByText('Overview')).toBeInTheDocument()
      expect(screen.getByText('Feed')).toBeInTheDocument()
    })

    it('passes isExpanded=false to each NavItem (labels hidden in collapsed mode)', () => {
      render(
        <SidebarNav
          navItems={mockNavItems}
          isExpanded={false}
          isMobile={false}
          onNavigate={vi.fn()}
        />
      )
      // labels are hidden when collapsed and not mobile
      expect(screen.queryByText('Overview')).not.toBeInTheDocument()
    })

    it('passes isMobile=true to each NavItem (labels visible even when collapsed)', () => {
      render(
        <SidebarNav
          navItems={mockNavItems}
          isExpanded={false}
          isMobile={true}
          onNavigate={vi.fn()}
        />
      )
      expect(screen.getByText('Overview')).toBeInTheDocument()
    })
  })
})