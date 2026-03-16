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

// NavLink mock — controls isActive via current URL
vi.mock('react-router', () => ({
  NavLink: ({ to, children, onClick, className, end }) => {
    const isActive = to === '/main'  // treat /main as the active route for most tests
    return (
      <a
        href={to}
        onClick={onClick}
        className={typeof className === 'function' ? className({ isActive }) : className}
        data-testid="navlink"
        aria-current={isActive ? 'page' : undefined}
      >
        {typeof children === 'function' ? children({ isActive }) : children}
      </a>
    )
  },
}))

vi.mock('../../../../../features/main/components/utils/sidebarHelpers.js', () => ({
  getColorClasses: vi.fn((color, isActive) => ({
    bg: isActive ? `bg-${color}-500/15` : '',
    text: isActive ? `text-${color}-300` : '',
    glow: isActive ? `shadow-${color}-500/20` : '',
    border: isActive ? `border-${color}-500/30` : '',
    gradient: `from-${color}-400 to-${color}-500`,
    icon: isActive ? `text-${color}-300` : 'text-slate-400',
  })),
}))

import { render, screen, fireEvent } from '@testing-library/react'
import { NavItem } from '../../../../../features/main/components/sidebar/NavItem'

const activeItem = {
  path: '/main',
  icon: 'Activity',
  label: 'Activity',
  description: 'View your activity feed',
  color: 'sky',
  exact: true,
}

const inactiveItem = {
  path: '/main/settings',
  icon: 'BarChart3',
  label: 'Dashboard',
  description: 'Insights and analytics',
  color: 'violet',
  exact: false,
}

const unknownIconItem = {
  path: '/main/unknown',
  icon: 'UnknownIcon',
  label: 'Unknown',
  description: 'Fallback icon test',
  color: 'slate',
  exact: false,
}

describe('NavItem', () => {
  // ─── Rendering ────────────────────────────────────────────────────────────────
  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<NavItem item={activeItem} isExpanded={true} isMobile={false} />)
      expect(screen.getByTestId('navlink')).toBeInTheDocument()
    })

    it('renders label when isExpanded=true', () => {
      render(<NavItem item={activeItem} isExpanded={true} isMobile={false} />)
      expect(screen.getByText('Activity')).toBeInTheDocument()
    })

    it('renders label when isMobile=true', () => {
      render(<NavItem item={activeItem} isExpanded={false} isMobile={true} />)
      expect(screen.getByText('Activity')).toBeInTheDocument()
    })

    it('does not render label when isExpanded=false and isMobile=false', () => {
      render(<NavItem item={activeItem} isExpanded={false} isMobile={false} />)
      expect(screen.queryByText('Activity')).not.toBeInTheDocument()
    })

    it('renders the icon SVG', () => {
      const { container } = render(
        <NavItem item={activeItem} isExpanded={true} isMobile={false} />
      )
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('falls back to Cloud icon for unknown icon names', () => {
      const { container } = render(
        <NavItem item={unknownIconItem} isExpanded={true} isMobile={false} />
      )
      // Should still render an SVG (Cloud fallback)
      expect(container.querySelector('svg')).toBeInTheDocument()
    })
  })

  // ─── Active State ─────────────────────────────────────────────────────────────
  describe('active state (path=/main is treated as active)', () => {
    it('NavLink has aria-current="page" when active', () => {
      render(<NavItem item={activeItem} isExpanded={true} isMobile={false} />)
      expect(screen.getByTestId('navlink')).toHaveAttribute('aria-current', 'page')
    })

    it('renders description when active and isExpanded=true', () => {
      render(<NavItem item={activeItem} isExpanded={true} isMobile={false} />)
      expect(screen.getByText('View your activity feed')).toBeInTheDocument()
    })

    it('renders active indicator bar when active and isExpanded=true', () => {
      render(<NavItem item={activeItem} isExpanded={true} isMobile={false} />)
      // active indicator is a motion.div with absolute left-0 positioning
      const motionDivs = screen.getAllByTestId('motion-div')
      const activeBar = motionDivs.find(d => d.className?.includes('absolute') && d.className?.includes('left-0'))
      expect(activeBar).toBeInTheDocument()
    })

    it('renders active indicator bar when active and isMobile=true', () => {
      render(<NavItem item={activeItem} isExpanded={false} isMobile={true} />)
      const motionDivs = screen.getAllByTestId('motion-div')
      const activeBar = motionDivs.find(d => d.className?.includes('absolute') && d.className?.includes('left-0'))
      expect(activeBar).toBeInTheDocument()
    })

    it('does not render active indicator bar when collapsed and not mobile', () => {
      render(<NavItem item={activeItem} isExpanded={false} isMobile={false} />)
      const motionDivs = screen.getAllByTestId('motion-div')
      const activeBar = motionDivs.find(d => d.className?.includes('absolute') && d.className?.includes('left-0'))
      expect(activeBar).toBeUndefined()
    })
  })

  // ─── Inactive State ───────────────────────────────────────────────────────────
  describe('inactive state (path=/main/settings is treated as inactive)', () => {
    it('NavLink does not have aria-current when inactive', () => {
      render(<NavItem item={inactiveItem} isExpanded={true} isMobile={false} />)
      expect(screen.getByTestId('navlink')).not.toHaveAttribute('aria-current')
    })

    it('renders label for inactive item when expanded', () => {
      render(<NavItem item={inactiveItem} isExpanded={true} isMobile={false} />)
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('does not render description for inactive item', () => {
      render(<NavItem item={inactiveItem} isExpanded={true} isMobile={false} />)
      expect(screen.queryByText('Insights and analytics')).not.toBeInTheDocument()
    })
  })

  // ─── Layout Variants ──────────────────────────────────────────────────────────
  describe('layout variants', () => {
    it('motion div has w-full class when isExpanded=true', () => {
      render(<NavItem item={activeItem} isExpanded={true} isMobile={false} />)
      const outerMotionDiv = screen.getAllByTestId('motion-div')[0]
      expect(outerMotionDiv.className).toContain('w-full')
    })

    it('motion div has justify-center class when collapsed and not mobile', () => {
      render(<NavItem item={activeItem} isExpanded={false} isMobile={false} />)
      const outerMotionDiv = screen.getAllByTestId('motion-div')[0]
      expect(outerMotionDiv.className).toContain('justify-center')
    })

    it('icon container is h-8 w-8 when isExpanded=true', () => {
      const { container } = render(
        <NavItem item={activeItem} isExpanded={true} isMobile={false} />
      )
      const iconDiv = container.querySelector('.h-8.w-8')
      expect(iconDiv).toBeInTheDocument()
    })

    it('icon container is h-7 w-7 when collapsed', () => {
      const { container } = render(
        <NavItem item={activeItem} isExpanded={false} isMobile={false} />
      )
      const iconDiv = container.querySelector('.h-7.w-7')
      expect(iconDiv).toBeInTheDocument()
    })
  })

  // ─── Link Attributes ──────────────────────────────────────────────────────────
  describe('link attributes', () => {
    it('NavLink href matches item.path', () => {
      render(<NavItem item={inactiveItem} isExpanded={true} isMobile={false} />)
      expect(screen.getByTestId('navlink')).toHaveAttribute('href', '/main/settings')
    })

    it('renders as a block element', () => {
      render(<NavItem item={activeItem} isExpanded={true} isMobile={false} />)
      expect(screen.getByTestId('navlink')).toHaveClass('block')
    })
  })

  // ─── Interaction ──────────────────────────────────────────────────────────────
  describe('interaction', () => {
    it('calls onNavigate when NavLink is clicked', () => {
      const onNavigate = vi.fn()
      render(
        <NavItem
          item={activeItem}
          isExpanded={true}
          isMobile={false}
          onNavigate={onNavigate}
        />
      )
      fireEvent.click(screen.getByTestId('navlink'))
      expect(onNavigate).toHaveBeenCalledTimes(1)
    })

    it('does not crash when onNavigate is not provided', () => {
      expect(() =>
        render(<NavItem item={activeItem} isExpanded={true} isMobile={false} />)
      ).not.toThrow()
    })
  })

  // ─── All Icon Variants ────────────────────────────────────────────────────────
  describe('all icon variants render without crash', () => {
    const icons = ['Activity', 'BarChart3', 'Cloud', 'LifeBuoy', 'Newspaper', 'SquarePen']
    icons.forEach(iconName => {
      it(`renders correctly with icon="${iconName}"`, () => {
        const item = { ...activeItem, icon: iconName }
        const { container } = render(
          <NavItem item={item} isExpanded={true} isMobile={false} />
        )
        expect(container.querySelector('svg')).toBeInTheDocument()
      })
    })
  })
})