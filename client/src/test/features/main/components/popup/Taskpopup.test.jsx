import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get(_, tag) {
      return ({ children, initial, animate, exit, transition, whileHover,
                whileTap, whileInView, viewport, variants, ...rest }) =>
        <div {...rest}>{children}</div>
    }
  }),
  AnimatePresence: ({ children }) => children,
}))

const mockUseTaskForm = vi.fn()
vi.mock('../../../../../features/main/hook/useTaskForm.js', () => ({
  useTaskForm: (...args) => mockUseTaskForm(...args),
}))

vi.mock('../../../../../common/components/ScrollBar.jsx', () => ({
  default: () => <div data-testid="scrollbar" />,
}))

vi.mock('../../../../../features/main/components/popup/TaskPopupComponents', () => ({
  TaskHeader: ({ levelInfo, onClose, disabled }) => (
    <div data-testid="task-header">
      <span>{levelInfo.label}</span>
      <button onClick={onClose} disabled={disabled}>Close</button>
    </div>
  ),
  BasicInputs: ({ formData, handleChange, errors }) => (
    <div data-testid="basic-inputs">
      <input data-testid="title" value={formData.title} onChange={handleChange} />
    </div>
  ),
  ContextSelectors: () => <div data-testid="context-selectors" />,
  TaskSettings: () => <div data-testid="task-settings" />,
  AssigneeGrid: ({ title }) => <div data-testid={`assignee-grid-${title.replace(/ /g, '-')}`}>{title}</div>,
}))

import { render, screen, fireEvent } from '@testing-library/react'
import TaskPopup from '../../../../../features/main/components/popup/TaskPopup'

const buildHookReturn = (overrides = {}) => ({
  formData: { title: '', description: '', workspace: '', project: '', dueDate: '', isHighPriority: false, assignees: [], assigneesTeams: [] },
  uiState: { isSubmitting: false, isLoadingMembers: false, isLoadingTeams: false, errors: {} },
  data: { filteredProjects: [], availableMembers: [], availableTeams: [] },
  handlers: {
    handleClose: vi.fn(),
    handleChange: vi.fn(),
    handleToggle: vi.fn(),
    handleSubmit: vi.fn(),
  },
  flags: { isGlobal: true, isWorkspace: false, isProject: false },
  ...overrides,
})

describe('TaskPopup', () => {
  beforeEach(() => {
    mockUseTaskForm.mockReturnValue(buildHookReturn())
  })

  // ─── Visibility ───────────────────────────────────────────────────────────────
  describe('visibility', () => {
    it('renders nothing when isOpen=false', () => {
      render(<TaskPopup isOpen={false} />)
      expect(screen.queryByTestId('task-header')).not.toBeInTheDocument()
    })

    it('renders when isOpen=true', () => {
      render(<TaskPopup isOpen={true} />)
      expect(screen.getByTestId('task-header')).toBeInTheDocument()
    })
  })

  // ─── Level Info ────────────────────────────────────────────────────────────────
  describe('level info', () => {
    it('shows Global Task label for global level', () => {
      render(<TaskPopup isOpen={true} level="global" />)
      expect(screen.getByText('Global Task')).toBeInTheDocument()
    })

    it('shows Project Task label when isProject flag is true', () => {
      mockUseTaskForm.mockReturnValue(buildHookReturn({
        flags: { isGlobal: false, isWorkspace: false, isProject: true },
      }))
      render(<TaskPopup isOpen={true} level="project" />)
      expect(screen.getByText('Project Task')).toBeInTheDocument()
    })

    it('shows Workspace Task label when isWorkspace flag is true', () => {
      mockUseTaskForm.mockReturnValue(buildHookReturn({
        flags: { isGlobal: false, isWorkspace: true, isProject: false },
      }))
      render(<TaskPopup isOpen={true} level="workspace" />)
      expect(screen.getByText('Workspace Task')).toBeInTheDocument()
    })
  })

  // ─── Sub-Components ────────────────────────────────────────────────────────────
  describe('sub-components', () => {
    it('renders TaskHeader', () => {
      render(<TaskPopup isOpen={true} />)
      expect(screen.getByTestId('task-header')).toBeInTheDocument()
    })

    it('renders BasicInputs', () => {
      render(<TaskPopup isOpen={true} />)
      expect(screen.getByTestId('basic-inputs')).toBeInTheDocument()
    })

    it('renders ContextSelectors', () => {
      render(<TaskPopup isOpen={true} />)
      expect(screen.getByTestId('context-selectors')).toBeInTheDocument()
    })

    it('renders TaskSettings', () => {
      render(<TaskPopup isOpen={true} />)
      expect(screen.getByTestId('task-settings')).toBeInTheDocument()
    })

    it('renders ScrollBar', () => {
      render(<TaskPopup isOpen={true} />)
      expect(screen.getByTestId('scrollbar')).toBeInTheDocument()
    })
  })

  // ─── Assignee Grids (non-global) ───────────────────────────────────────────────
  describe('assignee grids for non-global tasks', () => {
    beforeEach(() => {
      mockUseTaskForm.mockReturnValue(buildHookReturn({
        flags: { isGlobal: false, isWorkspace: true, isProject: false },
        data: {
          filteredProjects: [],
          availableMembers: [{ id: 'm1', name: 'Alice', avatar: 'AL', role: 'Admin' }],
          availableTeams: [{ id: 't1', name: 'Design' }],
        },
      }))
    })

    it('renders Assign to Members grid', () => {
      render(<TaskPopup isOpen={true} />)
      expect(screen.getByTestId('assignee-grid-Assign-to-Members')).toBeInTheDocument()
    })

    it('renders Assign to Teams grid', () => {
      render(<TaskPopup isOpen={true} />)
      expect(screen.getByTestId('assignee-grid-Assign-to-Teams')).toBeInTheDocument()
    })

    it('renders no-members warning when no members available', () => {
      mockUseTaskForm.mockReturnValue(buildHookReturn({
        flags: { isGlobal: false, isWorkspace: true, isProject: false },
        data: { filteredProjects: [], availableMembers: [], availableTeams: [] },
        uiState: { isSubmitting: false, isLoadingMembers: false, isLoadingTeams: false, errors: {} },
      }))
      render(<TaskPopup isOpen={true} />)
      expect(screen.getByText('No members found')).toBeInTheDocument()
    })
  })

  // ─── Global Task — no assignees ───────────────────────────────────────────────
  describe('global task', () => {
    it('does not render assignee grids for global tasks', () => {
      render(<TaskPopup isOpen={true} />)
      expect(screen.queryByTestId('assignee-grid-Assign-to-Members')).not.toBeInTheDocument()
    })
  })

  // ─── Footer Actions ────────────────────────────────────────────────────────────
  describe('footer actions', () => {
    it('renders Cancel button', () => {
      render(<TaskPopup isOpen={true} />)
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('renders Create Task button', () => {
      render(<TaskPopup isOpen={true} />)
      expect(screen.getByText('Create Task')).toBeInTheDocument()
    })

    it('calls handleClose when Cancel is clicked', () => {
      const handleClose = vi.fn()
      mockUseTaskForm.mockReturnValue(buildHookReturn({
        handlers: { handleClose, handleChange: vi.fn(), handleToggle: vi.fn(), handleSubmit: vi.fn() },
      }))
      render(<TaskPopup isOpen={true} />)
      fireEvent.click(screen.getByText('Cancel'))
      expect(handleClose).toHaveBeenCalled()
    })

    it('calls handleSubmit when Create Task is clicked', () => {
      const handleSubmit = vi.fn()
      mockUseTaskForm.mockReturnValue(buildHookReturn({
        handlers: { handleClose: vi.fn(), handleChange: vi.fn(), handleToggle: vi.fn(), handleSubmit },
      }))
      render(<TaskPopup isOpen={true} />)
      fireEvent.click(screen.getByText('Create Task'))
      expect(handleSubmit).toHaveBeenCalled()
    })

    it('shows Creating... while isSubmitting=true', () => {
      mockUseTaskForm.mockReturnValue(buildHookReturn({
        uiState: { isSubmitting: true, isLoadingMembers: false, isLoadingTeams: false, errors: {} },
      }))
      render(<TaskPopup isOpen={true} />)
      expect(screen.getByText('Creating...')).toBeInTheDocument()
    })
  })

  // ─── Errors ─────────────────────────────────────────────────────────────────────
  describe('error display', () => {
    it('shows fetch error message', () => {
      mockUseTaskForm.mockReturnValue(buildHookReturn({
        uiState: { isSubmitting: false, isLoadingMembers: false, isLoadingTeams: false, errors: { fetch: 'Failed to load' } },
      }))
      render(<TaskPopup isOpen={true} />)
      expect(screen.getByText('Failed to load')).toBeInTheDocument()
    })

    it('shows submit error message', () => {
      mockUseTaskForm.mockReturnValue(buildHookReturn({
        uiState: { isSubmitting: false, isLoadingMembers: false, isLoadingTeams: false, errors: { submit: 'Submit failed' } },
      }))
      render(<TaskPopup isOpen={true} />)
      expect(screen.getByText('Submit failed')).toBeInTheDocument()
    })
  })
})