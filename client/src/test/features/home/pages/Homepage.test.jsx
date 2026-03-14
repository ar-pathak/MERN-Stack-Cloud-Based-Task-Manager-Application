import { vi, describe, it, expect } from 'vitest'
vi.mock('../../../../features/home/components/FeaturesSection',  () => ({ default: () => <div data-testid="features-section" /> }))
vi.mock('../../../../features/home/components/FlowSection',      () => ({ default: () => <div data-testid="flow-section" /> }))
vi.mock('../../../../features/home/components/UseCasesSection',  () => ({ default: () => <div data-testid="usecases-section" /> }))
vi.mock('../../../../features/home/components/SecuritySection',  () => ({ default: () => <div data-testid="security-section" /> }))
vi.mock('../../../../features/home/components/Footer',           () => ({ default: () => <div data-testid="footer" /> }))
vi.mock('../../../../features/home/components/Navbar',           () => ({ default: () => <div data-testid="navbar" /> }))
vi.mock('../../../../features/home/components/HeroSection',      () => ({ default: () => <div data-testid="hero-section" /> }))

import { render, screen } from '@testing-library/react'
import HomePage from '../../../../features/home/pages/HomePage'

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get(_, tag) {
      return ({ children, initial, animate, whileInView, viewport, transition, whileHover, whileTap, exit, variants, ...rest }) =>
        <div {...rest}>{children}</div>
    }
  }),
  AnimatePresence: ({ children }) => children,
}))

vi.mock('react-router', () => ({
  Link: ({ children, to, className, ...rest }) => <a href={to} className={className} {...rest}>{children}</a>,
  useNavigate: () => () => {},
  useLocation: () => ({ pathname: '/' }),
}))


describe('HomePage', () => {
  it('renders Navbar', () => {
    render(<HomePage />)
    expect(screen.getByTestId('navbar')).toBeInTheDocument()
  })
  it('renders HeroSection', () => {
    render(<HomePage />)
    expect(screen.getByTestId('hero-section')).toBeInTheDocument()
  })
  it('root div has bg-slate-950', () => {
    const { container } = render(<HomePage />)
    expect(container.firstChild).toHaveClass('bg-slate-950')
  })
  it('root div has min-h-screen', () => {
    const { container } = render(<HomePage />)
    expect(container.firstChild).toHaveClass('min-h-screen')
  })
  it('root div has overflow-x-hidden', () => {
    const { container } = render(<HomePage />)
    expect(container.firstChild).toHaveClass('overflow-x-hidden')
  })
  it('renders blur blobs in background overlay', () => {
    const { container } = render(<HomePage />)
    expect(container.querySelectorAll('.blur-3xl').length).toBeGreaterThan(0)
  })
  it('renders pointer-events-none overlay', () => {
    const { container } = render(<HomePage />)
    expect(container.querySelector('.pointer-events-none')).toBeInTheDocument()
  })
  it('renders z-10 flex col layout wrapper', () => {
    const { container } = render(<HomePage />)
    expect(container.querySelector('.z-10.flex.min-h-screen.flex-col')).toBeInTheDocument()
  })
  it('renders a main element', () => {
    const { container } = render(<HomePage />)
    expect(container.querySelector('main')).toBeInTheDocument()
  })
})