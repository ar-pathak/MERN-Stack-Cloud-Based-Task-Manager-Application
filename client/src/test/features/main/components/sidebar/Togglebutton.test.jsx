import { vi, describe, it, expect } from 'vitest'

vi.mock('framer-motion', () => ({
    motion: new Proxy({}, {
        get(_, tag) {
            return ({ children, animate, transition, whileHover, whileTap,
                initial, exit, variants, layoutId, ...rest }) =>
                <div data-testid={`motion-${tag}`} {...rest}>{children}</div>
        }
    }),
    AnimatePresence: ({ children }) => children,
}))

import { render, screen, fireEvent } from '@testing-library/react'
import { ToggleButton } from '../../../../../features/main/components/sidebar/ToggleButton'

describe('ToggleButton', () => {
    // ─── Rendering ────────────────────────────────────────────────────────────────
    describe('rendering', () => {
        it('renders without crashing', () => {
            render(<ToggleButton isExpanded={true} onClick={vi.fn()} />)
            expect(screen.getByTestId('motion-button')).toBeInTheDocument()
        })

        it('renders the ChevronLeft icon', () => {
            const { container } = render(<ToggleButton isExpanded={true} onClick={vi.fn()} />)
            expect(container.querySelector('svg')).toBeInTheDocument()
        })

        it('renders a motion.div wrapper around the icon', () => {
            render(<ToggleButton isExpanded={true} onClick={vi.fn()} />)
            expect(screen.getByTestId('motion-div')).toBeInTheDocument()
        })
    })

    // ─── Title Prop ───────────────────────────────────────────────────────────────
    describe('title attribute', () => {
        it('shows "Collapse sidebar" title when isExpanded=true', () => {
            render(<ToggleButton isExpanded={true} onClick={vi.fn()} />)
            expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument()
        })

        it('shows "Expand sidebar" title when isExpanded=false', () => {
            render(<ToggleButton isExpanded={false} onClick={vi.fn()} />)
            expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument()
        })
    })

    // ─── Styling ──────────────────────────────────────────────────────────────────
    describe('styling', () => {
        it('has absolute positioning class', () => {
            render(<ToggleButton isExpanded={true} onClick={vi.fn()} />)
            expect(screen.getByTestId('motion-button')).toHaveClass('absolute')
        })

        it('has z-10 class', () => {
            render(<ToggleButton isExpanded={true} onClick={vi.fn()} />)
            expect(screen.getByTestId('motion-button')).toHaveClass('z-10')
        })

        it('has rounded-xl class', () => {
            render(<ToggleButton isExpanded={true} onClick={vi.fn()} />)
            expect(screen.getByTestId('motion-button')).toHaveClass('rounded-xl')
        })

        it('has h-8 w-8 dimensions', () => {
            render(<ToggleButton isExpanded={true} onClick={vi.fn()} />)
            expect(screen.getByTestId('motion-button')).toHaveClass('h-8', 'w-8')
        })
    })

    // ─── Interaction ──────────────────────────────────────────────────────────────
    describe('interaction', () => {
        it('calls onClick when button is clicked', () => {
            const onClick = vi.fn()
            render(<ToggleButton isExpanded={true} onClick={onClick} />)
            fireEvent.click(screen.getByTestId('motion-button'))
            expect(onClick).toHaveBeenCalledTimes(1)
        })

        it('calls onClick multiple times on repeated clicks', () => {
            const onClick = vi.fn()
            render(<ToggleButton isExpanded={false} onClick={onClick} />)
            fireEvent.click(screen.getByTestId('motion-button'))
            fireEvent.click(screen.getByTestId('motion-button'))
            expect(onClick).toHaveBeenCalledTimes(2)
        })

        it('works correctly when isExpanded toggles from true to false', () => {
            const onClick = vi.fn()
            const { rerender } = render(<ToggleButton isExpanded={true} onClick={onClick} />)
            expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument()
            rerender(<ToggleButton isExpanded={false} onClick={onClick} />)
            expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument()
        })
    })
})