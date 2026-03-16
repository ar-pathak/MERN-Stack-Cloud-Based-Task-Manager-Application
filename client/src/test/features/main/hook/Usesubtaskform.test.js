import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

vi.mock('../../../../service/task.service', () => ({
  getTaskById: vi.fn(),
}))
vi.mock('../../../../service/team.service', () => ({
  getTeamMembers: vi.fn(),
}))

import { useSubtaskForm } from '../../../../features/main/hook/useSubtaskForm'
import { getTaskById } from '../../../../service/task.service'
import { getTeamMembers } from '../../../../service/team.service'

// ── Fixtures ──────────────────────────────────────────────────────────────────
const TASK_ID = 'task-001'
const WORKSPACE_ID = 'ws-001'

const mockTask = {
  _id: TASK_ID,
  workspace: { _id: WORKSPACE_ID },
  assignees: [
    { _id: 'a1', name: 'Alice', email: 'alice@test.com' },
    { _id: 'a2', name: 'Bob', email: 'bob@test.com' },
  ],
  assigneesTeams: [],
}

const defaultProps = {
  isOpen: false,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
  taskId: TASK_ID,
}

describe('useSubtaskForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getTaskById.mockResolvedValue(mockTask)
    getTeamMembers.mockResolvedValue([])
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Initial state
  // ────────────────────────────────────────────────────────────────────────────
  describe('initial state', () => {
    it('initialises formData with correct defaults', () => {
      const { result } = renderHook(() => useSubtaskForm(defaultProps))
      expect(result.current.formData).toEqual({
        title: '',
        description: '',
        completed: false,
        assignedTo: null,
        dueDate: '',
      })
    })

    it('initialises uiState with correct defaults', () => {
      const { result } = renderHook(() => useSubtaskForm(defaultProps))
      expect(result.current.uiState).toEqual({
        isSubmitting: false,
        isLoadingTask: false,
        errors: {},
      })
    })

    it('initialises data.availableAssignees as empty array', () => {
      const { result } = renderHook(() => useSubtaskForm(defaultProps))
      expect(result.current.data.availableAssignees).toEqual([])
    })

    it('exposes handlers object with all 4 handler functions', () => {
      const { result } = renderHook(() => useSubtaskForm(defaultProps))
      expect(typeof result.current.handlers.handleChange).toBe('function')
      expect(typeof result.current.handlers.handleAssigneeSelect).toBe('function')
      expect(typeof result.current.handlers.handleSubmit).toBe('function')
      expect(typeof result.current.handlers.handleClose).toBe('function')
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Task context fetch on open
  // ────────────────────────────────────────────────────────────────────────────
  describe('fetch task context when isOpen=true', () => {
    it('calls getTaskById with taskId when opened', async () => {
      renderHook(() => useSubtaskForm({ ...defaultProps, isOpen: true }))
      await waitFor(() => expect(getTaskById).toHaveBeenCalledWith(TASK_ID))
    })

    it('populates availableAssignees from task.assignees', async () => {
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, isOpen: true })
      )
      await waitFor(() =>
        expect(result.current.data.availableAssignees).toHaveLength(2)
      )
      expect(result.current.data.availableAssignees[0]).toMatchObject({
        id: 'a1',
        name: 'Alice',
        email: 'alice@test.com',
        avatar: 'AL',
        source: 'task',
        sourceLabel: 'Task Assignee',
      })
    })

    it('generates 2-letter uppercase avatar from name', async () => {
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, isOpen: true })
      )
      await waitFor(() =>
        expect(result.current.data.availableAssignees).toHaveLength(2)
      )
      expect(result.current.data.availableAssignees[0].avatar).toBe('AL')
      expect(result.current.data.availableAssignees[1].avatar).toBe('BO')
    })

    it('does NOT fetch when isOpen=false', () => {
      renderHook(() => useSubtaskForm({ ...defaultProps, isOpen: false }))
      expect(getTaskById).not.toHaveBeenCalled()
    })

    it('does NOT fetch when taskId is falsy', () => {
      renderHook(() => useSubtaskForm({ ...defaultProps, isOpen: true, taskId: null }))
      expect(getTaskById).not.toHaveBeenCalled()
    })

    it('resets formData when opened', async () => {
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, isOpen: true })
      )
      await waitFor(() => expect(result.current.uiState.isLoadingTask).toBe(false))
      expect(result.current.formData.title).toBe('')
      expect(result.current.formData.assignedTo).toBeNull()
    })

    it('sets isLoadingTask=false after fetch completes', async () => {
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, isOpen: true })
      )
      await waitFor(() => expect(result.current.uiState.isLoadingTask).toBe(false))
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Team members deduplication
  // ────────────────────────────────────────────────────────────────────────────
  describe('team member deduplication', () => {
    it('fetches team members when task has assigneesTeams', async () => {
      getTaskById.mockResolvedValue({
        ...mockTask,
        assigneesTeams: [{ _id: 'team-1' }],
      })
      getTeamMembers.mockResolvedValue([
        { user: { _id: 'u3', name: 'Charlie', email: 'c@test.com' } },
      ])
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, isOpen: true })
      )
      await waitFor(() =>
        expect(result.current.data.availableAssignees.length).toBeGreaterThan(0)
      )
      // Charlie should be in the list as a team member
      const charlie = result.current.data.availableAssignees.find(a => a.name === 'Charlie')
      expect(charlie).toBeDefined()
      expect(charlie.source).toBe('team')
    })

    it('does not add duplicate assignees already in task.assignees', async () => {
      getTaskById.mockResolvedValue({
        ...mockTask,
        assigneesTeams: [{ _id: 'team-1' }],
      })
      // Return Alice again as a team member — she is already in assignees
      getTeamMembers.mockResolvedValue([
        { user: { _id: 'a1', name: 'Alice', email: 'alice@test.com' } },
      ])
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, isOpen: true })
      )
      await waitFor(() => expect(result.current.uiState.isLoadingTask).toBe(false))
      const alices = result.current.data.availableAssignees.filter(a => a.id === 'a1')
      expect(alices).toHaveLength(1)
    })

    it('handles getTeamMembers error gracefully (ignores failed team)', async () => {
      getTaskById.mockResolvedValue({
        ...mockTask,
        assigneesTeams: [{ _id: 'team-1' }],
      })
      getTeamMembers.mockRejectedValue(new Error('network error'))
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, isOpen: true })
      )
      await waitFor(() => expect(result.current.uiState.isLoadingTask).toBe(false))
      // Still returns task assignees, team just adds nothing
      expect(result.current.data.availableAssignees).toHaveLength(2)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Fetch error handling
  // ────────────────────────────────────────────────────────────────────────────
  describe('fetch error handling', () => {
    it('sets availableAssignees to [] when getTaskById rejects', async () => {
      getTaskById.mockRejectedValue(new Error('not found'))
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, isOpen: true })
      )
      await waitFor(() => expect(result.current.uiState.isLoadingTask).toBe(false))
      expect(result.current.data.availableAssignees).toEqual([])
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // handleChange
  // ────────────────────────────────────────────────────────────────────────────
  describe('handlers.handleChange', () => {
    it('updates formData.title', () => {
      const { result } = renderHook(() => useSubtaskForm(defaultProps))
      act(() => {
        result.current.handlers.handleChange({
          target: { name: 'title', value: 'My Subtask', type: 'text' },
        })
      })
      expect(result.current.formData.title).toBe('My Subtask')
    })

    it('updates formData.description', () => {
      const { result } = renderHook(() => useSubtaskForm(defaultProps))
      act(() => {
        result.current.handlers.handleChange({
          target: { name: 'description', value: 'Some details', type: 'text' },
        })
      })
      expect(result.current.formData.description).toBe('Some details')
    })

    it('updates formData.dueDate', () => {
      const { result } = renderHook(() => useSubtaskForm(defaultProps))
      act(() => {
        result.current.handlers.handleChange({
          target: { name: 'dueDate', value: '2025-12-31', type: 'date' },
        })
      })
      expect(result.current.formData.dueDate).toBe('2025-12-31')
    })

    it('updates boolean fields via checkbox type', () => {
      const { result } = renderHook(() => useSubtaskForm(defaultProps))
      act(() => {
        result.current.handlers.handleChange({
          target: { name: 'completed', value: 'on', type: 'checkbox', checked: true },
        })
      })
      expect(result.current.formData.completed).toBe(true)
    })

    it('clears the corresponding field error on change', async () => {
      const { result } = renderHook(() => useSubtaskForm(defaultProps))
      // Trigger validation error
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(result.current.uiState.errors.title).toBeDefined()

      act(() => {
        result.current.handlers.handleChange({
          target: { name: 'title', value: 'Fix', type: 'text' },
        })
      })
      expect(result.current.uiState.errors.title).toBeNull()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // handleAssigneeSelect
  // ────────────────────────────────────────────────────────────────────────────
  describe('handlers.handleAssigneeSelect', () => {
    it('sets assignedTo to the given id', () => {
      const { result } = renderHook(() => useSubtaskForm(defaultProps))
      act(() => { result.current.handlers.handleAssigneeSelect('a1') })
      expect(result.current.formData.assignedTo).toBe('a1')
    })

    it('deselects (sets to null) when the same id is selected again', () => {
      const { result } = renderHook(() => useSubtaskForm(defaultProps))
      act(() => { result.current.handlers.handleAssigneeSelect('a1') })
      act(() => { result.current.handlers.handleAssigneeSelect('a1') })
      expect(result.current.formData.assignedTo).toBeNull()
    })

    it('replaces previous selection with new id', () => {
      const { result } = renderHook(() => useSubtaskForm(defaultProps))
      act(() => { result.current.handlers.handleAssigneeSelect('a1') })
      act(() => { result.current.handlers.handleAssigneeSelect('a2') })
      expect(result.current.formData.assignedTo).toBe('a2')
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // handleSubmit — validation
  // ────────────────────────────────────────────────────────────────────────────
  describe('handlers.handleSubmit — validation', () => {
    it('sets errors.title when title is empty', async () => {
      const { result } = renderHook(() => useSubtaskForm(defaultProps))
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(result.current.uiState.errors.title).toBe('Subtask title is required')
    })

    it('sets errors.task when taskId is null', async () => {
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, taskId: null })
      )
      act(() => {
        result.current.handlers.handleChange({
          target: { name: 'title', value: 'T', type: 'text' },
        })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(result.current.uiState.errors.task).toBe('Parent task ID is required')
    })

    it('does not call onSubmit when validation fails', async () => {
      const onSubmit = vi.fn()
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, onSubmit })
      )
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // handleSubmit — success
  // ────────────────────────────────────────────────────────────────────────────
  describe('handlers.handleSubmit — success', () => {
    it('calls onSubmit with correct payload (title + taskId)', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, onSubmit })
      )
      act(() => {
        result.current.handlers.handleChange({
          target: { name: 'title', value: 'Fix bug', type: 'text' },
        })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        taskId: TASK_ID,
        title: 'Fix bug',
        completed: false,
      }))
    })

    it('includes description in payload when provided', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, onSubmit })
      )
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'T', type: 'text' } })
        result.current.handlers.handleChange({ target: { name: 'description', value: 'Detail', type: 'text' } })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(onSubmit.mock.calls[0][0].description).toBe('Detail')
    })

    it('omits description from payload when empty', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, onSubmit })
      )
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'T', type: 'text' } })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('description')
    })

    it('includes assignedTo in payload when selected', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, onSubmit })
      )
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'T', type: 'text' } })
        result.current.handlers.handleAssigneeSelect('a1')
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(onSubmit.mock.calls[0][0].assignedTo).toBe('a1')
    })

    it('trims whitespace from title', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, onSubmit })
      )
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: '  My Subtask  ', type: 'text' } })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(onSubmit.mock.calls[0][0].title).toBe('My Subtask')
    })

    it('calls onClose after successful submit', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      const onClose = vi.fn()
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, onSubmit, onClose })
      )
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'T', type: 'text' } })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('resets form after successful submit', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, onSubmit })
      )
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'Done', type: 'text' } })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(result.current.formData.title).toBe('')
    })

    it('sets isSubmitting=false after success', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, onSubmit })
      )
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'T', type: 'text' } })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(result.current.uiState.isSubmitting).toBe(false)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // handleSubmit — error
  // ────────────────────────────────────────────────────────────────────────────
  describe('handlers.handleSubmit — error', () => {
    it('sets errors.submit when onSubmit rejects', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('Server error'))
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, onSubmit })
      )
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'T', type: 'text' } })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(result.current.uiState.errors.submit).toBe('Server error')
    })

    it('falls back to "Failed to create subtask" when error has no message', async () => {
      const onSubmit = vi.fn().mockRejectedValue({})
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, onSubmit })
      )
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'T', type: 'text' } })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(result.current.uiState.errors.submit).toBe('Failed to create subtask')
    })

    it('does not call onClose on error', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('fail'))
      const onClose = vi.fn()
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, onSubmit, onClose })
      )
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'T', type: 'text' } })
      })
      await act(async () => { await result.current.handlers.handleSubmit() })
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // handleClose
  // ────────────────────────────────────────────────────────────────────────────
  describe('handlers.handleClose', () => {
    it('calls onClose when not submitting', () => {
      const onClose = vi.fn()
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, onClose })
      )
      act(() => { result.current.handlers.handleClose() })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('resets formData on close', () => {
      const { result } = renderHook(() => useSubtaskForm(defaultProps))
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'Some', type: 'text' } })
      })
      act(() => { result.current.handlers.handleClose() })
      expect(result.current.formData.title).toBe('')
    })

    it('clears availableAssignees on close', async () => {
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, isOpen: true })
      )
      await waitFor(() => expect(result.current.data.availableAssignees).toHaveLength(2))
      act(() => { result.current.handlers.handleClose() })
      expect(result.current.data.availableAssignees).toEqual([])
    })

    it('does NOT call onClose when isSubmitting=true', async () => {
      const onSubmit = vi.fn(() => new Promise(() => {})) // never resolves
      const onClose = vi.fn()
      const { result } = renderHook(() =>
        useSubtaskForm({ ...defaultProps, onSubmit, onClose })
      )
      act(() => {
        result.current.handlers.handleChange({ target: { name: 'title', value: 'T', type: 'text' } })
      })
      // Start submit but don't await — leaves isSubmitting=true
      act(() => { result.current.handlers.handleSubmit() })
      act(() => { result.current.handlers.handleClose() })
      expect(onClose).not.toHaveBeenCalled()
    })
  })
})