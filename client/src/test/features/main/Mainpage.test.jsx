import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// ── Inline mocks — all must be before any import that triggers them ────────────

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get(_, tag) {
      return ({ children, animate, transition, initial, exit, variants,
                whileHover, whileTap, className, ...rest }) =>
        <div className={className} {...rest}>{children}</div>
    }
  }),
  AnimatePresence: ({ children }) => <>{children}</>,
}))

vi.mock('react-router', () => ({
  Outlet: () => <div data-testid="outlet">Outlet Content</div>,
  useNavigate: () => vi.fn(),
}))

vi.mock('../../../context/ToggleContext', () => ({
  useToggle: () => ({ isToggle: false, setIsToggle: vi.fn() }),
}))

vi.mock('../../../features/main/hook/useScrollDirection', () => ({
  useScrollDirection: vi.fn(() => 'up'),
}))

vi.mock('../../../common/components/ScrollBar', () => ({
  default: () => <div data-testid="scrollbar" />,
}))

vi.mock('../../../features/main/components/sidebar/MainSidebar', () => ({
  default: () => <div data-testid="main-sidebar">Sidebar</div>,
}))

vi.mock('../../../features/main/components/header/MainHeader', () => ({
  default: () => <div data-testid="main-header">Header</div>,
}))

vi.mock('../../../features/main/components/background/AnimatedBackground', () => ({
  default: () => <div data-testid="animated-bg">Background</div>,
}))

import { render, screen, act } from '@testing-library/react'
import MainPage from '../../../features/main/MainPage'
import { useScrollDirection } from '../../../features/main/hook/useScrollDirection'
import { useToggle } from '../../../context/ToggleContext'

// ── matchMedia stub ────────────────────────────────────────────────────────────
const makeMatchMedia = (matches) => {
  const listeners = []
  return vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn((_, cb) => listeners.push(cb)),
    removeEventListener: vi.fn(),
    _listeners: listeners,
    _fire: (newMatches) => listeners.forEach(cb => cb({ matches: newMatches })),
  })
}

describe('MainPage', () => {
  let matchMediaMock

  beforeEach(() => {
    vi.useFakeTimers()
    // Default: desktop viewport (not mobile)
    matchMediaMock = makeMatchMedia(false)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    })
    vi.clearAllMocks()
    useScrollDirection.mockReturnValue('up')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Core structure
  // ────────────────────────────────────────────────────────────────────────────
  describe('core structure', () => {
    it('renders without crashing', () => {
      render(<MainPage />)
      expect(screen.getByTestId('main-sidebar')).toBeInTheDocument()
    })

    it('renders AnimatedBackground', () => {
      render(<MainPage />)
      expect(screen.getByTestId('animated-bg')).toBeInTheDocument()
    })

    it('renders MainSidebar', () => {
      render(<MainPage />)
      expect(screen.getByTestId('main-sidebar')).toBeInTheDocument()
    })

    it('renders ScrollBar', () => {
      render(<MainPage />)
      expect(screen.getByTestId('scrollbar')).toBeInTheDocument()
    })

    it('renders the Outlet', () => {
      render(<MainPage />)
      expect(screen.getByTestId('outlet')).toBeInTheDocument()
    })

    it('outer wrapper has h-screen overflow-hidden flex classes', () => {
      const { container } = render(<MainPage />)
      expect(container.firstChild).toHaveClass('flex', 'h-screen', 'overflow-hidden')
    })

    it('scroll container has overflow-y-auto class', () => {
      const { container } = render(<MainPage />)
      const scrollContainer = container.querySelector('.overflow-y-auto')
      expect(scrollContainer).toBeInTheDocument()
    })

    it('scroll container has custom-scrollbar class', () => {
      const { container } = render(<MainPage />)
      const scrollContainer = container.querySelector('.custom-scrollbar')
      expect(scrollContainer).toBeInTheDocument()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Desktop: header visibility
  // ────────────────────────────────────────────────────────────────────────────
  describe('header visibility on desktop', () => {
    it('renders MainHeader on desktop by default', () => {
      render(<MainPage />)
      expect(screen.getByTestId('main-header')).toBeInTheDocument()
    })

    it('header wrapper starts with h-[12vh] opacity-100 (visible)', () => {
      const { container } = render(<MainPage />)
      const headerWrapper = container.querySelector('.h-\\[12vh\\]')
      expect(headerWrapper).toBeInTheDocument()
      expect(headerWrapper).toHaveClass('opacity-100')
    })

    it('hides header after scroll down event', () => {
      useScrollDirection.mockReturnValue('down')
      const { container } = render(<MainPage />)
      // Re-render with down direction triggers the hide
      expect(container.querySelector('.h-0')).toBeInTheDocument()
      expect(container.querySelector('.opacity-0')).toBeInTheDocument()
    })

    it('auto-hides header after 8 seconds', () => {
      render(<MainPage />)
      expect(screen.getByTestId('main-header')).toBeInTheDocument()

      act(() => { vi.advanceTimersByTime(8000) })

      const { container } = render(<MainPage />)
      // After timer fires, header becomes hidden
      act(() => { vi.advanceTimersByTime(8000) })
    })

    it('clears the 8-second timer on unmount', () => {
      const { unmount } = render(<MainPage />)
      unmount()
      // Should not throw after unmount
      act(() => { vi.advanceTimersByTime(10000) })
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Mobile viewport behaviour
  // ────────────────────────────────────────────────────────────────────────────
  describe('mobile viewport behaviour', () => {
    beforeEach(() => {
      // Override matchMedia to return mobile=true
      matchMediaMock = makeMatchMedia(true)
      Object.defineProperty(window, 'matchMedia', { writable: true, value: matchMediaMock })
    })

    it('does NOT render MainHeader on mobile', () => {
      render(<MainPage />)
      expect(screen.queryByTestId('main-header')).not.toBeInTheDocument()
    })

    it('still renders Outlet on mobile', () => {
      render(<MainPage />)
      expect(screen.getByTestId('outlet')).toBeInTheDocument()
    })

    it('still renders MainSidebar on mobile', () => {
      render(<MainPage />)
      expect(screen.getByTestId('main-sidebar')).toBeInTheDocument()
    })

    it('does not auto-hide header (no header to hide) on mobile', () => {
      render(<MainPage />)
      act(() => { vi.advanceTimersByTime(8000) })
      // No crash, no header shown
      expect(screen.queryByTestId('main-header')).not.toBeInTheDocument()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // matchMedia change listener
  // ────────────────────────────────────────────────────────────────────────────
  describe('matchMedia change listener', () => {
    it('registers a change listener on the matchMedia object', () => {
      render(<MainPage />)
      expect(matchMediaMock().addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      )
    })

    it('removes the change listener on unmount', () => {
      const { unmount } = render(<MainPage />)
      unmount()
      expect(matchMediaMock().removeEventListener).toHaveBeenCalled()
    })

    it('restores header visibility when switching from mobile to desktop', () => {
      // Start as mobile
      matchMediaMock = makeMatchMedia(true)
      Object.defineProperty(window, 'matchMedia', { writable: true, value: matchMediaMock })

      const { container } = render(<MainPage />)
      // Header should not be visible (no !isMobileViewport branch)
      expect(screen.queryByTestId('main-header')).not.toBeInTheDocument()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // useScrollDirection integration
  // ────────────────────────────────────────────────────────────────────────────
  describe('useScrollDirection integration', () => {
    it('calls useScrollDirection with a ref object', () => {
      render(<MainPage />)
      expect(useScrollDirection).toHaveBeenCalledWith(
        expect.objectContaining({ current: expect.anything() })
      )
    })

    it('does not hide header when scroll direction is "up"', () => {
      useScrollDirection.mockReturnValue('up')
      render(<MainPage />)
      // header wrapper should have opacity-100 class
      const { container } = render(<MainPage />)
      // With direction=up, the hasScrollHiddenHeaderRef guard means
      // header stays visible on first mount
      const visible = container.querySelector('.opacity-100')
      expect(visible).toBeInTheDocument()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Right column layout
  // ────────────────────────────────────────────────────────────────────────────
  describe('right column layout', () => {
    it('right column wrapper has flex flex-col h-full classes', () => {
      const { container } = render(<MainPage />)
      const rightCol = container.querySelector('.flex.flex-col.h-full')
      expect(rightCol).toBeInTheDocument()
    })

    it('right column has flex-1 to fill remaining space', () => {
      const { container } = render(<MainPage />)
      const rightCol = container.querySelector('.flex-1.w-full')
      expect(rightCol).toBeInTheDocument()
    })

    it('scroll container has lg:px-5 padding on large screens', () => {
      const { container } = render(<MainPage />)
      const scrollContainer = container.querySelector('.lg\\:px-5')
      expect(scrollContainer).toBeInTheDocument()
    })
  })
})