import { vi, describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  SubtaskHeader,
  SubtaskInputs,
  AssigneeSelector,
  ProTip,
} from '../../../../../features/main/components/popup/SubtaskComponents'

describe('SubtaskHeader', () => {
  const defaultProps = { taskTitle: 'Fix login bug', onClose: vi.fn(), disabled: false }

  it('renders Create Subtask heading', () => {
    render(<SubtaskHeader {...defaultProps} />)
    expect(screen.getByText('Create Subtask')).toBeInTheDocument()
  })

  it('renders task title in the subtitle', () => {
    render(<SubtaskHeader {...defaultProps} />)
    expect(screen.getByText('Fix login bug')).toBeInTheDocument()
  })

  it('falls back to "Task" when taskTitle is falsy', () => {
    render(<SubtaskHeader {...defaultProps} taskTitle={null} />)
    expect(screen.getByText('Task')).toBeInTheDocument()
  })

  it('renders the close button', () => {
    render(<SubtaskHeader {...defaultProps} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<SubtaskHeader {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('disables the close button when disabled=true', () => {
    render(<SubtaskHeader {...defaultProps} disabled={true} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('does not disable close button when disabled=false', () => {
    render(<SubtaskHeader {...defaultProps} disabled={false} />)
    expect(screen.getByRole('button')).not.toBeDisabled()
  })
})

describe('SubtaskInputs', () => {
  const defaultProps = {
    formData: { title: '', description: '', dueDate: '' },
    handleChange: vi.fn(),
    errors: {},
    disabled: false,
  }

  it('renders Subtask Title label', () => {
    render(<SubtaskInputs {...defaultProps} />)
    expect(screen.getByText('Subtask Title')).toBeInTheDocument()
  })

  it('renders Description label', () => {
    render(<SubtaskInputs {...defaultProps} />)
    expect(screen.getByText('Description (Optional)')).toBeInTheDocument()
  })

  it('renders Due Date label', () => {
    render(<SubtaskInputs {...defaultProps} />)
    expect(screen.getByText('Due Date (Optional)')).toBeInTheDocument()
  })

  it('renders title input with correct value', () => {
    render(<SubtaskInputs {...defaultProps} formData={{ ...defaultProps.formData, title: 'My subtask' }} />)
    expect(screen.getByDisplayValue('My subtask')).toBeInTheDocument()
  })

  it('renders description textarea with value', () => {
    render(<SubtaskInputs {...defaultProps} formData={{ ...defaultProps.formData, description: 'Some detail' }} />)
    expect(screen.getByDisplayValue('Some detail')).toBeInTheDocument()
  })

  it('shows title error message when errors.title is set', () => {
    render(<SubtaskInputs {...defaultProps} errors={{ title: 'Title is required' }} />)
    expect(screen.getByText('Title is required')).toBeInTheDocument()
  })

  it('does not show error when errors.title is empty', () => {
    render(<SubtaskInputs {...defaultProps} />)
    expect(screen.queryByText('Title is required')).not.toBeInTheDocument()
  })

  it('applies error border class when title error exists', () => {
    render(<SubtaskInputs {...defaultProps} errors={{ title: 'Required' }} />)
    const titleInput = screen.getByPlaceholderText('e.g., Create wireframes for login page')
    expect(titleInput.className).toContain('border-rose-500/50')
  })

  it('calls handleChange when title input changes', () => {
    const handleChange = vi.fn()
    render(<SubtaskInputs {...defaultProps} handleChange={handleChange} />)
    fireEvent.change(screen.getByPlaceholderText('e.g., Create wireframes for login page'), {
      target: { value: 'Updated title' },
    })
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('calls handleChange when description changes', () => {
    const handleChange = vi.fn()
    render(<SubtaskInputs {...defaultProps} handleChange={handleChange} />)
    fireEvent.change(screen.getByPlaceholderText('Add more details about this subtask...'), {
      target: { value: 'New description' },
    })
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('disables all inputs when disabled=true', () => {
    render(<SubtaskInputs {...defaultProps} disabled={true} />)
    screen.getAllByRole('textbox').forEach(input => expect(input).toBeDisabled())
  })

  it('title input has autoFocus', () => {
    render(<SubtaskInputs {...defaultProps} />)
    expect(screen.getByPlaceholderText('e.g., Create wireframes for login page')).toHaveAttribute('autofocus')
  })
})

describe('AssigneeSelector', () => {
  const mockAssignees = [
    { id: 'a1', name: 'Alice', avatar: 'AL', email: 'alice@test.com', sourceLabel: 'Task member' },
    { id: 'a2', name: 'Bob', avatar: 'BO', email: 'bob@test.com', sourceLabel: null },
  ]

  const defaultProps = {
    assignees: mockAssignees,
    selectedId: null,
    onSelect: vi.fn(),
    isLoading: false,
    disabled: false,
  }

  it('renders loading state when isLoading=true', () => {
    render(<AssigneeSelector {...defaultProps} isLoading={true} assignees={[]} />)
    expect(screen.getByText('Loading task details...')).toBeInTheDocument()
  })

  it('renders empty state when assignees array is empty', () => {
    render(<AssigneeSelector {...defaultProps} assignees={[]} />)
    expect(screen.getByText('No assignees available')).toBeInTheDocument()
    expect(screen.getByText('Parent task has no assignees or team members')).toBeInTheDocument()
  })

  it('renders Assign To label', () => {
    render(<AssigneeSelector {...defaultProps} />)
    expect(screen.getByText('Assign To (Optional)')).toBeInTheDocument()
  })

  it('renders all assignee names', () => {
    render(<AssigneeSelector {...defaultProps} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('renders assignee emails', () => {
    render(<AssigneeSelector {...defaultProps} />)
    expect(screen.getByText('alice@test.com')).toBeInTheDocument()
    expect(screen.getByText('bob@test.com')).toBeInTheDocument()
  })

  it('renders sourceLabel when provided', () => {
    render(<AssigneeSelector {...defaultProps} />)
    expect(screen.getByText('Task member')).toBeInTheDocument()
  })

  it('renders avatars', () => {
    render(<AssigneeSelector {...defaultProps} />)
    expect(screen.getByText('AL')).toBeInTheDocument()
    expect(screen.getByText('BO')).toBeInTheDocument()
  })

  it('calls onSelect with assignee id when clicked', () => {
    const onSelect = vi.fn()
    render(<AssigneeSelector {...defaultProps} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Alice').closest('button'))
    expect(onSelect).toHaveBeenCalledWith('a1')
  })

  it('applies selected style to selected assignee', () => {
    render(<AssigneeSelector {...defaultProps} selectedId="a1" />)
    const aliceBtn = screen.getByText('Alice').closest('button')
    expect(aliceBtn.className).toContain('bg-teal-500/10')
    expect(aliceBtn.className).toContain('border-teal-500/30')
  })

  it('applies unselected style to non-selected assignees', () => {
    render(<AssigneeSelector {...defaultProps} selectedId="a1" />)
    const bobBtn = screen.getByText('Bob').closest('button')
    expect(bobBtn.className).toContain('bg-slate-900/40')
  })

  it('disables buttons when disabled=true', () => {
    render(<AssigneeSelector {...defaultProps} disabled={true} />)
    screen.getAllByRole('button').forEach(btn => expect(btn).toBeDisabled())
  })
})

describe('ProTip', () => {
  it('renders without crashing', () => {
    render(<ProTip />)
  })

  it('renders Pro Tip text', () => {
    render(<ProTip />)
    expect(screen.getByText(/Pro Tip/)).toBeInTheDocument()
  })

  it('renders subtask guidance text', () => {
    render(<ProTip />)
    expect(screen.getByText(/Break down complex tasks/)).toBeInTheDocument()
  })

  it('renders the tip container with correct styling', () => {
    const { container } = render(<ProTip />)
    const tipDiv = container.firstChild
    expect(tipDiv).toHaveClass('rounded-xl')
    expect(tipDiv.className).toContain('bg-teal-500/10')
    expect(tipDiv.className).toContain('border-teal-500/20')
  })
})