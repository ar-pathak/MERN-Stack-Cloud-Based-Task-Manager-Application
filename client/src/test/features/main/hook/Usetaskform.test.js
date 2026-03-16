import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

vi.mock('../../../../service/task.service', () => ({
  createGlobalTask: vi.fn(),
  createWorkspaceTask: vi.fn(),
  createProjectTask: vi.fn(),
}))
vi.mock('../../../../service/workspace.service', () => ({
  getWorkspaceMembers: vi.fn(),
}))
vi.mock('../../../../service/project.service', () => ({
  getProjectById: vi.fn(),
}))
vi.mock('../../../../service/team.service', () => ({
  getTeamsByWorkspace: vi.fn(),
}))

import { useTaskForm } from '../../../../features/main/hook/useTaskForm'
import { createGlobalTask, createWorkspaceTask, createProjectTask } from '../../../../service/task.service'
import { getWorkspaceMembers } from '../../../../service/workspace.service'
import { getProjectById } from '../../../../service/project.service'
import { getTeamsByWorkspace } from '../../../../service/team.service'

// ── Fixtures ──────────────────────────────────────────────────────────────────
const WS_ID = 'ws-001'
const PROJ_ID = 'proj-001'

const mockMembers = [
  { user: { _id: 'u1', name: 'Alice', email: 'alice@test.com' }, role: 'admin' },
  { user: { _id: 'u2', name: 'Bob', email: 'bob@test.com' }, role: 'member' },
]
const mockTeams = [
  { _id: 't1', name: 'Design' },
  { _id: 't2', name: 'Dev' },
]
const mockProject = {
  members: mockMembers,
  teams: [{ _id: 't1', name: 'Design' }],
}

const globalProps = {
  isOpen: false,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
  level: 'global',
  workspaceId: null,
  projectId: null,
  projects: [],
}

const workspaceProps = {
  ...globalProps,
  level: 'workspace',
  workspaceId: WS_ID,
}

const projectProps = {
  ...globalProps,
  level: 'project',
  workspaceId: WS_ID,
  projectId: PROJ_ID,
}

describe('useTaskForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getWorkspaceMembers.mockResolvedValue(mockMembers)
    getTeamsByWorkspace.mockResolvedValue(mockTeams)
    getProjectById.mockResolvedValue(mockProject)
    createGlobalTask.mockResolvedValue({ _id: 'new-task' })
    createWorkspaceTask.mockResolvedValue({ _id: 'new-task' })
    createProjectTask.mockResolvedValue({ _id: 'new-task' })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Initial state
  // ────────────────────────────────────────────────────────────────────────────
  describe('initial state', () => {
    it('initialises formData with correct defaults', () => {
      const { result } = renderHook(() => useTaskForm(globalProps))
      expect(result.current.formData).toEqual(expect.objectContaining({
        title: '',
        description: '',
        assignees: [],
        assigneesTeams: [],
        isHighPriority: false,
        dueDate: '',
        status: 'active',
      }))
    })

    it('initialises workspace from workspaceId prop', () => {
      const { result } = renderHook(() => useTaskForm(workspaceProps))
      expect(result.current.formData.workspace).toBe(WS_ID)
    })

    it('initialises project from projectId prop', () => {
      const { result } = renderHook(() => useTaskForm(projectProps))
      expect(result.current.formData.project).toBe(PROJ_ID)
    })

    it('initialises uiState with correct defaults', () => {
      const { result } = renderHook(() => useTaskForm(globalProps))
      expect(result.current.uiState).toEqual({
        isSubmitting: false,
        isLoadingMembers: false,
        isLoadingTeams: false,
        errors: {},
      })
    })

    it('initialises data with empty arrays', () => {
      const { result } = renderHook(() => useTaskForm(globalProps))
      expect(result.current.data.availableMembers).toEqual([])
      expect(result.current.data.availableTeams).toEqual([])
      expect(result.current.data.filteredProjects).toEqual([])
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Flags
  // ────────────────────────────────────────────────────────────────────────────
  describe('flags', () => {
    it('flags.isGlobal is true when level="global"', () => {
      const { result } = renderHook(() => useTaskForm(globalProps))
      expect(result.current.flags.isGlobal).toBe(true)
      expect(result.current.flags.isWorkspace).toBe(false)
      expect(result.current.flags.isProject).toBe(false)
    })

    it('flags.isWorkspace is true when level="workspace"', () => {
      const { result } = renderHook(() => useTaskForm(workspaceProps))
      expect(result.current.flags.isWorkspace).toBe(true)
      expect(result.current.flags.isGlobal).toBe(false)
      expect(result.current.flags.isProject).toBe(false)
    })

    it('flags.isProject is true when level="project"', () => {
      const { result } = renderHook(() => useTaskForm(projectProps))
      expect(result.current.flags.isProject).toBe(true)
      expect(result.current.flags.isGlobal).toBe(false)
      expect(result.current.flags.isWorkspace).toBe(false)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Reset on open
  // ────────────────────────────────────────────────────────────────────────────
  describe('reset on open', () => {
    it('resets title and description when isOpen becomes true', async () => {
      const { result, rerender } = renderHook(
        (props) => useTaskForm(props),
        { initialProps: globalProps }
      )
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'Old title', type: 'text' } })
      })
      rerender({ ...globalProps, isOpen: true })
      await waitFor(() => expect(result.current.formData.title).toBe(''))
    })

    it('clears errors when isOpen becomes true', async () => {
      const { result, rerender } = renderHook(
        (props) => useTaskForm(props),
        { initialProps: globalProps }
      )
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(result.current.uiState.errors.title).toBeDefined()

      rerender({ ...globalProps, isOpen: true })
      await waitFor(() => expect(result.current.uiState.errors).toEqual({}))
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Context fetch on open
  // ────────────────────────────────────────────────────────────────────────────
  describe('context fetch on open', () => {
    it('fetches workspace members when level=workspace and isOpen=true', async () => {
      renderHook(() => useTaskForm({ ...workspaceProps, isOpen: true }))
      await waitFor(() =>
        expect(getWorkspaceMembers).toHaveBeenCalledWith(WS_ID)
      )
    })

    it('fetches workspace teams when level=workspace and isOpen=true', async () => {
      renderHook(() => useTaskForm({ ...workspaceProps, isOpen: true }))
      await waitFor(() =>
        expect(getTeamsByWorkspace).toHaveBeenCalledWith(WS_ID)
      )
    })

    it('populates availableMembers from workspace fetch', async () => {
      const { result } = renderHook(() =>
        useTaskForm({ ...workspaceProps, isOpen: true })
      )
      await waitFor(() =>
        expect(result.current.data.availableMembers).toHaveLength(2)
      )
      expect(result.current.data.availableMembers[0]).toMatchObject({
        id: 'u1',
        name: 'Alice',
        avatar: 'AL',
      })
    })

    it('populates availableTeams from workspace fetch', async () => {
      const { result } = renderHook(() =>
        useTaskForm({ ...workspaceProps, isOpen: true })
      )
      await waitFor(() =>
        expect(result.current.data.availableTeams).toHaveLength(2)
      )
      expect(result.current.data.availableTeams[0]).toEqual({ id: 't1', name: 'Design' })
    })

    it('fetches project members when level=project and isOpen=true', async () => {
      renderHook(() => useTaskForm({ ...projectProps, isOpen: true }))
      await waitFor(() =>
        expect(getProjectById).toHaveBeenCalledWith(WS_ID, PROJ_ID)
      )
    })

    it('does NOT fetch members for global level (keeps empty arrays)', async () => {
      const { result } = renderHook(() =>
        useTaskForm({ ...globalProps, isOpen: true })
      )
      await waitFor(() => {}) // let effects settle
      expect(getWorkspaceMembers).not.toHaveBeenCalled()
      expect(result.current.data.availableMembers).toEqual([])
    })

    it('filters projects by workspaceId for workspace level', async () => {
      const projects = [
        { id: 'p1', name: 'P1', workspace: WS_ID },
        { id: 'p2', name: 'P2', workspace: 'other-ws' },
      ]
      const { result } = renderHook(() =>
        useTaskForm({ ...workspaceProps, isOpen: true, projects })
      )
      await waitFor(() =>
        expect(result.current.data.filteredProjects).toHaveLength(1)
      )
      expect(result.current.data.filteredProjects[0].id).toBe('p1')
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // handleChange
  // ────────────────────────────────────────────────────────────────────────────
  describe('handlers.handleChange', () => {
    it('updates formData.title', () => {
      const { result } = renderHook(() => useTaskForm(globalProps))
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'My Task', type: 'text' } })
      })
      expect(result.current.formData.title).toBe('My Task')
    })

    it('updates isHighPriority via checkbox', () => {
      const { result } = renderHook(() => useTaskForm(globalProps))
      act(() => {
        result.current.handlers.handleChange({
          target: { name: 'isHighPriority', value: 'on', type: 'checkbox', checked: true },
        })
      })
      expect(result.current.formData.isHighPriority).toBe(true)
    })

    it('updates formData.dueDate', () => {
      const { result } = renderHook(() => useTaskForm(globalProps))
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'dueDate', value: '2025-12-31', type: 'date' } })
      })
      expect(result.current.formData.dueDate).toBe('2025-12-31')
    })

    it('clears the matching field error on change', async () => {
      const { result } = renderHook(() => useTaskForm(globalProps))
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(result.current.uiState.errors.title).toBeDefined()
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'Fix', type: 'text' } })
      })
      expect(result.current.uiState.errors.title).toBeNull()
    })

    it('triggers workspace member fetch when workspace changes in global mode', async () => {
      const { result } = renderHook(() =>
        useTaskForm({ ...globalProps, isOpen: true })
      )
      act(() => {
        result.current.handlers.handleChange({
          target: { name: 'workspace', value: WS_ID, type: 'text' },
        })
      })
      await waitFor(() => expect(getWorkspaceMembers).toHaveBeenCalledWith(WS_ID))
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // handleToggle
  // ────────────────────────────────────────────────────────────────────────────
  describe('handlers.handleToggle', () => {
    it('adds an id to assignees', () => {
      const { result } = renderHook(() => useTaskForm(globalProps))
      act(() => { result.current.handlers.handleToggle('assignees', 'u1') })
      expect(result.current.formData.assignees).toContain('u1')
    })

    it('removes an id from assignees when toggled again', () => {
      const { result } = renderHook(() => useTaskForm(globalProps))
      act(() => { result.current.handlers.handleToggle('assignees', 'u1') })
      act(() => { result.current.handlers.handleToggle('assignees', 'u1') })
      expect(result.current.formData.assignees).not.toContain('u1')
    })

    it('adds an id to assigneesTeams', () => {
      const { result } = renderHook(() => useTaskForm(globalProps))
      act(() => { result.current.handlers.handleToggle('assigneesTeams', 't1') })
      expect(result.current.formData.assigneesTeams).toContain('t1')
    })

    it('toggles multiple ids independently', () => {
      const { result } = renderHook(() => useTaskForm(globalProps))
      act(() => { result.current.handlers.handleToggle('assignees', 'u1') })
      act(() => { result.current.handlers.handleToggle('assignees', 'u2') })
      expect(result.current.formData.assignees).toEqual(['u1', 'u2'])
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // validate
  // ────────────────────────────────────────────────────────────────────────────
  describe('validation', () => {
    it('sets errors.title when title is empty', async () => {
      const { result } = renderHook(() => useTaskForm(globalProps))
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(result.current.uiState.errors.title).toBe('Task title is required')
    })

    it('sets errors.workspace when level=workspace and workspace is empty', async () => {
      const { result } = renderHook(() =>
        useTaskForm({ ...workspaceProps, workspaceId: '' })
      )
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'T', type: 'text' } })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(result.current.uiState.errors.workspace).toBe('Workspace is required')
    })

    it('sets errors.project when level=project and project is empty', async () => {
      const { result } = renderHook(() =>
        useTaskForm({ ...projectProps, projectId: '' })
      )
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'T', type: 'text' } })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(result.current.uiState.errors.project).toBe('Project is required')
    })

    it('does not call any create service when validation fails', async () => {
      const { result } = renderHook(() => useTaskForm(globalProps))
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(createGlobalTask).not.toHaveBeenCalled()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // handleSubmit — success (global)
  // ────────────────────────────────────────────────────────────────────────────
  describe('handleSubmit — global task creation', () => {
    it('calls createGlobalTask for level=global', async () => {
      const { result } = renderHook(() =>
        useTaskForm({ ...globalProps, isOpen: true })
      )
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'Global Task', type: 'text' } })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(createGlobalTask).toHaveBeenCalled()
      expect(createWorkspaceTask).not.toHaveBeenCalled()
      expect(createProjectTask).not.toHaveBeenCalled()
    })

    it('payload contains trimmed title', async () => {
      const { result } = renderHook(() => useTaskForm({ ...globalProps, isOpen: true }))
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: '  My Task  ', type: 'text' } })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      const payload = createGlobalTask.mock.calls[0][0]
      expect(payload.title).toBe('My Task')
    })

    it('payload includes isHighPriority', async () => {
      const { result } = renderHook(() => useTaskForm({ ...globalProps, isOpen: true }))
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'T', type: 'text' } })
        result.current.handlers.handleChange({ target: { name: 'isHighPriority', type: 'checkbox', checked: true, value: 'on' } })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(createGlobalTask.mock.calls[0][0].isHighPriority).toBe(true)
    })

    it('calls onSubmit with service response', async () => {
      const onSubmit = vi.fn()
      const { result } = renderHook(() =>
        useTaskForm({ ...globalProps, onSubmit, isOpen: true })
      )
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'T', type: 'text' } })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(onSubmit).toHaveBeenCalledWith({ _id: 'new-task' })
    })

    it('calls onClose after successful submit', async () => {
      const onClose = vi.fn()
      const { result } = renderHook(() =>
        useTaskForm({ ...globalProps, onClose, isOpen: true })
      )
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'T', type: 'text' } })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('sets isSubmitting=false after success', async () => {
      const { result } = renderHook(() => useTaskForm({ ...globalProps, isOpen: true }))
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'T', type: 'text' } })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(result.current.uiState.isSubmitting).toBe(false)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // handleSubmit — workspace task
  // ────────────────────────────────────────────────────────────────────────────
  describe('handleSubmit — workspace task creation', () => {
    it('calls createWorkspaceTask for level=workspace', async () => {
      const { result } = renderHook(() =>
        useTaskForm({ ...workspaceProps, isOpen: true })
      )
      await waitFor(() => expect(result.current.uiState.isLoadingMembers).toBe(false))
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'WS Task', type: 'text' } })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(createWorkspaceTask).toHaveBeenCalledWith(WS_ID, expect.any(Object))
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // handleSubmit — project task
  // ────────────────────────────────────────────────────────────────────────────
  describe('handleSubmit — project task creation', () => {
    it('calls createProjectTask for level=project', async () => {
      const { result } = renderHook(() =>
        useTaskForm({ ...projectProps, isOpen: true })
      )
      await waitFor(() => expect(result.current.uiState.isLoadingMembers).toBe(false))
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'ProjTask', type: 'text' } })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(createProjectTask).toHaveBeenCalledWith(WS_ID, PROJ_ID, expect.any(Object))
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // handleSubmit — error
  // ────────────────────────────────────────────────────────────────────────────
  describe('handleSubmit — error handling', () => {
    it('sets errors.submit when createGlobalTask rejects', async () => {
      createGlobalTask.mockRejectedValue(new Error('Create failed'))
      const { result } = renderHook(() => useTaskForm({ ...globalProps, isOpen: true }))
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'T', type: 'text' } })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(result.current.uiState.errors.submit).toBe('Create failed')
    })

    it('falls back to "Failed to create task" when error has no message', async () => {
      createGlobalTask.mockRejectedValue({})
      const { result } = renderHook(() => useTaskForm({ ...globalProps, isOpen: true }))
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'T', type: 'text' } })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(result.current.uiState.errors.submit).toBe('Failed to create task')
    })

    it('does not call onClose on error', async () => {
      createGlobalTask.mockRejectedValue(new Error('fail'))
      const onClose = vi.fn()
      const { result } = renderHook(() =>
        useTaskForm({ ...globalProps, onClose, isOpen: true })
      )
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'T', type: 'text' } })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(onClose).not.toHaveBeenCalled()
    })

    it('sets isSubmitting=false after error', async () => {
      createGlobalTask.mockRejectedValue(new Error('fail'))
      const { result } = renderHook(() => useTaskForm({ ...globalProps, isOpen: true }))
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'T', type: 'text' } })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(result.current.uiState.isSubmitting).toBe(false)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // handleClose (delegates to onClose)
  // ────────────────────────────────────────────────────────────────────────────
  describe('handlers.handleClose', () => {
    it('calls onClose directly', () => {
      const onClose = vi.fn()
      const { result } = renderHook(() => useTaskForm({ ...globalProps, onClose }))
      act(() => { result.current.handlers.handleClose() })
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })
})