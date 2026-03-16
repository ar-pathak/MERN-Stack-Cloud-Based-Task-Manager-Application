import { vi, describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MobileMenuButton } from '../../../../../features/main/components/sidebar/MobileMenuButton'

// No framer-motion or router — pure UI component

describe('MobileMenuButton', () => {
  // ─── Rendering ────────────────────────────────────────────────────────────────
  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<MobileMenuButton onClick={vi.fn()} />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('renders a single button element', () => {
      render(<MobileMenuButton onClick={vi.fn()} />)
      expect(screen.getAllByRole('button').length).toBe(1)
    })

    it('renders the Menu icon inside the button', () => {
      const { container } = render(<MobileMenuButton onClick={vi.fn()} />)
      // lucide renders an svg
      expect(container.querySelector('svg')).toBeInTheDocument()
    })
  })

  // ─── Styling ──────────────────────────────────────────────────────────────────
  describe('styling', () => {
    it('button has lg:hidden class to hide on desktop', () => {
      render(<MobileMenuButton onClick={vi.fn()} />)
      expect(screen.getByRole('button')).toHaveClass('lg:hidden')
    })

    it('button is positioned fixed', () => {
      render(<MobileMenuButton onClick={vi.fn()} />)
      expect(screen.getByRole('button')).toHaveClass('fixed')
    })

    it('button has z-30 z-index', () => {
      render(<MobileMenuButton onClick={vi.fn()} />)
      expect(screen.getByRole('button')).toHaveClass('z-30')
    })

    it('button has rounded-xl class', () => {
      render(<MobileMenuButton onClick={vi.fn()} />)
      expect(screen.getByRole('button')).toHaveClass('rounded-xl')
    })

    it('button has backdrop-blur-xl class', () => {
      render(<MobileMenuButton onClick={vi.fn()} />)
      expect(screen.getByRole('button')).toHaveClass('backdrop-blur-xl')
    })
  })

  // ─── Interaction ──────────────────────────────────────────────────────────────
  describe('interaction', () => {
    it('calls onClick when button is clicked', () => {
      const onClick = vi.fn()
      render(<MobileMenuButton onClick={onClick} />)
      fireEvent.click(screen.getByRole('button'))
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('calls onClick each time it is clicked', () => {
      const onClick = vi.fn()
      render(<MobileMenuButton onClick={onClick} />)
      fireEvent.click(screen.getByRole('button'))
      fireEvent.click(screen.getByRole('button'))
      fireEvent.click(screen.getByRole('button'))
      expect(onClick).toHaveBeenCalledTimes(3)
    })

    it('does not crash when onClick is not provided', () => {
      // Should not throw even with undefined handler
      expect(() => render(<MobileMenuButton />)).not.toThrow()
    })
  })
})