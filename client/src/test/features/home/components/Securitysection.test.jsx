import { vi, describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SecuritySection from '../../../../features/home/components/SecuritySection'

vi.mock('framer-motion', () => ({
    motion: new Proxy({}, {
        get(_, tag) {
            return ({ children, initial, animate, whileInView, viewport, transition, whileHover, whileTap, exit, variants, ...rest }) =>
                <div {...rest}>{children}</div>
        }
    }),
    AnimatePresence: ({ children }) => children,
}))


describe('SecuritySection', () => {
    it('renders Trust and Security label', () => {
        render(<SecuritySection />)
        expect(screen.getByText('Trust and Security')).toBeInTheDocument()
    })
    it('renders the main heading', () => {
        render(<SecuritySection />)
        expect(screen.getByText(/Built for teams that need velocity and control/)).toBeInTheDocument()
    })
    it('renders the description', () => {
        render(<SecuritySection />)
        expect(screen.getByText(/Aurora is not a marketing mockup/)).toBeInTheDocument()
    })
    it('renders Private account controls', () => {
        render(<SecuritySection />)
        expect(screen.getByText('Private account controls')).toBeInTheDocument()
    })
    it('renders Role-based workspace access', () => {
        render(<SecuritySection />)
        expect(screen.getByText('Role-based workspace access')).toBeInTheDocument()
    })
    it('renders Secure authentication sessions', () => {
        render(<SecuritySection />)
        expect(screen.getByText('Secure authentication sessions')).toBeInTheDocument()
    })
    it('renders Permission-aware interactions', () => {
        render(<SecuritySection />)
        expect(screen.getByText('Permission-aware interactions')).toBeInTheDocument()
    })
    it('renders Private account controls detail', () => {
        render(<SecuritySection />)
        expect(screen.getByText(/Aurora supports private profile visibility/)).toBeInTheDocument()
    })
    it('renders Role-based access detail', () => {
        render(<SecuritySection />)
        expect(screen.getByText(/Owner, admin, member, and viewer roles govern/)).toBeInTheDocument()
    })
    it('renders Secure auth sessions detail', () => {
        render(<SecuritySection />)
        expect(screen.getByText(/Auth state uses HttpOnly cookies/)).toBeInTheDocument()
    })
    it('renders Permission-aware detail', () => {
        render(<SecuritySection />)
        expect(screen.getByText(/Task, chat, and update actions respect role/)).toBeInTheDocument()
    })
    it('renders Operational Confidence label', () => {
        render(<SecuritySection />)
        expect(screen.getByText('Operational Confidence')).toBeInTheDocument()
    })
    it('renders Protected app routes row', () => {
        render(<SecuritySection />)
        expect(screen.getByText('Protected app routes')).toBeInTheDocument()
        expect(screen.getByText('Enabled')).toBeInTheDocument()
    })
    it('renders Role access model row', () => {
        render(<SecuritySection />)
        expect(screen.getByText('Role access model')).toBeInTheDocument()
        expect(screen.getByText('Owner/Admin/Member/Viewer')).toBeInTheDocument()
    })
    it('renders Private profile support row', () => {
        render(<SecuritySection />)
        expect(screen.getByText('Private profile support')).toBeInTheDocument()
        expect(screen.getAllByText('Available').length).toBeGreaterThan(0)
    })
    it('renders Session cookie policy row', () => {
        render(<SecuritySection />)
        expect(screen.getByText('Session cookie policy')).toBeInTheDocument()
        expect(screen.getByText('HttpOnly')).toBeInTheDocument()
    })
    it('renders section with id="trust-security"', () => {
        const { container } = render(<SecuritySection />)
        expect(container.querySelector('#trust-security')).toBeInTheDocument()
    })
})