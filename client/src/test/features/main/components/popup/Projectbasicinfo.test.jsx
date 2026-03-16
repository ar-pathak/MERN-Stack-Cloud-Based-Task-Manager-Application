import { vi, describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ProjectBasicInfo from '../../../../../features/main/components/popup/ProjectBasicInfo'

// No external deps — pure UI component, no mocks needed

describe('ProjectBasicInfo', () => {
  const defaultProps = {
    name: '',
    description: '',
    status: 'active',
    onChange: vi.fn(),
    error: '',
    disabled: false,
  }

  it('renders without crashing', () => {
    render(<ProjectBasicInfo {...defaultProps} />)
    expect(screen.getByPlaceholderText('e.g., Mobile App Redesign')).toBeInTheDocument()
  })

  it('renders Project Name label with required asterisk', () => {
    render(<ProjectBasicInfo {...defaultProps} />)
    expect(screen.getByText('Project Name')).toBeInTheDocument()
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('renders Description label', () => {
    render(<ProjectBasicInfo {...defaultProps} />)
    expect(screen.getByText('Description')).toBeInTheDocument()
  })

  it('renders Status label', () => {
    render(<ProjectBasicInfo {...defaultProps} />)
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('renders name input with correct value', () => {
    render(<ProjectBasicInfo {...defaultProps} name="My Project" />)
    expect(screen.getByDisplayValue('My Project')).toBeInTheDocument()
  })

  it('renders description textarea with correct value', () => {
    render(<ProjectBasicInfo {...defaultProps} description="Test description" />)
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument()
  })

  it('renders status select with active option selected', () => {
    render(<ProjectBasicInfo {...defaultProps} status="active" />)
    expect(screen.getByRole('combobox')).toHaveValue('active')
  })

  it('renders all three status options', () => {
    render(<ProjectBasicInfo {...defaultProps} />)
    expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Archived' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Completed' })).toBeInTheDocument()
  })

  it('shows error message when error prop is set', () => {
    render(<ProjectBasicInfo {...defaultProps} error="Name is required" />)
    expect(screen.getByText('Name is required')).toBeInTheDocument()
  })

  it('does not show error message when error prop is empty', () => {
    render(<ProjectBasicInfo {...defaultProps} error="" />)
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument()
  })

  it('applies error border class to name input when error exists', () => {
    render(<ProjectBasicInfo {...defaultProps} error="Required" />)
    const input = screen.getByPlaceholderText('e.g., Mobile App Redesign')
    expect(input.className).toContain('border-rose-500/50')
  })

  it('applies normal border class to name input when no error', () => {
    render(<ProjectBasicInfo {...defaultProps} error="" />)
    const input = screen.getByPlaceholderText('e.g., Mobile App Redesign')
    expect(input.className).toContain('border-slate-800/60')
  })

  it('calls onChange when name input changes', () => {
    const onChange = vi.fn()
    render(<ProjectBasicInfo {...defaultProps} onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText('e.g., Mobile App Redesign'), {
      target: { value: 'New Name' },
    })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('calls onChange when description textarea changes', () => {
    const onChange = vi.fn()
    render(<ProjectBasicInfo {...defaultProps} onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText('Describe the project goals and scope...'), {
      target: { value: 'Some description' },
    })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('calls onChange when status select changes', () => {
    const onChange = vi.fn()
    render(<ProjectBasicInfo {...defaultProps} onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'archived' } })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('disables name input when disabled=true', () => {
    render(<ProjectBasicInfo {...defaultProps} disabled={true} />)
    expect(screen.getByPlaceholderText('e.g., Mobile App Redesign')).toBeDisabled()
  })

  it('disables textarea when disabled=true', () => {
    render(<ProjectBasicInfo {...defaultProps} disabled={true} />)
    expect(screen.getByPlaceholderText('Describe the project goals and scope...')).toBeDisabled()
  })

  it('disables select when disabled=true', () => {
    render(<ProjectBasicInfo {...defaultProps} disabled={true} />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  it('name input has autoFocus attribute', () => {
    render(<ProjectBasicInfo {...defaultProps} />)
    const input = screen.getByPlaceholderText('e.g., Mobile App Redesign')
    expect(input).toHaveFocus()
  })
})
