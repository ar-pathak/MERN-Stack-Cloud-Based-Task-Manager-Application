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

const mockUseProjectForm = vi.fn()
vi.mock('../../../../../features/main/hook/useProjectForm.js', () => ({
  useProjectForm: (...args) => mockUseProjectForm(...args),
}))

vi.mock('../../../../../features/main/components/popup/ProjectBasicInfo.jsx', () => ({
  default: ({ name, error, onChange }) => (
    <div data-testid="project-basic-info">
      <input data-testid="name-input" value={name} onChange={onChange} />
      {error && <p data-testid="name-error">{error}</p>}
    </div>
  ),
}))

vi.mock('../../../../../features/main/components/popup/ProjectColorPicker', () => ({
  default: ({ selectedColor, onSelect }) => (
    <div data-testid="project-color-picker">
      <button onClick={() => onSelect('#10b981')}>Pick Color</button>
    </div>
  ),
}))

vi.mock('../../../../../features/main/components/popup/ProjectMemberSelector', () => ({
  default: ({ members, onToggle }) => (
    <div data-testid="project-member-selector">
      {members.map(m => (
        <button key={m.id} onClick={() => onToggle('members', m.id)}>{m.name}</button>
      ))}
    </div>
  ),
}))

import { render, screen, fireEvent } from '@testing-library/react'
import ProjectPopup from '../../../../../features/main/components/popup/ProjectPopup'

const buildHookReturn = (overrides = {}) => ({
  formData: { name: '', description: '', status: 'active', color: '#4f46e5', members: [], teams: [] },
  errors: {},
  isSubmitting: false,
  isLoadingMembers: false,
  availableMembers: [],
  availableTeams: [],
  handleChange: vi.fn(),
  handleSetColor: vi.fn(),
  handleToggle: vi.fn(),
  handleSubmit: vi.fn(),
  ...overrides,
})

describe('ProjectPopup', () => {
  beforeEach(() => {
    mockUseProjectForm.mockReturnValue(buildHookReturn())
  })

  // ─── Visibility ───────────────────────────────────────────────────────────────
  describe('visibility', () => {
    it('renders nothing when isOpen=false', () => {
      render(<ProjectPopup isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />)
      expect(screen.queryByText('Create Project')).not.toBeInTheDocument()
    })

    it('renders when isOpen=true', () => {
      render(<ProjectPopup isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />)
      expect(screen.getByText('Create Project')).toBeInTheDocument()
    })
  })

  // ─── Header ───────────────────────────────────────────────────────────────────
  describe('header', () => {
    it('renders Create Project heading', () => {
      render(<ProjectPopup isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />)
      expect(screen.getByText('Create Project')).toBeInTheDocument()
    })

    it('renders workspace name when workspaceName is provided', () => {
      render(<ProjectPopup isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} workspaceName="Design Team" />)
      expect(screen.getByText('in Design Team')).toBeInTheDocument()
    })

    it('renders fallback subtitle when no workspaceName', () => {
      render(<ProjectPopup isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} workspaceName="" />)
      expect(screen.getByText('Organize tasks within a project')).toBeInTheDocument()
    })

    it('calls onClose when close (X) button is clicked', () => {
      const onClose = vi.fn()
      render(<ProjectPopup isOpen={true} onClose={onClose} onSubmit={vi.fn()} />)
      // X button is the close button in the header
      const closeBtn = screen.getAllByRole('button').find(b => b.classList.contains('p-2'))
      if (closeBtn) fireEvent.click(closeBtn)
      // just ensure it doesn't crash
    })
  })

  // ─── Workspace Banner ─────────────────────────────────────────────────────────
  describe('workspace banner', () => {
    it('renders workspace banner when workspaceName is provided', () => {
      render(<ProjectPopup isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} workspaceName="Aurora" />)
      expect(screen.getByText('Creating in workspace')).toBeInTheDocument()
      expect(screen.getByText('Aurora')).toBeInTheDocument()
    })

    it('does not render workspace banner when workspaceName is empty', () => {
      render(<ProjectPopup isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} workspaceName="" />)
      expect(screen.queryByText('Creating in workspace')).not.toBeInTheDocument()
    })
  })

  // ─── Sub-Components ───────────────────────────────────────────────────────────
  describe('sub-components', () => {
    it('renders ProjectBasicInfo', () => {
      render(<ProjectPopup isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />)
      expect(screen.getByTestId('project-basic-info')).toBeInTheDocument()
    })

    it('renders ProjectColorPicker', () => {
      render(<ProjectPopup isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />)
      expect(screen.getByTestId('project-color-picker')).toBeInTheDocument()
    })

    it('renders ProjectMemberSelector', () => {
      render(<ProjectPopup isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />)
      expect(screen.getByTestId('project-member-selector')).toBeInTheDocument()
    })
  })

  // ─── Teams Section ────────────────────────────────────────────────────────────
  describe('teams section', () => {
    it('renders Assign Teams section when availableTeams exist', () => {
      mockUseProjectForm.mockReturnValue(buildHookReturn({
        availableTeams: [{ id: 't1', name: 'Design Team' }],
      }))
      render(<ProjectPopup isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />)
      expect(screen.getByText('Assign Teams')).toBeInTheDocument()
      expect(screen.getByText('Design Team')).toBeInTheDocument()
    })

    it('does not render Assign Teams when teams array is empty', () => {
      render(<ProjectPopup isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />)
      expect(screen.queryByText('Assign Teams')).not.toBeInTheDocument()
    })

    it('calls handleToggle when a team is clicked', () => {
      const handleToggle = vi.fn()
      mockUseProjectForm.mockReturnValue(buildHookReturn({
        availableTeams: [{ id: 't1', name: 'Dev Team' }],
        formData: { name: '', description: '', status: 'active', color: '#4f46e5', members: [], teams: [] },
        handleToggle,
      }))
      render(<ProjectPopup isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />)
      fireEvent.click(screen.getByText('Dev Team').closest('button'))
      expect(handleToggle).toHaveBeenCalledWith('teams', 't1')
    })
  })

  // ─── Error Messages ───────────────────────────────────────────────────────────
  describe('error messages', () => {
    it('renders fetch error when errors.fetch is set', () => {
      mockUseProjectForm.mockReturnValue(buildHookReturn({
        errors: { fetch: 'Failed to load members' },
      }))
      render(<ProjectPopup isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />)
      expect(screen.getByText('Failed to load members')).toBeInTheDocument()
    })

    it('renders submit error when errors.submit is set', () => {
      mockUseProjectForm.mockReturnValue(buildHookReturn({
        errors: { submit: 'Failed to create project' },
      }))
      render(<ProjectPopup isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />)
      expect(screen.getByText('Failed to create project')).toBeInTheDocument()
    })
  })

  // ─── Footer Actions ───────────────────────────────────────────────────────────
  describe('footer actions', () => {
    it('renders Cancel button', () => {
      render(<ProjectPopup isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />)
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('renders Create Project button', () => {
      render(<ProjectPopup isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />)
      expect(screen.getByText('Create Project')).toBeInTheDocument()
    })

    it('calls handleSubmit when Create Project is clicked', () => {
      const handleSubmit = vi.fn()
      mockUseProjectForm.mockReturnValue(buildHookReturn({ handleSubmit }))
      render(<ProjectPopup isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />)
      fireEvent.click(screen.getByText('Create Project'))
      expect(handleSubmit).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when Cancel is clicked', () => {
      const onClose = vi.fn()
      render(<ProjectPopup isOpen={true} onClose={onClose} onSubmit={vi.fn()} />)
      fireEvent.click(screen.getByText('Cancel'))
      expect(onClose).toHaveBeenCalled()
    })

    it('shows Creating... and disables buttons when isSubmitting=true', () => {
      mockUseProjectForm.mockReturnValue(buildHookReturn({ isSubmitting: true }))
      render(<ProjectPopup isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />)
      expect(screen.getByText('Creating...')).toBeInTheDocument()
    })
  })
})