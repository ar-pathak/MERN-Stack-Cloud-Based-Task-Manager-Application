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

vi.mock('../../../../../context/ToggleContext', () => ({
  useToggle: () => vi.fn(),
}))

import { render, screen } from '@testing-library/react'
import { SidebarFooter } from '../../../../../features/main/components/sidebar/SidebarFooter'

describe('SidebarFooter', () => {
  // ─── Expanded / Mobile View ───────────────────────────────────────────────────
  describe('expanded / mobile view', () => {
    it('renders "System Status" label when isExpanded=true', () => {
      render(<SidebarFooter isExpanded={true} isMobile={false} />)
      expect(screen.getByText('System Status')).toBeInTheDocument()
    })

    it('renders "Active" status badge when isExpanded=true', () => {
      render(<SidebarFooter isExpanded={true} isMobile={false} />)
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('renders "System Status" label when isMobile=true', () => {
      render(<SidebarFooter isExpanded={false} isMobile={true} />)
      expect(screen.getByText('System Status')).toBeInTheDocument()
    })

    it('renders "Active" badge when isMobile=true', () => {
      render(<SidebarFooter isExpanded={false} isMobile={true} />)
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('renders Zap icon when expanded', () => {
      const { container } = render(<SidebarFooter isExpanded={true} isMobile={false} />)
      expect(container.querySelectorAll('svg').length).toBeGreaterThan(0)
    })

    it('"Active" text has emerald color class', () => {
      render(<SidebarFooter isExpanded={true} isMobile={false} />)
      expect(screen.getByText('Active')).toHaveClass('text-emerald-400')
    })

    it('status container has emerald background', () => {
      const { container } = render(<SidebarFooter isExpanded={true} isMobile={false} />)
      const statusCard = container.querySelector('.bg-emerald-500\\/10')
      expect(statusCard).toBeInTheDocument()
    })
  })

  // ─── Collapsed View ───────────────────────────────────────────────────────────
  describe('collapsed view (isExpanded=false and isMobile=false)', () => {
    it('renders the compact Zap icon button', () => {
      const { container } = render(<SidebarFooter isExpanded={false} isMobile={false} />)
      const zapIcon = container.querySelector('.bg-emerald-500\\/10')
      expect(zapIcon).toBeInTheDocument()
    })

    it('does not render "System Status" text', () => {
      render(<SidebarFooter isExpanded={false} isMobile={false} />)
      expect(screen.queryByText('System Status')).not.toBeInTheDocument()
    })

    it('does not render "Active" badge', () => {
      render(<SidebarFooter isExpanded={false} isMobile={false} />)
      expect(screen.queryByText('Active')).not.toBeInTheDocument()
    })

    it('renders tooltip with "System Active" text', () => {
      render(<SidebarFooter isExpanded={false} isMobile={false} />)
      expect(screen.getByText('System Active')).toBeInTheDocument()
    })

    it('renders tooltip with "All systems operational" text', () => {
      render(<SidebarFooter isExpanded={false} isMobile={false} />)
      expect(screen.getByText('All systems operational')).toBeInTheDocument()
    })

    it('tooltip has emerald text for System Active', () => {
      render(<SidebarFooter isExpanded={false} isMobile={false} />)
      expect(screen.getByText('System Active')).toHaveClass('text-emerald-400')
    })
  })

  // ─── Layout / Wrapper ─────────────────────────────────────────────────────────
  describe('layout', () => {
    it('wrapper has mt-auto class to push to bottom', () => {
      const { container } = render(<SidebarFooter isExpanded={true} isMobile={false} />)
      expect(container.firstChild).toHaveClass('mt-auto')
    })

    it('wrapper has border-t class', () => {
      const { container } = render(<SidebarFooter isExpanded={true} isMobile={false} />)
      expect(container.firstChild.className).toContain('border-t')
    })

    it('applies px-4 when isExpanded=true', () => {
      const { container } = render(<SidebarFooter isExpanded={true} isMobile={false} />)
      expect(container.firstChild.className).toContain('px-4')
    })

    it('applies px-2 when collapsed and not mobile', () => {
      const { container } = render(<SidebarFooter isExpanded={false} isMobile={false} />)
      expect(container.firstChild.className).toContain('px-2')
    })

    it('applies px-4 when isMobile=true', () => {
      const { container } = render(<SidebarFooter isExpanded={false} isMobile={true} />)
      expect(container.firstChild.className).toContain('px-4')
    })
  })

  // ─── Rerender ─────────────────────────────────────────────────────────────────
  describe('rerender behaviour', () => {
    it('switches from expanded to collapsed view on rerender', () => {
      const { rerender } = render(<SidebarFooter isExpanded={true} isMobile={false} />)
      expect(screen.getByText('System Status')).toBeInTheDocument()

      rerender(<SidebarFooter isExpanded={false} isMobile={false} />)
      expect(screen.queryByText('System Status')).not.toBeInTheDocument()
      expect(screen.getByText('System Active')).toBeInTheDocument()
    })

    it('switches from collapsed to expanded view on rerender', () => {
      const { rerender } = render(<SidebarFooter isExpanded={false} isMobile={false} />)
      expect(screen.queryByText('System Status')).not.toBeInTheDocument()

      rerender(<SidebarFooter isExpanded={true} isMobile={false} />)
      expect(screen.getByText('System Status')).toBeInTheDocument()
    })
  })
})