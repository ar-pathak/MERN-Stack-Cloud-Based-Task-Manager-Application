import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Stat from '../../../features/home/components/Stat'

describe('Stat', () => {
  it('renders the label', () => {
    render(<Stat label="Total Tasks" value="42" />)
    expect(screen.getByText('Total Tasks')).toBeInTheDocument()
  })

  it('renders the value', () => {
    render(<Stat label="Total Tasks" value="42" />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders with different label and value', () => {
    render(<Stat label="Workspaces" value="8" />)
    expect(screen.getByText('Workspaces')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('applies correct styling classes to label', () => {
    render(<Stat label="Test Label" value="99" />)
    const label = screen.getByText('Test Label')
    expect(label).toHaveClass('text-slate-400')
  })

  it('applies correct styling classes to value', () => {
    render(<Stat label="Test Label" value="99" />)
    const value = screen.getByText('99')
    expect(value).toHaveClass('text-slate-50', 'font-semibold')
  })

  it('renders inside a div with ring styling', () => {
    const { container } = render(<Stat label="Test" value="1" />)
    const wrapper = container.firstChild
    expect(wrapper).toHaveClass('rounded-xl', 'ring-1')
  })
})