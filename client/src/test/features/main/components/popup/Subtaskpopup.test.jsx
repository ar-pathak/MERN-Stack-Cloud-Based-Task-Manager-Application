import { vi, describe, it, expect,beforeEach } from 'vitest'

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

const mockUseSubtaskForm = vi.fn()

vi.mock('../../../../../features/main/hook/useSubtaskForm.js', () => ({
  useSubtaskForm: (...args) => mockUseSubtaskForm(...args),
}))

vi.mock('../../../../../features/main/components/popup/SubtaskComponents', () => ({
  SubtaskHeader: ({ taskTitle, onClose, disabled }) => (
    <div data-testid="subtask-header">
      <span>{taskTitle}</span>
      <button onClick={onClose} disabled={disabled}>Close</button>
    </div>
  ),
  SubtaskInputs: ({ formData, handleChange, errors }) => (
    <div data-testid="subtask-inputs">
      <input data-testid="title-input" value={formData.title} onChange={handleChange} />
      {errors.title && <p data-testid="title-error">{errors.title}</p>}
    </div>
  ),
  AssigneeSelector: ({ assignees, selectedId, onSelect, isLoading }) => (
    <div data-testid="assignee-selector">
      {isLoading && <span>Loading...</span>}
      {assignees.map(a => (
        <button key={a.id} onClick={() => onSelect(a.id)}>{a.name}</button>
      ))}
    </div>
  ),
  ProTip: () => <div data-testid="pro-tip">Pro Tip</div>,
}))

import { render, screen, fireEvent } from '@testing-library/react'
import SubtaskPopup from '../../../../../features/main/components/popup/SubtaskPopup'

const buildHookReturn = (overrides = {}) => ({
  formData: { title: '', description: '', dueDate: '', assignedTo: '' },
  uiState: { isSubmitting: false, isLoadingTask: false, errors: {} },
  data: { availableAssignees: [] },
  handlers: {
    handleClose: vi.fn(),
    handleChange: vi.fn(),
    handleAssigneeSelect: vi.fn(),
    handleSubmit: vi.fn(),
  },
  ...overrides,
})

describe('SubtaskPopup', () => {
  beforeEach(() => {
    mockUseSubtaskForm.mockReturnValue(buildHookReturn())
  })

  // ─── Visibility ───────────────────────────────────────────────────────────────
  describe('visibility', () => {
    it('renders nothing when isOpen=false', () => {
      render(<SubtaskPopup isOpen={false} taskTitle="My Task" />)
      expect(screen.queryByTestId('subtask-header')).not.toBeInTheDocument()
    })

    it('renders when isOpen=true', () => {
      render(<SubtaskPopup isOpen={true} taskTitle="My Task" />)
      expect(screen.getByTestId('subtask-header')).toBeInTheDocument()
    })
  })

  // ─── Sub-Components ───────────────────────────────────────────────────────────
  describe('sub-components rendered', () => {
    it('renders SubtaskHeader', () => {
      render(<SubtaskPopup isOpen={true} taskTitle="Fix Bug" />)
      expect(screen.getByTestId('subtask-header')).toBeInTheDocument()
    })

    it('passes taskTitle to SubtaskHeader', () => {
      render(<SubtaskPopup isOpen={true} taskTitle="Fix Bug" />)
      expect(screen.getByText('Fix Bug')).toBeInTheDocument()
    })

    it('renders SubtaskInputs', () => {
      render(<SubtaskPopup isOpen={true} taskTitle="Fix Bug" />)
      expect(screen.getByTestId('subtask-inputs')).toBeInTheDocument()
    })

    it('renders AssigneeSelector', () => {
      render(<SubtaskPopup isOpen={true} taskTitle="Fix Bug" />)
      expect(screen.getByTestId('assignee-selector')).toBeInTheDocument()
    })

    it('renders ProTip', () => {
      render(<SubtaskPopup isOpen={true} taskTitle="Fix Bug" />)
      expect(screen.getByTestId('pro-tip')).toBeInTheDocument()
    })
  })

  // ─── Footer Actions ───────────────────────────────────────────────────────────
  describe('footer actions', () => {
    it('renders Cancel button', () => {
      render(<SubtaskPopup isOpen={true} taskTitle="Bug" />)
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('renders Create Subtask button', () => {
      render(<SubtaskPopup isOpen={true} taskTitle="Bug" />)
      expect(screen.getByText('Create Subtask')).toBeInTheDocument()
    })

    it('calls handleClose when Cancel is clicked', () => {
      const handleClose = vi.fn()
      mockUseSubtaskForm.mockReturnValue(buildHookReturn({
        handlers: { handleClose, handleChange: vi.fn(), handleAssigneeSelect: vi.fn(), handleSubmit: vi.fn() },
      }))
      render(<SubtaskPopup isOpen={true} taskTitle="Bug" />)
      fireEvent.click(screen.getByText('Cancel'))
      expect(handleClose).toHaveBeenCalled()
    })

    it('calls handleSubmit when Create Subtask is clicked', () => {
      const handleSubmit = vi.fn()
      mockUseSubtaskForm.mockReturnValue(buildHookReturn({
        handlers: { handleClose: vi.fn(), handleChange: vi.fn(), handleAssigneeSelect: vi.fn(), handleSubmit },
      }))
      render(<SubtaskPopup isOpen={true} taskTitle="Bug" />)
      fireEvent.click(screen.getByText('Create Subtask'))
      expect(handleSubmit).toHaveBeenCalled()
    })

    it('shows Creating... while isSubmitting=true', () => {
      mockUseSubtaskForm.mockReturnValue(buildHookReturn({
        uiState: { isSubmitting: true, isLoadingTask: false, errors: {} },
      }))
      render(<SubtaskPopup isOpen={true} taskTitle="Bug" />)
      expect(screen.getByText('Creating...')).toBeInTheDocument()
    })

    it('disables Cancel and Create buttons while submitting', () => {
      mockUseSubtaskForm.mockReturnValue(buildHookReturn({
        uiState: { isSubmitting: true, isLoadingTask: false, errors: {} },
      }))
      render(<SubtaskPopup isOpen={true} taskTitle="Bug" />)
      screen.getAllByRole('button').forEach(btn => {
        if (btn.textContent === 'Cancel' || btn.textContent === 'Creating...') {
          expect(btn).toBeDisabled()
        }
      })
    })
  })

  // ─── Submit Error ─────────────────────────────────────────────────────────────
  describe('submit error', () => {
    it('renders submit error when errors.submit is set', () => {
      mockUseSubtaskForm.mockReturnValue(buildHookReturn({
        uiState: { isSubmitting: false, isLoadingTask: false, errors: { submit: 'Something went wrong' } },
      }))
      render(<SubtaskPopup isOpen={true} taskTitle="Bug" />)
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('does not show error when errors.submit is empty', () => {
      render(<SubtaskPopup isOpen={true} taskTitle="Bug" />)
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })
  })

  // ─── Backdrop Click ───────────────────────────────────────────────────────────
  describe('backdrop click', () => {
    it('calls handleClose when backdrop is clicked', () => {
      const handleClose = vi.fn()
      mockUseSubtaskForm.mockReturnValue(buildHookReturn({
        handlers: { handleClose, handleChange: vi.fn(), handleAssigneeSelect: vi.fn(), handleSubmit: vi.fn() },
      }))
      const { container } = render(<SubtaskPopup isOpen={true} taskTitle="Bug" />)
      const backdrop = container.querySelector('.absolute.inset-0.bg-black\\/60')
      if (backdrop) fireEvent.click(backdrop)
      expect(handleClose).toHaveBeenCalled()
    })
  })

  // ─── Assignees Passed ────────────────────────────────────────────────────────
  describe('assignees rendering', () => {
    it('passes assignees to AssigneeSelector', () => {
      mockUseSubtaskForm.mockReturnValue(buildHookReturn({
        data: {
          availableAssignees: [
            { id: 'a1', name: 'Alice', avatar: 'AL', email: 'alice@test.com' },
          ],
        },
      }))
      render(<SubtaskPopup isOpen={true} taskTitle="Bug" />)
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })
  })
})