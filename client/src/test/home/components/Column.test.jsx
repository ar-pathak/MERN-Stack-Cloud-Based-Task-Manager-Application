import { vi,describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Column from '../../../features/home/components/Column'

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get(_, tag) {
      return ({ children, initial, animate, whileInView, viewport,
                transition, whileHover, whileTap, exit, variants, ...rest }) =>
        <div {...rest}>{children}</div>
    }
  }),
  AnimatePresence: ({ children }) => children,
}))


describe('Column', () => {
  const defaultProps = {
    title: 'To Do',
    tasks: ['Task A', 'Task B', 'Task C'],
  }

  it('renders the title', () => {
    render(<Column {...defaultProps} />)
    expect(screen.getByText('To Do')).toBeInTheDocument()
  })

  it('renders all tasks', () => {
    render(<Column {...defaultProps} />)
    expect(screen.getByText('Task A')).toBeInTheDocument()
    expect(screen.getByText('Task B')).toBeInTheDocument()
    expect(screen.getByText('Task C')).toBeInTheDocument()
  })

  it('renders with default slate accent', () => {
    const { container } = render(<Column {...defaultProps} />)
    const taskDivs = container.querySelectorAll('.bg-slate-800\\/80')
    expect(taskDivs.length).toBeGreaterThan(0)
  })

  it('renders with cyan accent when specified', () => {
    const { container } = render(<Column {...defaultProps} accent="cyan" />)
    const taskDivs = container.querySelectorAll('.bg-cyan-500\\/15')
    expect(taskDivs.length).toBeGreaterThan(0)
  })

  it('renders with blue accent when specified', () => {
    const { container } = render(<Column {...defaultProps} accent="blue" />)
    const taskDivs = container.querySelectorAll('.bg-blue-500\\/15')
    expect(taskDivs.length).toBeGreaterThan(0)
  })

  it('renders the gradient bar', () => {
    const { container } = render(<Column {...defaultProps} />)
    const gradientBar = container.querySelector('.bg-gradient-to-r')
    expect(gradientBar).toBeInTheDocument()
  })

  it('renders correct number of task items', () => {
    const tasks = ['Task 1', 'Task 2']
    render(<Column title="Test" tasks={tasks} />)
    expect(screen.getAllByText(/Task \d/).length).toBe(2)
  })

  it('renders with empty tasks array', () => {
    const { container } = render(<Column title="Empty" tasks={[]} />)
    const taskContainer = container.querySelector('.space-y-1\\.5')
    expect(taskContainer).toBeInTheDocument()
    expect(taskContainer.children.length).toBe(0)
  })

  it('wraps in rounded container', () => {
    const { container } = render(<Column {...defaultProps} />)
    expect(container.firstChild).toHaveClass('rounded-2xl')
  })
})