import { vi, describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import UseCasesSection from '../../../../features/home/components/UseCasesSection'

vi.mock('framer-motion', () => ({
    motion: new Proxy({}, {
        get(_, tag) {
            return ({ children, initial, animate, whileInView, viewport, transition, whileHover, whileTap, exit, variants, ...rest }) =>
                <div {...rest}>{children}</div>
        }
    }),
    AnimatePresence: ({ children }) => children,
}))


describe('UseCasesSection', () => {
    it('renders Live Feature Preview label', () => {
        render(<UseCasesSection />)
        expect(screen.getByText('Live Feature Preview')).toBeInTheDocument()
    })
    it('renders the main heading', () => {
        render(<UseCasesSection />)
        expect(screen.getByText(/A landing preview built with the same panel language/)).toBeInTheDocument()
    })
    it('renders the description paragraph', () => {
        render(<UseCasesSection />)
        expect(screen.getByText(/This mock stream mirrors your workspace timeline/)).toBeInTheDocument()
    })
    it('renders Activity Timeline subtitle', () => {
        render(<UseCasesSection />)
        expect(screen.getByText('Activity Timeline')).toBeInTheDocument()
    })
    it('renders Aurora Workspace Stream title', () => {
        render(<UseCasesSection />)
        expect(screen.getByText('Aurora Workspace Stream')).toBeInTheDocument()
    })
    it('renders all activity entry texts', () => {
        render(<UseCasesSection />)
        expect(screen.getByText('Growth Workspace created by Priya')).toBeInTheDocument()
        expect(screen.getByText('Q1 launch checklist moved to In Progress')).toBeInTheDocument()
        expect(screen.getByText('Design review call started in Product chat')).toBeInTheDocument()
        expect(screen.getByText('Weekly performance report generated')).toBeInTheDocument()
    })
    it('renders activity type labels', () => {
        render(<UseCasesSection />)
        expect(screen.getByText('Workspace')).toBeInTheDocument()
        expect(screen.getByText('Task Flow')).toBeInTheDocument()
        expect(screen.getByText('Connect')).toBeInTheDocument()
        expect(screen.getByText('Insights')).toBeInTheDocument()
    })
    it('renders Aurora Connect subtitle', () => {
        render(<UseCasesSection />)
        expect(screen.getByText('Realtime Chat and Calling')).toBeInTheDocument()
    })
    it('renders Aurora Connect title', () => {
        render(<UseCasesSection />)
        expect(screen.getByText('Aurora Connect')).toBeInTheDocument()
    })
    it('renders all chat messages', () => {
        render(<UseCasesSection />)
        expect(screen.getByText('Can we lock copy for the release post?')).toBeInTheDocument()
        expect(screen.getByText('Yes, adding final notes in Aurora Flow.')).toBeInTheDocument()
        expect(screen.getByText('Joining call in 2 min.')).toBeInTheDocument()
    })
    it('renders sender names', () => {
        render(<UseCasesSection />)
        expect(screen.getByText('Aman')).toBeInTheDocument()
        expect(screen.getByText('Leena')).toBeInTheDocument()
        expect(screen.getByText('Ravi')).toBeInTheDocument()
    })
    it('renders message timestamps', () => {
        render(<UseCasesSection />)
        expect(screen.getByText('09:12')).toBeInTheDocument()
        expect(screen.getByText('09:14')).toBeInTheDocument()
        expect(screen.getByText('09:15')).toBeInTheDocument()
    })
    it('renders active call banner', () => {
        render(<UseCasesSection />)
        expect(screen.getByText('Product team call active - 4 participants')).toBeInTheDocument()
    })
    it('renders Dashboard Pulse subtitle', () => {
        render(<UseCasesSection />)
        expect(screen.getByText('Dashboard Pulse')).toBeInTheDocument()
    })
    it('renders Aurora Insights Snapshot title', () => {
        render(<UseCasesSection />)
        expect(screen.getByText('Aurora Insights Snapshot')).toBeInTheDocument()
    })
    it('renders Unread stat = 27', () => {
        render(<UseCasesSection />)
        expect(screen.getByText('Unread')).toBeInTheDocument()
        expect(screen.getByText('27')).toBeInTheDocument()
    })
    it('renders Completed stat = 64', () => {
        render(<UseCasesSection />)
        expect(screen.getByText('Completed')).toBeInTheDocument()
        expect(screen.getByText('64')).toBeInTheDocument()
    })
    it('renders Calls stat = 5', () => {
        render(<UseCasesSection />)
        expect(screen.getByText('Calls')).toBeInTheDocument()
        expect(screen.getByText('5')).toBeInTheDocument()
    })
    it('renders section with id="live-preview"', () => {
        const { container } = render(<UseCasesSection />)
        expect(container.querySelector('#live-preview')).toBeInTheDocument()
    })
})