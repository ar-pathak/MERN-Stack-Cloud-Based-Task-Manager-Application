import { vi, describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ProjectColorPicker from '../../../../../features/main/components/popup/ProjectColorPicker'

describe('ProjectColorPicker', () => {
  const COLORS = [
    { value: '#4f46e5', label: 'Indigo' },
    { value: '#10b981', label: 'Emerald' },
    { value: '#f59e0b', label: 'Amber' },
    { value: '#ef4444', label: 'Red' },
    { value: '#8b5cf6', label: 'Violet' },
    { value: '#06b6d4', label: 'Cyan' },
    { value: '#ec4899', label: 'Pink' },
    { value: '#6366f1', label: 'Blue' },
  ]

  const defaultProps = {
    selectedColor: '#4f46e5',
    onSelect: vi.fn(),
    disabled: false,
  }

  it('renders without crashing', () => {
    render(<ProjectColorPicker {...defaultProps} />)
    expect(screen.getByText('Project Color')).toBeInTheDocument()
  })

  it('renders all 8 color buttons', () => {
    render(<ProjectColorPicker {...defaultProps} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(8)
  })

  it('renders all color labels', () => {
    render(<ProjectColorPicker {...defaultProps} />)
    COLORS.forEach(color => {
      expect(screen.getByText(color.label)).toBeInTheDocument()
    })
  })

  it('renders color swatches with correct background colors', () => {
    const { container } = render(<ProjectColorPicker {...defaultProps} />)
    const swatches = container.querySelectorAll('.h-6.w-6.rounded-lg')
    expect(swatches.length).toBe(8)
    expect(swatches[0]).toHaveStyle({ backgroundColor: '#4f46e5' })
  })

  it('applies selected styles to the active color button', () => {
    render(<ProjectColorPicker {...defaultProps} selectedColor="#4f46e5" />)
    const indigoButton = screen.getByText('Indigo').closest('button')
    expect(indigoButton.className).toContain('border-violet-500/50')
    expect(indigoButton.className).toContain('bg-violet-500/10')
  })

  it('applies unselected styles to non-active color buttons', () => {
    render(<ProjectColorPicker {...defaultProps} selectedColor="#4f46e5" />)
    const emeraldButton = screen.getByText('Emerald').closest('button')
    expect(emeraldButton.className).toContain('border-slate-800/50')
  })

  it('calls onSelect with correct color value when a button is clicked', () => {
    const onSelect = vi.fn()
    render(<ProjectColorPicker {...defaultProps} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Emerald').closest('button'))
    expect(onSelect).toHaveBeenCalledWith('#10b981')
  })

  it('calls onSelect for every color when each is clicked', () => {
    const onSelect = vi.fn()
    render(<ProjectColorPicker {...defaultProps} onSelect={onSelect} />)
    COLORS.forEach((color, idx) => {
      fireEvent.click(screen.getByText(color.label).closest('button'))
      expect(onSelect).toHaveBeenNthCalledWith(idx + 1, color.value)
    })
  })

  it('disables all buttons when disabled=true', () => {
    render(<ProjectColorPicker {...defaultProps} disabled={true} />)
    screen.getAllByRole('button').forEach(btn => expect(btn).toBeDisabled())
  })

  it('does not disable buttons when disabled=false', () => {
    render(<ProjectColorPicker {...defaultProps} disabled={false} />)
    screen.getAllByRole('button').forEach(btn => expect(btn).not.toBeDisabled())
  })

  it('renders Project Color label text', () => {
    render(<ProjectColorPicker {...defaultProps} />)
    expect(screen.getByText('Project Color')).toBeInTheDocument()
  })

  it('renders in a 4-column grid', () => {
    const { container } = render(<ProjectColorPicker {...defaultProps} />)
    const grid = container.querySelector('.grid-cols-4')
    expect(grid).toBeInTheDocument()
    expect(grid.children.length).toBe(8)
  })
})