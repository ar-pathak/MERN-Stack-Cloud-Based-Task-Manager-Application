import { vi, describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  TaskHeader,
  BasicInputs,
  ContextSelectors,
  TaskSettings,
  AssigneeGrid,
} from '../../../../../features/main/components/popup/TaskPopupComponents'

// ─── TaskHeader ───────────────────────────────────────────────────────────────

describe('TaskHeader', () => {
  const FakeIcon = (props) => <svg data-testid="level-icon" {...props} />
  const levelInfo = {
    icon: FakeIcon,
    color: 'green',
    label: 'Global Task',
    description: 'Create a personal task',
  }

  const defaultProps = { levelInfo, onClose: vi.fn(), disabled: false }

  it('renders the level label', () => {
    render(<TaskHeader {...defaultProps} />)
    expect(screen.getByText('Global Task')).toBeInTheDocument()
  })

  it('renders the level description', () => {
    render(<TaskHeader {...defaultProps} />)
    expect(screen.getByText('Create a personal task')).toBeInTheDocument()
  })

  it('renders the close button', () => {
    render(<TaskHeader {...defaultProps} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<TaskHeader {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('disables close button when disabled=true', () => {
    render(<TaskHeader {...defaultProps} disabled={true} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('renders the level icon', () => {
    render(<TaskHeader {...defaultProps} />)
    expect(screen.getByTestId('level-icon')).toBeInTheDocument()
  })
})

// ─── BasicInputs ─────────────────────────────────────────────────────────────

describe('BasicInputs', () => {
  const defaultProps = {
    formData: { title: '', description: '' },
    handleChange: vi.fn(),
    errors: {},
    disabled: false,
  }

  it('renders Task Title label', () => {
    render(<BasicInputs {...defaultProps} />)
    expect(screen.getByText('Task Title')).toBeInTheDocument()
  })

  it('renders Description label', () => {
    render(<BasicInputs {...defaultProps} />)
    expect(screen.getByText('Description')).toBeInTheDocument()
  })

  it('renders title input with value', () => {
    render(<BasicInputs {...defaultProps} formData={{ title: 'My task', description: '' }} />)
    expect(screen.getByDisplayValue('My task')).toBeInTheDocument()
  })

  it('renders description textarea with value', () => {
    render(<BasicInputs {...defaultProps} formData={{ title: '', description: 'Task detail' }} />)
    expect(screen.getByDisplayValue('Task detail')).toBeInTheDocument()
  })

  it('shows title error when errors.title is set', () => {
    render(<BasicInputs {...defaultProps} errors={{ title: 'Title required' }} />)
    expect(screen.getByText('Title required')).toBeInTheDocument()
  })

  it('does not show error when no errors', () => {
    render(<BasicInputs {...defaultProps} />)
    expect(screen.queryByText('Title required')).not.toBeInTheDocument()
  })

  it('applies error border class to title input when error exists', () => {
    render(<BasicInputs {...defaultProps} errors={{ title: 'Required' }} />)
    const input = screen.getByPlaceholderText('e.g., Design system audit')
    expect(input.className).toContain('border-rose-500/50')
  })

  it('calls handleChange when title input changes', () => {
    const handleChange = vi.fn()
    render(<BasicInputs {...defaultProps} handleChange={handleChange} />)
    fireEvent.change(screen.getByPlaceholderText('e.g., Design system audit'), {
      target: { value: 'Updated' },
    })
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('calls handleChange when description textarea changes', () => {
    const handleChange = vi.fn()
    render(<BasicInputs {...defaultProps} handleChange={handleChange} />)
    fireEvent.change(screen.getByPlaceholderText('Describe the task details...'), {
      target: { value: 'Details' },
    })
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('disables inputs when disabled=true', () => {
    render(<BasicInputs {...defaultProps} disabled={true} />)
    screen.getAllByRole('textbox').forEach(el => expect(el).toBeDisabled())
  })
})

// ─── ContextSelectors ────────────────────────────────────────────────────────

describe('ContextSelectors', () => {
  const mockWorkspaces = [
    { id: 'ws1', name: 'Design' },
    { id: 'ws2', name: 'Engineering' },
  ]
  const mockProjects = [
    { id: 'p1', name: 'Aurora App' },
    { id: 'p2', name: 'Dashboard' },
  ]

  it('renders nothing when not global and not workspace level', () => {
    const { container } = render(
      <ContextSelectors
        flags={{ isGlobal: false, isWorkspace: false }}
        workspaces={[]}
        filteredProjects={[]}
        formData={{ workspace: '', project: '' }}
        handleChange={vi.fn()}
        disabled={false}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders Workspace select when isGlobal=true', () => {
    render(
      <ContextSelectors
        flags={{ isGlobal: true, isWorkspace: false }}
        workspaces={mockWorkspaces}
        filteredProjects={[]}
        formData={{ workspace: '', project: '' }}
        handleChange={vi.fn()}
        disabled={false}
      />
    )
    expect(screen.getByText('Workspace')).toBeInTheDocument()
  })

  it('renders workspace options when isGlobal=true', () => {
    render(
      <ContextSelectors
        flags={{ isGlobal: true, isWorkspace: false }}
        workspaces={mockWorkspaces}
        filteredProjects={[]}
        formData={{ workspace: '', project: '' }}
        handleChange={vi.fn()}
        disabled={false}
      />
    )
    expect(screen.getByRole('option', { name: 'Design' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Engineering' })).toBeInTheDocument()
  })

  it('renders Project select in all cases', () => {
    render(
      <ContextSelectors
        flags={{ isGlobal: false, isWorkspace: true }}
        workspaces={[]}
        filteredProjects={mockProjects}
        formData={{ workspace: 'ws1', project: '' }}
        handleChange={vi.fn()}
        disabled={false}
      />
    )
    expect(screen.getByText('Project')).toBeInTheDocument()
  })

  it('renders project options', () => {
    render(
      <ContextSelectors
        flags={{ isGlobal: false, isWorkspace: true }}
        workspaces={[]}
        filteredProjects={mockProjects}
        formData={{ workspace: 'ws1', project: '' }}
        handleChange={vi.fn()}
        disabled={false}
      />
    )
    expect(screen.getByRole('option', { name: 'Aurora App' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('calls handleChange when workspace select changes', () => {
    const handleChange = vi.fn()
    render(
      <ContextSelectors
        flags={{ isGlobal: true, isWorkspace: false }}
        workspaces={mockWorkspaces}
        filteredProjects={[]}
        formData={{ workspace: '', project: '' }}
        handleChange={handleChange}
        disabled={false}
      />
    )
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'ws1' } })
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('disables project select when isGlobal and no workspace selected', () => {
    render(
      <ContextSelectors
        flags={{ isGlobal: true, isWorkspace: false }}
        workspaces={mockWorkspaces}
        filteredProjects={[]}
        formData={{ workspace: '', project: '' }}
        handleChange={vi.fn()}
        disabled={false}
      />
    )
    const selects = screen.getAllByRole('combobox')
    const projectSelect = selects[1]
    expect(projectSelect).toBeDisabled()
  })
})

// ─── TaskSettings ─────────────────────────────────────────────────────────────

describe('TaskSettings', () => {
  const defaultProps = {
    formData: { dueDate: '', isHighPriority: false },
    handleChange: vi.fn(),
    disabled: false,
  }

  it('renders Due Date label', () => {
    render(<TaskSettings {...defaultProps} />)
    expect(screen.getByText('Due Date')).toBeInTheDocument()
  })

  it('renders High Priority label', () => {
    render(<TaskSettings {...defaultProps} />)
    expect(screen.getByText('High Priority')).toBeInTheDocument()
  })

  it('renders High Priority description', () => {
    render(<TaskSettings {...defaultProps} />)
    expect(screen.getByText('Mark this task as urgent')).toBeInTheDocument()
  })

  it('due date input accepts a date value', () => {
    render(<TaskSettings {...defaultProps} formData={{ dueDate: '2025-12-31', isHighPriority: false }} />)
    expect(screen.getByDisplayValue('2025-12-31')).toBeInTheDocument()
  })

  it('isHighPriority checkbox is unchecked when false', () => {
    render(<TaskSettings {...defaultProps} />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()
  })

  it('isHighPriority checkbox is checked when true', () => {
    render(<TaskSettings {...defaultProps} formData={{ dueDate: '', isHighPriority: true }} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('calls handleChange when due date changes', () => {
    const handleChange = vi.fn()
    render(<TaskSettings {...defaultProps} handleChange={handleChange} />)
    fireEvent.change(screen.getByDisplayValue(''), { target: { value: '2025-01-01' } })
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('calls handleChange when priority toggle changes', () => {
    const handleChange = vi.fn()
    render(<TaskSettings {...defaultProps} handleChange={handleChange} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('disables checkbox when disabled=true', () => {
    render(<TaskSettings {...defaultProps} disabled={true} />)
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })
})

// ─── AssigneeGrid ─────────────────────────────────────────────────────────────

describe('AssigneeGrid', () => {
  const mockMembers = [
    { id: 'm1', name: 'Alice', avatar: 'AL', role: 'Admin' },
    { id: 'm2', name: 'Bob', avatar: 'BO', role: 'Member' },
  ]
  const mockTeams = [
    { id: 't1', name: 'Design Team' },
    { id: 't2', name: 'Dev Team' },
  ]

  it('renders nothing when items array is empty', () => {
    const { container } = render(
      <AssigneeGrid title="Members" items={[]} selected={[]} onToggle={vi.fn()} type="member" disabled={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders title', () => {
    render(<AssigneeGrid title="Assign to Members" items={mockMembers} selected={[]} onToggle={vi.fn()} type="member" disabled={false} />)
    expect(screen.getByText('Assign to Members')).toBeInTheDocument()
  })

  it('renders all member names', () => {
    render(<AssigneeGrid title="Members" items={mockMembers} selected={[]} onToggle={vi.fn()} type="member" disabled={false} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('renders member roles', () => {
    render(<AssigneeGrid title="Members" items={mockMembers} selected={[]} onToggle={vi.fn()} type="member" disabled={false} />)
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('Member')).toBeInTheDocument()
  })

  it('renders member avatars', () => {
    render(<AssigneeGrid title="Members" items={mockMembers} selected={[]} onToggle={vi.fn()} type="member" disabled={false} />)
    expect(screen.getByText('AL')).toBeInTheDocument()
    expect(screen.getByText('BO')).toBeInTheDocument()
  })

  it('calls onToggle with "assignees" for member type', () => {
    const onToggle = vi.fn()
    render(<AssigneeGrid title="Members" items={mockMembers} selected={[]} onToggle={onToggle} type="member" disabled={false} />)
    fireEvent.click(screen.getByText('Alice').closest('button'))
    expect(onToggle).toHaveBeenCalledWith('assignees', 'm1')
  })

  it('calls onToggle with "assigneesTeams" for team type', () => {
    const onToggle = vi.fn()
    render(<AssigneeGrid title="Teams" items={mockTeams} selected={[]} onToggle={onToggle} type="team" disabled={false} />)
    fireEvent.click(screen.getByText('Design Team').closest('button'))
    expect(onToggle).toHaveBeenCalledWith('assigneesTeams', 't1')
  })

  it('applies selected style to selected member', () => {
    render(<AssigneeGrid title="Members" items={mockMembers} selected={['m1']} onToggle={vi.fn()} type="member" disabled={false} />)
    const aliceBtn = screen.getByText('Alice').closest('button')
    expect(aliceBtn.className).toContain('bg-green-500/10')
    expect(aliceBtn.className).toContain('border-green-500/30')
  })

  it('applies selected style to selected team', () => {
    render(<AssigneeGrid title="Teams" items={mockTeams} selected={['t1']} onToggle={vi.fn()} type="team" disabled={false} />)
    const teamBtn = screen.getByText('Design Team').closest('button')
    expect(teamBtn.className).toContain('bg-purple-500/10')
    expect(teamBtn.className).toContain('border-purple-500/30')
  })

  it('disables all buttons when disabled=true', () => {
    render(<AssigneeGrid title="Members" items={mockMembers} selected={[]} onToggle={vi.fn()} type="member" disabled={true} />)
    screen.getAllByRole('button').forEach(btn => expect(btn).toBeDisabled())
  })

  it('renders team names', () => {
    render(<AssigneeGrid title="Teams" items={mockTeams} selected={[]} onToggle={vi.fn()} type="team" disabled={false} />)
    expect(screen.getByText('Design Team')).toBeInTheDocument()
    expect(screen.getByText('Dev Team')).toBeInTheDocument()
  })
})