import {vi, describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Footer from '../../../../features/home/components/Footer'

vi.mock('react-router', () => ({
  Link: ({ children, to, className, ...rest }) =>
    <a href={to} className={className} {...rest}>{children}</a>,
  useNavigate: () => () => {},
  useLocation: () => ({ pathname: '/' }),
}))

describe('Footer', () => {
  it('renders Aurora brand name', () => {
    render(<Footer />)
    expect(screen.getByText('Aurora')).toBeInTheDocument()
  })

  it('renders tagline text', () => {
    render(<Footer />)
    expect(screen.getByText('Workspace, Flow, Connect, and Insights in one platform.')).toBeInTheDocument()
  })

  it('renders Help link', () => {
    render(<Footer />)
    const helpLinks = screen.getAllByText('Help')
    expect(helpLinks.length).toBeGreaterThan(0)
  })

  it('renders Support link', () => {
    render(<Footer />)
    const supportLinks = screen.getAllByText('Support')
    expect(supportLinks.length).toBeGreaterThan(0)
  })

  it('renders Docs link', () => {
    render(<Footer />)
    expect(screen.getByText('Docs')).toBeInTheDocument()
  })

  it('renders Contact link', () => {
    render(<Footer />)
    expect(screen.getByText('Contact')).toBeInTheDocument()
  })

  it('renders copyright text with current year', () => {
    render(<Footer />)
    const year = new Date().getFullYear()
    expect(screen.getByText(`Copyright ${year} Aurora. All rights reserved.`)).toBeInTheDocument()
  })

  it('renders built for modern workspaces text', () => {
    render(<Footer />)
    expect(screen.getByText('Built for modern collaborative workspaces.')).toBeInTheDocument()
  })

  it('renders Contact as mailto link', () => {
    render(<Footer />)
    const contactLink = screen.getByText('Contact')
    expect(contactLink).toHaveAttribute('href', 'mailto:support@aurora-app.com')
  })

  it('Help links point to /main/support', () => {
    render(<Footer />)
    const helpLink = screen.getAllByText('Help')[0]
    expect(helpLink).toHaveAttribute('href', '/main/support')
  })

  it('renders footer element', () => {
    const { container } = render(<Footer />)
    expect(container.querySelector('footer')).toBeInTheDocument()
  })
})