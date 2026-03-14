import { vi, describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import HeroSection from '../../../../features/home/components/HeroSection'

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


describe('HeroSection', () => {
  it('renders desktop badge text', () => {
    render(<HeroSection />)
    expect(screen.getByText('Aurora Workspace + Aurora Flow + Aurora Connect')).toBeInTheDocument()
  })
  it('renders mobile badge text', () => {
    render(<HeroSection />)
    expect(screen.getByText('Aurora Workspace, Flow, Connect')).toBeInTheDocument()
  })
  it('renders main headline', () => {
    render(<HeroSection />)
    expect(screen.getByText(/Aurora keeps workspace planning/)).toBeInTheDocument()
  })
  it('renders gradient headline span', () => {
    render(<HeroSection />)
    expect(screen.getByText('moving in one connected product.')).toBeInTheDocument()
  })
  it('renders subheading', () => {
    render(<HeroSection />)
    expect(screen.getByText(/Build workspaces, organize projects and tasks/)).toBeInTheDocument()
  })
  it('renders Open Aurora CTA', () => {
    render(<HeroSection />)
    expect(screen.getByText('Open Aurora')).toBeInTheDocument()
  })
  it('renders Go to Workspace CTA', () => {
    render(<HeroSection />)
    expect(screen.getByText('Go to Workspace')).toBeInTheDocument()
  })
  it('renders all 4 highlight titles', () => {
    render(<HeroSection />)
    expect(screen.getByText('Real-time notifications')).toBeInTheDocument()
    expect(screen.getByText('Calls inside chat')).toBeInTheDocument()
    expect(screen.getByText('Actionable insights')).toBeInTheDocument()
    expect(screen.getByText('Privacy controls')).toBeInTheDocument()
  })
  it('renders Aurora Workspace panel', () => {
    render(<HeroSection />)
    expect(screen.getByText('Aurora Workspace')).toBeInTheDocument()
  })
  it('renders Product Launch Operations', () => {
    render(<HeroSection />)
    expect(screen.getByText('Product Launch Operations')).toBeInTheDocument()
  })
  it('renders Live sync on badge', () => {
    render(<HeroSection />)
    expect(screen.getByText('Live sync on')).toBeInTheDocument()
  })
  it('renders Aurora Flow panel', () => {
    render(<HeroSection />)
    expect(screen.getByText('Aurora Flow')).toBeInTheDocument()
  })
  it('renders Aurora Connect panel', () => {
    render(<HeroSection />)
    expect(screen.getByText('Aurora Connect')).toBeInTheDocument()
  })
  it('renders flow task items', () => {
    render(<HeroSection />)
    expect(screen.getByText('Finalize onboarding checklist')).toBeInTheDocument()
    expect(screen.getByText('Review workspace permissions')).toBeInTheDocument()
    expect(screen.getByText('Ship Q1 release notes')).toBeInTheDocument()
  })
  it('renders connect activity item', () => {
    render(<HeroSection />)
    expect(screen.getByText('Design team called in from workspace chat')).toBeInTheDocument()
  })
  it('renders Workspaces stat = 8', () => {
    render(<HeroSection />)
    expect(screen.getByText('Workspaces')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })
  it('renders Open calls stat = 2', () => {
    render(<HeroSection />)
    expect(screen.getByText('Open calls')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
  it('renders Insights score stat = 92%', () => {
    render(<HeroSection />)
    expect(screen.getByText('Insights score')).toBeInTheDocument()
    expect(screen.getByText('92%')).toBeInTheDocument()
  })
  it('Open Aurora link points to /main', () => {
    render(<HeroSection />)
    expect(screen.getByText('Open Aurora').closest('a')).toHaveAttribute('href', '/main')
  })
  it('Go to Workspace link points to /main', () => {
    render(<HeroSection />)
    expect(screen.getByText('Go to Workspace').closest('a')).toHaveAttribute('href', '/main')
  })
})