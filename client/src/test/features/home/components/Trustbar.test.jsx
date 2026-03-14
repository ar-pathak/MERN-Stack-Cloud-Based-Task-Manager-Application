import { vi, describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TrustBar from '../../../../features/home/components/TrustBar'

vi.mock('framer-motion', () => ({
    motion: new Proxy({}, {
        get(_, tag) {
            return ({ children, initial, animate, whileInView, viewport, transition, whileHover, whileTap, exit, variants, ...rest }) =>
                <div {...rest}>{children}</div>
        }
    }),
    AnimatePresence: ({ children }) => children,
}))


describe('TrustBar', () => {
    it('renders the trust message', () => {
        render(<TrustBar />)
        expect(screen.getByText(/Trusted cloud task manager for product, marketing/)).toBeInTheDocument()
    })
    it('renders 99.98% uptime', () => {
        render(<TrustBar />)
        expect(screen.getByText('99.98% uptime')).toBeInTheDocument()
    })
    it('renders data centers text', () => {
        render(<TrustBar />)
        expect(screen.getByText('Data centers in India, EU & US')).toBeInTheDocument()
    })
    it('renders role-based access controls text', () => {
        render(<TrustBar />)
        expect(screen.getByText('Role-based access controls')).toBeInTheDocument()
    })
    it('renders a section element', () => {
        const { container } = render(<TrustBar />)
        expect(container.querySelector('section')).toBeInTheDocument()
    })
    it('renders the icon wrapper with cyan background', () => {
        const { container } = render(<TrustBar />)
        expect(container.querySelector('.bg-cyan-500\\/15')).toBeInTheDocument()
    })
    it('renders two dot separators between stats', () => {
        const { container } = render(<TrustBar />)
        expect(container.querySelectorAll('.rounded-full.bg-slate-500').length).toBe(2)
    })
})