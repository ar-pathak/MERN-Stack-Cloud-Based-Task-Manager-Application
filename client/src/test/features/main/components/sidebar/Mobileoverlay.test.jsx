import { vi, describe, it, expect } from 'vitest'

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get(_, tag) {
      return ({ children, initial, animate, exit, transition,
                whileHover, whileTap, onClick, className, ...rest }) =>
        <div
          data-testid={`motion-${tag}`}
          onClick={onClick}
          className={className}
          {...rest}
        >
          {children}
        </div>
    }
  }),
  AnimatePresence: ({ children }) => <>{children}</>,
}))

import { render, screen, fireEvent } from '@testing-library/react'
import { MobileOverlay } from '../../../../../features/main/components/sidebar/MobileOverlay'

describe('MobileOverlay', () => {
  // ─── Visibility ───────────────────────────────────────────────────────────────
  describe('visibility', () => {
    it('renders nothing when isOpen=false', () => {
      const { container } = render(
        <MobileOverlay isOpen={false} onClose={vi.fn()}>
          <div>Content</div>
        </MobileOverlay>
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders backdrop and aside when isOpen=true', () => {
      render(
        <MobileOverlay isOpen={true} onClose={vi.fn()}>
          <div>Content</div>
        </MobileOverlay>
      )
      expect(screen.getByTestId('motion-div')).toBeInTheDocument()
      expect(screen.getByTestId('motion-aside')).toBeInTheDocument()
    })

    it('renders children inside the aside when open', () => {
      render(
        <MobileOverlay isOpen={true} onClose={vi.fn()}>
          <div data-testid="sidebar-child">Sidebar Content</div>
        </MobileOverlay>
      )
      expect(screen.getByTestId('sidebar-child')).toBeInTheDocument()
    })

    it('does not render children when closed', () => {
      render(
        <MobileOverlay isOpen={false} onClose={vi.fn()}>
          <div data-testid="sidebar-child">Sidebar Content</div>
        </MobileOverlay>
      )
      expect(screen.queryByTestId('sidebar-child')).not.toBeInTheDocument()
    })
  })

  // ─── Backdrop Styling ─────────────────────────────────────────────────────────
  describe('backdrop styling', () => {
    it('backdrop has lg:hidden class', () => {
      render(
        <MobileOverlay isOpen={true} onClose={vi.fn()}>
          <span />
        </MobileOverlay>
      )
      const backdrop = screen.getByTestId('motion-div')
      expect(backdrop).toHaveClass('lg:hidden')
    })

    it('backdrop has fixed inset-0 positioning', () => {
      render(
        <MobileOverlay isOpen={true} onClose={vi.fn()}>
          <span />
        </MobileOverlay>
      )
      const backdrop = screen.getByTestId('motion-div')
      expect(backdrop).toHaveClass('fixed', 'inset-0')
    })

    it('backdrop has z-40 z-index', () => {
      render(
        <MobileOverlay isOpen={true} onClose={vi.fn()}>
          <span />
        </MobileOverlay>
      )
      expect(screen.getByTestId('motion-div')).toHaveClass('z-40')
    })

    it('backdrop has backdrop-blur-sm class', () => {
      render(
        <MobileOverlay isOpen={true} onClose={vi.fn()}>
          <span />
        </MobileOverlay>
      )
      expect(screen.getByTestId('motion-div')).toHaveClass('backdrop-blur-sm')
    })
  })

  // ─── Aside (Drawer) Styling ───────────────────────────────────────────────────
  describe('aside (drawer) styling', () => {
    it('aside has lg:hidden class', () => {
      render(
        <MobileOverlay isOpen={true} onClose={vi.fn()}>
          <span />
        </MobileOverlay>
      )
      expect(screen.getByTestId('motion-aside')).toHaveClass('lg:hidden')
    })

    it('aside is fixed positioned at left-0 top-0', () => {
      render(
        <MobileOverlay isOpen={true} onClose={vi.fn()}>
          <span />
        </MobileOverlay>
      )
      expect(screen.getByTestId('motion-aside')).toHaveClass('fixed', 'left-0', 'top-0')
    })

    it('aside has z-50 z-index (above backdrop)', () => {
      render(
        <MobileOverlay isOpen={true} onClose={vi.fn()}>
          <span />
        </MobileOverlay>
      )
      expect(screen.getByTestId('motion-aside')).toHaveClass('z-50')
    })

    it('aside has w-64 width', () => {
      render(
        <MobileOverlay isOpen={true} onClose={vi.fn()}>
          <span />
        </MobileOverlay>
      )
      expect(screen.getByTestId('motion-aside')).toHaveClass('w-64')
    })

    it('aside has h-full height', () => {
      render(
        <MobileOverlay isOpen={true} onClose={vi.fn()}>
          <span />
        </MobileOverlay>
      )
      expect(screen.getByTestId('motion-aside')).toHaveClass('h-full')
    })

    it('aside has shadow-2xl class', () => {
      render(
        <MobileOverlay isOpen={true} onClose={vi.fn()}>
          <span />
        </MobileOverlay>
      )
      expect(screen.getByTestId('motion-aside')).toHaveClass('shadow-2xl')
    })
  })

  // ─── Backdrop Click ───────────────────────────────────────────────────────────
  describe('backdrop click', () => {
    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn()
      render(
        <MobileOverlay isOpen={true} onClose={onClose}>
          <span />
        </MobileOverlay>
      )
      fireEvent.click(screen.getByTestId('motion-div'))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('does not call onClose when aside content is clicked', () => {
      const onClose = vi.fn()
      render(
        <MobileOverlay isOpen={true} onClose={onClose}>
          <div data-testid="inner">Inner</div>
        </MobileOverlay>
      )
      fireEvent.click(screen.getByTestId('inner'))
      expect(onClose).not.toHaveBeenCalled()
    })

    it('calls onClose multiple times on repeated backdrop clicks', () => {
      const onClose = vi.fn()
      render(
        <MobileOverlay isOpen={true} onClose={onClose}>
          <span />
        </MobileOverlay>
      )
      fireEvent.click(screen.getByTestId('motion-div'))
      fireEvent.click(screen.getByTestId('motion-div'))
      expect(onClose).toHaveBeenCalledTimes(2)
    })
  })

  // ─── Children ─────────────────────────────────────────────────────────────────
  describe('children rendering', () => {
    it('renders multiple children correctly', () => {
      render(
        <MobileOverlay isOpen={true} onClose={vi.fn()}>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </MobileOverlay>
      )
      expect(screen.getByTestId('child-1')).toBeInTheDocument()
      expect(screen.getByTestId('child-2')).toBeInTheDocument()
    })

    it('renders text children correctly', () => {
      render(
        <MobileOverlay isOpen={true} onClose={vi.fn()}>
          Hello Sidebar
        </MobileOverlay>
      )
      expect(screen.getByText('Hello Sidebar')).toBeInTheDocument()
    })
  })
})