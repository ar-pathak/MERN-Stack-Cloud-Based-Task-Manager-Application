import { vi, describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FeaturesSection from '../../../../features/home/components/FeaturesSection'

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get(_, tag) {
      // Use the 'tag' variable to render the correct HTML element
      return ({ children, initial, animate, whileInView, viewport, transition, whileHover, whileTap, exit, variants, ...rest }) => {
        const Component = tag;
        return <Component {...rest}>{children}</Component>;
      }
    }
  }),
  AnimatePresence: ({ children }) => children,
}))


describe('FeaturesSection', () => {
  it('renders the section label', () => {
    render(<FeaturesSection />)
    expect(screen.getByText('Product Overview')).toBeInTheDocument()
  })
  it('renders the main heading', () => {
    render(<FeaturesSection />)
    expect(screen.getByText(/Aurora modules match the way your team/)).toBeInTheDocument()
  })
  it('renders the description paragraph', () => {
    render(<FeaturesSection />)
    expect(screen.getByText(/Every card below maps to implemented modules/)).toBeInTheDocument()
  })
  it('renders Aurora Workspace card', () => {
    render(<FeaturesSection />)
    expect(screen.getByText('Aurora Workspace')).toBeInTheDocument()
  })
  it('renders Real-time Chat card', () => {
    render(<FeaturesSection />)
    expect(screen.getByText('Real-time Chat (Aurora Connect)')).toBeInTheDocument()
  })
  it('renders Task Flow card', () => {
    render(<FeaturesSection />)
    expect(screen.getByText('Task Flow (Aurora Flow)')).toBeInTheDocument()
  })
  it('renders Aurora Insights card', () => {
    render(<FeaturesSection />)
    expect(screen.getByText('Aurora Insights')).toBeInTheDocument()
  })
  it('renders Privacy Controls card', () => {
    render(<FeaturesSection />)
    expect(screen.getByText('Privacy Controls')).toBeInTheDocument()
  })
  it('renders Aurora Workspace body text', () => {
    render(<FeaturesSection />)
    expect(screen.getByText(/Keep workspaces, projects, teams/)).toBeInTheDocument()
  })
  it('renders Task Flow body text', () => {
    render(<FeaturesSection />)
    expect(screen.getByText(/Move work from planning to delivery/)).toBeInTheDocument()
  })
  it('renders Privacy Controls body text', () => {
    render(<FeaturesSection />)
    expect(screen.getByText(/Protect collaboration with private accounts/)).toBeInTheDocument()
  })
  it('renders Aurora Workspace bullet points', () => {
    render(<FeaturesSection />)
    expect(screen.getByText('Nested workspace > project > task structure')).toBeInTheDocument()
    expect(screen.getByText('Fast create actions for workspaces and tasks')).toBeInTheDocument()
  })
  it('renders Privacy Controls bullet points', () => {
    render(<FeaturesSection />)
    expect(screen.getByText('Owner, admin, member, viewer role model')).toBeInTheDocument()
    expect(screen.getByText('Private profile and permission-aware interactions')).toBeInTheDocument()
  })
  it('renders section with id="product-overview"', () => {
    const { container } = render(<FeaturesSection />)
    expect(container.querySelector('#product-overview')).toBeInTheDocument()
  })
  it('renders exactly 5 product cards', () => {
    const { container } = render(<FeaturesSection />)
    expect(container.querySelectorAll('article').length).toBe(5)
  })
})