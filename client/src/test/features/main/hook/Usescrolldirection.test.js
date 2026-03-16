import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRef } from 'react'
import { useScrollDirection } from '../../../../features/main/hook/useScrollDirection'

// Helper: create a fake scrollable element with controllable scrollTop
const makeFakeEl = (initialScrollTop = 0) => {
  const listeners = {}
  const el = {
    scrollTop: initialScrollTop,
    addEventListener: vi.fn((event, cb) => { listeners[event] = cb }),
    removeEventListener: vi.fn((event, cb) => { delete listeners[event] }),
    _trigger: (event) => { if (listeners[event]) listeners[event]() },
  }
  return el
}

// Helper: render useScrollDirection with a ref whose .current is the given el
const renderWithEl = (el) => {
  const ref = { current: el }
  return renderHook(() => useScrollDirection(ref))
}

describe('useScrollDirection', () => {
  // ────────────────────────────────────────────────────────────────────────────
  // Initial state
  // ────────────────────────────────────────────────────────────────────────────
  describe('initial state', () => {
    it('returns "up" as the default direction', () => {
      const el = makeFakeEl(0)
      const { result } = renderWithEl(el)
      expect(result.current).toBe('up')
    })

    it('attaches a scroll event listener on mount', () => {
      const el = makeFakeEl()
      renderWithEl(el)
      expect(el.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true })
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Null ref — should not crash
  // ────────────────────────────────────────────────────────────────────────────
  describe('null ref', () => {
    it('does not throw when ref.current is null', () => {
      const ref = { current: null }
      expect(() => renderHook(() => useScrollDirection(ref))).not.toThrow()
    })

    it('returns "up" when ref.current is null', () => {
      const ref = { current: null }
      const { result } = renderHook(() => useScrollDirection(ref))
      expect(result.current).toBe('up')
    })

    it('does not attach any event listener when ref is null', () => {
      const el = makeFakeEl()
      const ref = { current: null }
      renderHook(() => useScrollDirection(ref))
      expect(el.addEventListener).not.toHaveBeenCalled()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Threshold filtering (< 10px change is ignored)
  // ────────────────────────────────────────────────────────────────────────────
  describe('threshold filtering', () => {
    it('ignores scroll changes smaller than 10px (direction stays "up")', () => {
      const el = makeFakeEl(0)
      const { result } = renderWithEl(el)

      act(() => {
        el.scrollTop = 5  // less than threshold
        el._trigger('scroll')
      })

      expect(result.current).toBe('up')
    })

    it('ignores exactly 9px change', () => {
      const el = makeFakeEl(0)
      const { result } = renderWithEl(el)

      act(() => {
        el.scrollTop = 9
        el._trigger('scroll')
      })

      expect(result.current).toBe('up')
    })

    it('reacts to exactly 10px change (at threshold boundary)', () => {
      const el = makeFakeEl(0)
      const { result } = renderWithEl(el)

      act(() => {
        el.scrollTop = 10
        el._trigger('scroll')
      })

      expect(result.current).toBe('down')
    })

    it('reacts to changes larger than 10px', () => {
      const el = makeFakeEl(0)
      const { result } = renderWithEl(el)

      act(() => {
        el.scrollTop = 50
        el._trigger('scroll')
      })

      expect(result.current).toBe('down')
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Scroll DOWN detection
  // ────────────────────────────────────────────────────────────────────────────
  describe('scroll down detection', () => {
    it('returns "down" when scrolling downward past threshold', () => {
      const el = makeFakeEl(0)
      const { result } = renderWithEl(el)

      act(() => {
        el.scrollTop = 100
        el._trigger('scroll')
      })

      expect(result.current).toBe('down')
    })

    it('returns "down" for large scroll values', () => {
      const el = makeFakeEl(0)
      const { result } = renderWithEl(el)

      act(() => {
        el.scrollTop = 1000
        el._trigger('scroll')
      })

      expect(result.current).toBe('down')
    })

    it('tracks multiple downward scroll events', () => {
      const el = makeFakeEl(0)
      const { result } = renderWithEl(el)

      act(() => {
        el.scrollTop = 100
        el._trigger('scroll')
      })
      expect(result.current).toBe('down')

      act(() => {
        el.scrollTop = 200
        el._trigger('scroll')
      })
      expect(result.current).toBe('down')
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Scroll UP detection
  // ────────────────────────────────────────────────────────────────────────────
  describe('scroll up detection', () => {
    it('returns "up" when scrolling back up after scrolling down', () => {
      const el = makeFakeEl(0)
      const { result } = renderWithEl(el)

      // Scroll down first
      act(() => {
        el.scrollTop = 200
        el._trigger('scroll')
      })
      expect(result.current).toBe('down')

      // Now scroll back up
      act(() => {
        el.scrollTop = 100
        el._trigger('scroll')
      })
      expect(result.current).toBe('up')
    })

    it('returns "up" when scrollTop goes to 0', () => {
      const el = makeFakeEl(0)
      const { result } = renderWithEl(el)

      act(() => {
        el.scrollTop = 200
        el._trigger('scroll')
      })

      act(() => {
        el.scrollTop = 0
        el._trigger('scroll')
      })

      expect(result.current).toBe('up')
    })

    it('returns "up" when scrollTop is negative (overscroll)', () => {
      const el = makeFakeEl(0)
      const { result } = renderWithEl(el)

      act(() => {
        el.scrollTop = 200
        el._trigger('scroll')
      })

      act(() => {
        el.scrollTop = -5  // currentY <= 0 branch
        el._trigger('scroll')
      })

      expect(result.current).toBe('up')
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // lastScrollY tracking (direction changes require passing threshold each time)
  // ────────────────────────────────────────────────────────────────────────────
  describe('lastScrollY tracking', () => {
    it('updates internal lastScrollY reference after each significant scroll', () => {
      const el = makeFakeEl(0)
      const { result } = renderWithEl(el)

      // Scroll down 100
      act(() => { el.scrollTop = 100; el._trigger('scroll') })
      expect(result.current).toBe('down')

      // Scroll up 5 — delta is only 5 from 100, should be ignored
      act(() => { el.scrollTop = 95; el._trigger('scroll') })
      expect(result.current).toBe('down') // unchanged

      // Scroll up significantly
      act(() => { el.scrollTop = 50; el._trigger('scroll') })
      expect(result.current).toBe('up')
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Cleanup on unmount
  // ────────────────────────────────────────────────────────────────────────────
  describe('cleanup on unmount', () => {
    it('removes the scroll event listener on unmount', () => {
      const el = makeFakeEl()
      const { unmount } = renderWithEl(el)
      unmount()
      expect(el.removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function))
    })

    it('removes the same handler that was added', () => {
      const el = makeFakeEl()
      const { unmount } = renderWithEl(el)

      const addedHandler = el.addEventListener.mock.calls[0][1]
      unmount()
      const removedHandler = el.removeEventListener.mock.calls[0][1]

      expect(addedHandler).toBe(removedHandler)
    })
  })
})