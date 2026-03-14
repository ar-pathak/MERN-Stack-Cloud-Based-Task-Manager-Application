import { vi, describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FlowSection from '../../../../features/home/components/FlowSection'

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


describe('FlowSection', () => {
    it('renders How Aurora Works label', () => {
        render(<FlowSection />)
        expect(screen.getByText('How Aurora Works')).toBeInTheDocument()
    })
    it('renders the main heading', () => {
        render(<FlowSection />)
        expect(screen.getByText(/One operational loop from workspace setup/)).toBeInTheDocument()
    })
    it('renders the description paragraph', () => {
        render(<FlowSection />)
        expect(screen.getByText(/Aurora follows the same flow as your authenticated experience/)).toBeInTheDocument()
    })
    it('renders step 1 title', () => {
        render(<FlowSection />)
        expect(screen.getByText('Create your Aurora Workspace')).toBeInTheDocument()
    })
    it('renders step 2 title', () => {
        render(<FlowSection />)
        expect(screen.getByText('Map projects into Aurora Flow')).toBeInTheDocument()
    })
    it('renders step 3 title', () => {
        render(<FlowSection />)
        expect(screen.getByText('Collaborate in Aurora Connect')).toBeInTheDocument()
    })
    it('renders step 4 title', () => {
        render(<FlowSection />)
        expect(screen.getByText('Track decisions in Aurora Insights')).toBeInTheDocument()
    })
    it('renders step number badges 1–4', () => {
        render(<FlowSection />)
        expect(screen.getByText('1')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
        expect(screen.getByText('3')).toBeInTheDocument()
        expect(screen.getByText('4')).toBeInTheDocument()
    })
    it('renders step 1 body text', () => {
        render(<FlowSection />)
        expect(screen.getByText(/Start a workspace, set the context/)).toBeInTheDocument()
    })
    it('renders step 3 body text', () => {
        render(<FlowSection />)
        expect(screen.getByText(/Chat in real time, call directly from conversations/)).toBeInTheDocument()
    })
    it('renders section with id="how-aurora-works"', () => {
        const { container } = render(<FlowSection />)
        expect(container.querySelector('#how-aurora-works')).toBeInTheDocument()
    })
    it('renders exactly 4 step articles', () => {
        const { container } = render(<FlowSection />)
        expect(container.querySelectorAll('article').length).toBe(4)
    })
})