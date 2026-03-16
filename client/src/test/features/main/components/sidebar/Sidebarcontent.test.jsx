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
    const isActive = false
    return (
      <a href={to} onClick={onClick} data-testid={`navlink-${to}`}>
        {typeof children === 'function' ? children({ isActive }) : children}
      </a>
    )
  },
}))

vi.mock('../../../../../features/main/components/utils/sidebarHelpers.js', () => ({
  getColorClasses: vi.fn(() => ({
    bg: '', text: '', glow: '', border: '', gradient: '', icon: 'text-slate-400',
  })),
}))

vi.mock('../../../../../context/ToggleContext', () => ({
  useToggle: () => vi.fn(),
}))

// Stub sub-components to isolate SidebarContent behaviour
vi.mock('../../../../../features/main/components/sidebar/SidebarLogo', () => ({
  SidebarLogo: ({ isExpanded, isMobile, onClick }) => (
    <div data-testid="sidebar-logo" onClick={onClick}>
      {(isExpanded || isMobile) && <span>Aurora Workspace</span>}
    </div>
  ),
}))

vi.mock('../../../../../features/main/components/sidebar/SidebarNav', () => ({
  SidebarNav: ({ navItems, isExpanded, isMobile, onNavigate }) => (
    <nav data-testid="sidebar-nav">
      {navItems.map(item => (
        <button key={item.path} onClick={onNavigate}>{item.label}</button>
      ))}
    </nav>
  ),
}))

vi.mock('../../../../../features/main/components/sidebar/SidebarFooter', () => ({
  SidebarFooter: ({ isExpanded, isMobile }) => (
    <div data-testid="sidebar-footer">
      {(isExpanded || isMobile) ? <span>System Status</span> : <span>Compact</span>}
    </div>
  ),
}))

import { render, screen, fireEvent } from '@testing-library/react'
import { SidebarContent } from '../../../../../features/main/components/sidebar/SidebarContent'

const mockNavItems = [
  { path: '/main', icon: 'Activity', label: 'Overview', description: '', color: 'sky', exact: true },
  { path: '/main/feed', icon: 'Newspaper', label: 'Feed', description: '', color: 'blue', exact: false },
]

const defaultProps = {
  isMobile: false,
  isExpanded: true,
  navItems: mockNavItems,
  onLogoClick: vi.fn(),
  onNavigate: vi.fn(),
  onClose: vi.fn(),
}

describe('SidebarContent', () => {
  // ─── Rendering ────────────────────────────────────────────────────────────────
  describe('rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<SidebarContent {...defaultProps} />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders SidebarLogo', () => {
      render(<SidebarContent {...defaultProps} />)
      expect(screen.getByTestId('sidebar-logo')).toBeInTheDocument()
    })

    it('renders SidebarNav', () => {
      render(<SidebarContent {...defaultProps} />)
      expect(screen.getByTestId('sidebar-nav')).toBeInTheDocument()
    })

    it('renders SidebarFooter', () => {
      render(<SidebarContent {...defaultProps} />)
      expect(screen.getByTestId('sidebar-footer')).toBeInTheDocument()
    })

    it('passes navItems to SidebarNav', () => {
      render(<SidebarContent {...defaultProps} />)
      expect(screen.getByText('Overview')).toBeInTheDocument()
      expect(screen.getByText('Feed')).toBeInTheDocument()
    })
  })

  // ─── Close Button (mobile only) ────────────────────────────────────────────────
  describe('close button (isMobile)', () => {
    it('renders close button when isMobile=true', () => {
      render(<SidebarContent {...defaultProps} isMobile={true} />)
      // the X close button
      const closeBtn = screen.getByRole('button', { name: '' })
      expect(closeBtn).toBeInTheDocument()
    })

    it('does not render close button when isMobile=false', () => {
      const { container } = render(<SidebarContent {...defaultProps} isMobile={false} />)
      // ml-auto button only exists in mobile mode
      const closeBtn = container.querySelector('button.ml-auto')
      expect(closeBtn).not.toBeInTheDocument()
    })

    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn()
      render(<SidebarContent {...defaultProps} isMobile={true} onClose={onClose} />)
      const closeBtn = screen.getByRole('button', { name: '' })
      fireEvent.click(closeBtn)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('renders X icon inside close button', () => {
      const { container } = render(<SidebarContent {...defaultProps} isMobile={true} />)
      // The X from lucide renders an svg
      const btns = container.querySelectorAll('button')
      const closeBtnWithIcon = [...btns].find(b => b.querySelector('svg'))
      expect(closeBtnWithIcon).toBeInTheDocument()
    })
  })

  // ─── Header Styling ────────────────────────────────────────────────────────────
  describe('header area styling', () => {
    it('applies px-5 py-4 when isExpanded=true', () => {
      const { container } = render(<SidebarContent {...defaultProps} isExpanded={true} />)
      const headerDiv = container.querySelector('.border-b')
      expect(headerDiv.className).toContain('px-5')
      expect(headerDiv.className).toContain('py-4')
    })

    it('applies px-3 py-4 justify-center when isExpanded=false and isMobile=false', () => {
      const { container } = render(
        <SidebarContent {...defaultProps} isExpanded={false} isMobile={false} />
      )
      const headerDiv = container.querySelector('.border-b')
      expect(headerDiv.className).toContain('px-3')
      expect(headerDiv.className).toContain('justify-center')
    })

    it('applies px-5 py-4 when isMobile=true (even if isExpanded=false)', () => {
      const { container } = render(
        <SidebarContent {...defaultProps} isExpanded={false} isMobile={true} />
      )
      const headerDiv = container.querySelector('.border-b')
      expect(headerDiv.className).toContain('px-5')
    })

    it('header has border-b class', () => {
      const { container } = render(<SidebarContent {...defaultProps} />)
      expect(container.querySelector('.border-b')).toBeInTheDocument()
    })
  })

  // ─── Logo Interaction ─────────────────────────────────────────────────────────
  describe('logo click', () => {
    it('calls onLogoClick when SidebarLogo is clicked', () => {
      const onLogoClick = vi.fn()
      render(<SidebarContent {...defaultProps} onLogoClick={onLogoClick} />)
      fireEvent.click(screen.getByTestId('sidebar-logo'))
      expect(onLogoClick).toHaveBeenCalledTimes(1)
    })
  })

  // ─── Full height layout ───────────────────────────────────────────────────────
  describe('layout', () => {
    it('outer wrapper has h-full flex flex-col', () => {
      const { container } = render(<SidebarContent {...defaultProps} />)
      expect(container.firstChild).toHaveClass('h-full', 'flex', 'flex-col')
    })
  })
})