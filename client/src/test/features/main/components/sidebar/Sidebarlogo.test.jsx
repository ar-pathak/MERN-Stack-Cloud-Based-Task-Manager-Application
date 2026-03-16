import { vi, describe, it, expect } from 'vitest'

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

import { render, screen, fireEvent } from '@testing-library/react'
import { SidebarLogo } from '../../../../../features/main/components/sidebar/SidebarLogo'

describe('SidebarLogo', () => {
  // ─── Rendering ────────────────────────────────────────────────────────────────
  describe('rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(
        <SidebarLogo isExpanded={true} isMobile={false} onClick={vi.fn()} />
      )
      expect(container.firstChild).toBeInTheDocument()
    })

    it('always renders the Sparkles icon', () => {
      const { container } = render(
        <SidebarLogo isExpanded={true} isMobile={false} onClick={vi.fn()} />
      )
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('renders the animated glow div behind the icon', () => {
      render(<SidebarLogo isExpanded={true} isMobile={false} onClick={vi.fn()} />)
      const motionDivs = screen.getAllByTestId('motion-div')
      expect(motionDivs.length).toBeGreaterThan(0)
    })
  })

  // ─── Label Visibility (isExpanded or isMobile) ────────────────────────────────
  describe('label visibility', () => {
    it('renders "Aurora Workspace" label when isExpanded=true', () => {
      render(<SidebarLogo isExpanded={true} isMobile={false} onClick={vi.fn()} />)
      expect(screen.getByText('Aurora Workspace')).toBeInTheDocument()
    })

    it('renders "Aurora Workspace" label when isMobile=true', () => {
      render(<SidebarLogo isExpanded={false} isMobile={true} onClick={vi.fn()} />)
      expect(screen.getByText('Aurora Workspace')).toBeInTheDocument()
    })

    it('does not render "Aurora Workspace" label when isExpanded=false and isMobile=false', () => {
      render(<SidebarLogo isExpanded={false} isMobile={false} onClick={vi.fn()} />)
      expect(screen.queryByText('Aurora Workspace')).not.toBeInTheDocument()
    })

    it('renders label when both isExpanded=true and isMobile=true', () => {
      render(<SidebarLogo isExpanded={true} isMobile={true} onClick={vi.fn()} />)
      expect(screen.getByText('Aurora Workspace')).toBeInTheDocument()
    })
  })

  // ─── Styling (isExpanded / collapsed) ─────────────────────────────────────────
  describe('styling based on state', () => {
    it('applies px-5 py-4 classes when isExpanded=true', () => {
      const { container } = render(
        <SidebarLogo isExpanded={true} isMobile={false} onClick={vi.fn()} />
      )
      expect(container.firstChild.className).toContain('px-5')
      expect(container.firstChild.className).toContain('py-4')
    })

    it('applies px-3 py-4 justify-center classes when collapsed and not mobile', () => {
      const { container } = render(
        <SidebarLogo isExpanded={false} isMobile={false} onClick={vi.fn()} />
      )
      expect(container.firstChild.className).toContain('px-3')
      expect(container.firstChild.className).toContain('justify-center')
    })

    it('has cursor-pointer class', () => {
      const { container } = render(
        <SidebarLogo isExpanded={true} isMobile={false} onClick={vi.fn()} />
      )
      expect(container.firstChild).toHaveClass('cursor-pointer')
    })

    it('has border-b class on the wrapper', () => {
      const { container } = render(
        <SidebarLogo isExpanded={true} isMobile={false} onClick={vi.fn()} />
      )
      expect(container.firstChild.className).toContain('border-b')
    })

    it('icon container has rounded-2xl class', () => {
      const { container } = render(
        <SidebarLogo isExpanded={true} isMobile={false} onClick={vi.fn()} />
      )
      const iconBox = container.querySelector('.rounded-2xl')
      expect(iconBox).toBeInTheDocument()
    })
  })

  // ─── Interaction ──────────────────────────────────────────────────────────────
  describe('interaction', () => {
    it('calls onClick when the logo wrapper is clicked', () => {
      const onClick = vi.fn()
      const { container } = render(
        <SidebarLogo isExpanded={true} isMobile={false} onClick={onClick} />
      )
      fireEvent.click(container.firstChild)
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('calls onClick multiple times on repeated clicks', () => {
      const onClick = vi.fn()
      const { container } = render(
        <SidebarLogo isExpanded={true} isMobile={false} onClick={onClick} />
      )
      fireEvent.click(container.firstChild)
      fireEvent.click(container.firstChild)
      expect(onClick).toHaveBeenCalledTimes(2)
    })

    it('does not crash when onClick is not provided', () => {
      expect(() =>
        render(<SidebarLogo isExpanded={true} isMobile={false} />)
      ).not.toThrow()
    })
  })

  // ─── Rerender ─────────────────────────────────────────────────────────────────
  describe('rerender behaviour', () => {
    it('shows label after rerender from collapsed to expanded', () => {
      const { rerender } = render(
        <SidebarLogo isExpanded={false} isMobile={false} onClick={vi.fn()} />
      )
      expect(screen.queryByText('Aurora Workspace')).not.toBeInTheDocument()
      rerender(<SidebarLogo isExpanded={true} isMobile={false} onClick={vi.fn()} />)
      expect(screen.getByText('Aurora Workspace')).toBeInTheDocument()
    })

    it('hides label after rerender from expanded to collapsed', () => {
      const { rerender } = render(
        <SidebarLogo isExpanded={true} isMobile={false} onClick={vi.fn()} />
      )
      expect(screen.getByText('Aurora Workspace')).toBeInTheDocument()
      rerender(<SidebarLogo isExpanded={false} isMobile={false} onClick={vi.fn()} />)
      expect(screen.queryByText('Aurora Workspace')).not.toBeInTheDocument()
    })
  })
})