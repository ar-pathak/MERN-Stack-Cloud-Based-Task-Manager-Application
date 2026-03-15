import { vi, describe, it, expect } from 'vitest'

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get(_, tag) {
      return ({ children, animate, transition, initial, exit, variants,
                whileHover, whileTap, whileInView, viewport, ...rest }) =>
        <div data-testid={`motion-${tag}`} {...rest}>{children}</div>
    }
  }),
  AnimatePresence: ({ children }) => children,
}))

import { render, screen } from '@testing-library/react'
import AnimatedBackground from '../../../../../features/main/components/background/AnimatedBackground'

describe('AnimatedBackground', () => {
  it('renders without crashing', () => {
    const { container } = render(<AnimatedBackground />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders the outer wrapper with absolute inset-0 positioning', () => {
    const { container } = render(<AnimatedBackground />)
    const wrapper = container.firstChild
    expect(wrapper).toHaveClass('absolute', 'inset-0', '-z-10', 'overflow-hidden')
  })

  it('renders the gradient base layer', () => {
    const { container } = render(<AnimatedBackground />)
    const gradientBase = container.querySelector('.bg-gradient-to-br')
    expect(gradientBase).toBeInTheDocument()
    expect(gradientBase).toHaveClass('from-slate-900', 'via-slate-950', 'to-sky-950')
  })

  it('renders three animated blob divs', () => {
    const { container } = render(<AnimatedBackground />)
    const blobs = container.querySelectorAll('[data-testid="motion-div"]')
    expect(blobs.length).toBe(3)
  })

  it('first blob has sky color class', () => {
    const { container } = render(<AnimatedBackground />)
    const blobs = container.querySelectorAll('[data-testid="motion-div"]')
    expect(blobs[0].className).toContain('bg-sky-500/20')
  })

  it('second blob has cyan color class', () => {
    const { container } = render(<AnimatedBackground />)
    const blobs = container.querySelectorAll('[data-testid="motion-div"]')
    expect(blobs[1].className).toContain('bg-cyan-400/20')
  })

  it('third blob has blue color class', () => {
    const { container } = render(<AnimatedBackground />)
    const blobs = container.querySelectorAll('[data-testid="motion-div"]')
    expect(blobs[2].className).toContain('bg-blue-500/16')
  })

  it('all blobs have blur-3xl class', () => {
    const { container } = render(<AnimatedBackground />)
    const blurDivs = container.querySelectorAll('.blur-3xl')
    expect(blurDivs.length).toBe(3)
  })

  it('all blobs have rounded-full class', () => {
    const { container } = render(<AnimatedBackground />)
    const blobs = container.querySelectorAll('[data-testid="motion-div"]')
    blobs.forEach(blob => expect(blob).toHaveClass('rounded-full'))
  })

  it('renders the noise overlay layer', () => {
    const { container } = render(<AnimatedBackground />)
    const noiseLayer = container.querySelector('.opacity-\\[0\\.12\\]')
    expect(noiseLayer).toBeInTheDocument()
    expect(noiseLayer).toHaveClass('mix-blend-soft-light')
  })

  it('renders exactly 5 child elements inside the wrapper', () => {
    const { container } = render(<AnimatedBackground />)
    // gradient base + 3 blobs + noise = 5 direct children
    expect(container.firstChild.children.length).toBe(5)
  })
})