import { vi, describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CTASection from '../../../../features/home/components/CTASection'

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
    useNavigate: () => () => { },
    useLocation: () => ({ pathname: '/' }),
}))


describe('CTASection', () => {
    it('renders the main heading', () => {
        render(<CTASection />)
        expect(screen.getByText('Turn your cloud workspace into a task management OS.')).toBeInTheDocument()
    })
    it('renders the description text', () => {
        render(<CTASection />)
        expect(screen.getByText(/Create your first workspace, invite your team/)).toBeInTheDocument()
    })
    it('renders Get started free button', () => {
        render(<CTASection />)
        expect(screen.getByText('Get started free')).toBeInTheDocument()
    })
    it('renders Talk to us button', () => {
        render(<CTASection />)
        expect(screen.getByText('Talk to us')).toBeInTheDocument()
    })
    it('renders onboarding help text', () => {
        render(<CTASection />)
        expect(screen.getByText('Onboarding help included for teams of 5+ members.')).toBeInTheDocument()
    })
    it('Get started free points to auth', () => {
        render(<CTASection />)
        expect(screen.getByText('Get started free').closest('a')).toHaveAttribute('href', 'auth')
    })
    it('Talk to us is a button element', () => {
        render(<CTASection />)
        expect(screen.getByText('Talk to us').tagName).toBe('BUTTON')
    })
    it('renders a section element', () => {
        const { container } = render(<CTASection />)
        expect(container.querySelector('section')).toBeInTheDocument()
    })
    it('renders the gradient background', () => {
        const { container } = render(<CTASection />)
        expect(container.querySelector('.bg-gradient-to-r')).toBeInTheDocument()
    })
})