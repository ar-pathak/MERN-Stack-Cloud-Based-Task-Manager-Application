import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// ── Service mocks — must be inline before import ──────────────────────────────
vi.mock('../../../../service/workspace.service', () => ({
  getWorkspaceMembers: vi.fn(),
}))
vi.mock('../../../../service/team.service', () => ({
  getTeamsByWorkspace: vi.fn(),
}))

import { useProjectForm } from '../../../../features/main/hook/useProjectForm'
import { getWorkspaceMembers } from '../../../../service/workspace.service'
import { getTeamsByWorkspace } from '../../../../service/team.service'

// ── Fixtures ──────────────────────────────────────────────────────────────────
const mockMembersResponse = [
  { user: { _id: 'u1', name: 'Alice', email: 'alice@test.com' }, role: 'admin' },
  { user: { _id: 'u2', name: 'Bob', email: 'bob@test.com' }, role: 'member' },
]

const mockTeamsResponse = [
  { _id: 't1', name: 'Design Team' },
  { _id: 't2', name: 'Dev Team' },
]

const WORKSPACE_ID = 'ws-001'

describe('useProjectForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getWorkspaceMembers.mockResolvedValue(mockMembersResponse)
    getTeamsByWorkspace.mockResolvedValue(mockTeamsResponse)
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Initial state
  // ────────────────────────────────────────────────────────────────────────────
  describe('initial state', () => {
    it('initialises formData with correct default values', () => {
      const { result } = renderHook(() =>
        useProjectForm(false, null, vi.fn(), vi.fn())
      )
      expect(result.current.formData).toEqual({
        name: '',
        description: '',
        color: '#4f46e5',
        teams: [],
        members: [],
        status: 'active',
      })
    })

    it('initialises isSubmitting as false', () => {
      const { result } = renderHook(() =>
        useProjectForm(false, null, vi.fn(), vi.fn())
      )
      expect(result.current.isSubmitting).toBe(false)
    })

    it('initialises errors as empty object', () => {
      const { result } = renderHook(() =>
        useProjectForm(false, null, vi.fn(), vi.fn())
      )
      expect(result.current.errors).toEqual({})
    })

    it('initialises availableMembers as empty array', () => {
      const { result } = renderHook(() =>
        useProjectForm(false, null, vi.fn(), vi.fn())
      )
      expect(result.current.availableMembers).toEqual([])
    })

    it('initialises availableTeams as empty array', () => {
      const { result } = renderHook(() =>
        useProjectForm(false, null, vi.fn(), vi.fn())
      )
      expect(result.current.availableTeams).toEqual([])
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Fetch on open
  // ────────────────────────────────────────────────────────────────────────────
  describe('fetch on open (isOpen=true, workspaceId provided)', () => {
    it('calls getWorkspaceMembers with workspaceId when opened', async () => {
      renderHook(() => useProjectForm(true, WORKSPACE_ID, vi.fn(), vi.fn()))
      await waitFor(() => expect(getWorkspaceMembers).toHaveBeenCalledWith(WORKSPACE_ID))
    })

    it('calls getTeamsByWorkspace with workspaceId when opened', async () => {
      renderHook(() => useProjectForm(true, WORKSPACE_ID, vi.fn(), vi.fn()))
      await waitFor(() => expect(getTeamsByWorkspace).toHaveBeenCalledWith(WORKSPACE_ID))
    })

    it('populates availableMembers with transformed member data', async () => {
      const { result } = renderHook(() =>
        useProjectForm(true, WORKSPACE_ID, vi.fn(), vi.fn())
      )
      await waitFor(() => expect(result.current.availableMembers).toHaveLength(2))

      expect(result.current.availableMembers[0]).toMatchObject({
        id: 'u1',
        name: 'Alice',
        email: 'alice@test.com',
        avatar: 'AL',
        role: 'admin',
      })
    })

    it('populates availableTeams with transformed team data', async () => {
      const { result } = renderHook(() =>
        useProjectForm(true, WORKSPACE_ID, vi.fn(), vi.fn())
      )
      await waitFor(() => expect(result.current.availableTeams).toHaveLength(2))

      expect(result.current.availableTeams[0]).toEqual({ id: 't1', name: 'Design Team' })
      expect(result.current.availableTeams[1]).toEqual({ id: 't2', name: 'Dev Team' })
    })

    it('resets formData to defaults when opened', async () => {
      const { result } = renderHook(() =>
        useProjectForm(true, WORKSPACE_ID, vi.fn(), vi.fn())
      )
      await waitFor(() => expect(result.current.isLoadingMembers).toBe(false))
      expect(result.current.formData.name).toBe('')
      expect(result.current.formData.color).toBe('#4f46e5')
    })

    it('does NOT fetch when isOpen=false', () => {
      renderHook(() => useProjectForm(false, WORKSPACE_ID, vi.fn(), vi.fn()))
      expect(getWorkspaceMembers).not.toHaveBeenCalled()
    })

    it('does NOT fetch when workspaceId is null', () => {
      renderHook(() => useProjectForm(true, null, vi.fn(), vi.fn()))
      expect(getWorkspaceMembers).not.toHaveBeenCalled()
    })

    it('uses member user._id as id', async () => {
      const { result } = renderHook(() =>
        useProjectForm(true, WORKSPACE_ID, vi.fn(), vi.fn())
      )
      await waitFor(() => expect(result.current.availableMembers).toHaveLength(2))
      expect(result.current.availableMembers[0].id).toBe('u1')
    })

    it('falls back to "U" avatar when name is missing', async () => {
      getWorkspaceMembers.mockResolvedValue([
        { user: { _id: 'u3', email: 'nemo@test.com' }, role: 'viewer' },
      ])
      const { result } = renderHook(() =>
        useProjectForm(true, WORKSPACE_ID, vi.fn(), vi.fn())
      )
      await waitFor(() => expect(result.current.availableMembers).toHaveLength(1))
      expect(result.current.availableMembers[0].avatar).toBe('U')
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Fetch error handling
  // ────────────────────────────────────────────────────────────────────────────
  describe('fetch error handling', () => {
    it('sets errors.fetch when getWorkspaceMembers rejects', async () => {
      getWorkspaceMembers.mockRejectedValue(new Error('Network error'))
      const { result } = renderHook(() =>
        useProjectForm(true, WORKSPACE_ID, vi.fn(), vi.fn())
      )
      await waitFor(() =>
        expect(result.current.errors.fetch).toBe('Failed to load workspace data')
      )
    })

    it('sets availableMembers to [] on fetch error', async () => {
      getWorkspaceMembers.mockRejectedValue(new Error('fail'))
      const { result } = renderHook(() =>
        useProjectForm(true, WORKSPACE_ID, vi.fn(), vi.fn())
      )
      await waitFor(() => expect(result.current.isLoadingMembers).toBe(false))
      expect(result.current.availableMembers).toEqual([])
    })

    it('sets availableTeams to [] on fetch error', async () => {
      getTeamsByWorkspace.mockRejectedValue(new Error('fail'))
      const { result } = renderHook(() =>
        useProjectForm(true, WORKSPACE_ID, vi.fn(), vi.fn())
      )
      await waitFor(() => expect(result.current.isLoadingTeams).toBe(false))
      expect(result.current.availableTeams).toEqual([])
    })

    it('clears isLoadingMembers after error', async () => {
      getWorkspaceMembers.mockRejectedValue(new Error('fail'))
      const { result } = renderHook(() =>
        useProjectForm(true, WORKSPACE_ID, vi.fn(), vi.fn())
      )
      await waitFor(() => expect(result.current.isLoadingMembers).toBe(false))
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // handleChange
  // ────────────────────────────────────────────────────────────────────────────
  describe('handleChange', () => {
    it('updates formData name field', () => {
      const { result } = renderHook(() =>
        useProjectForm(false, null, vi.fn(), vi.fn())
      )
      act(() => {
        result.current.handleChange({ target: { name: 'name', value: 'My Project' } })
      })
      expect(result.current.formData.name).toBe('My Project')
    })

    it('updates formData description field', () => {
      const { result } = renderHook(() =>
        useProjectForm(false, null, vi.fn(), vi.fn())
      )
      act(() => {
        result.current.handleChange({ target: { name: 'description', value: 'Some desc' } })
      })
      expect(result.current.formData.description).toBe('Some desc')
    })

    it('updates formData status field', () => {
      const { result } = renderHook(() =>
        useProjectForm(false, null, vi.fn(), vi.fn())
      )
      act(() => {
        result.current.handleChange({ target: { name: 'status', value: 'archived' } })
      })
      expect(result.current.formData.status).toBe('archived')
    })

    it('clears corresponding error when field changes', async () => {
      getWorkspaceMembers.mockRejectedValue(new Error('fail'))
      const { result } = renderHook(() =>
        useProjectForm(true, WORKSPACE_ID, vi.fn(), vi.fn())
      )
      await waitFor(() => expect(result.current.errors.fetch).toBeDefined())

      // Trigger a submit validation error first
      act(() => { result.current.handleSubmit() })
      await waitFor(() => expect(result.current.errors.name).toBeDefined())

      act(() => {
        result.current.handleChange({ target: { name: 'name', value: 'Fix' } })
      })
      expect(result.current.errors.name).toBeUndefined()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // handleSetColor
  // ────────────────────────────────────────────────────────────────────────────
  describe('handleSetColor', () => {
    it('updates formData color', () => {
      const { result } = renderHook(() =>
        useProjectForm(false, null, vi.fn(), vi.fn())
      )
      act(() => { result.current.handleSetColor('#10b981') })
      expect(result.current.formData.color).toBe('#10b981')
    })

    it('updates color multiple times correctly', () => {
      const { result } = renderHook(() =>
        useProjectForm(false, null, vi.fn(), vi.fn())
      )
      act(() => { result.current.handleSetColor('#ef4444') })
      expect(result.current.formData.color).toBe('#ef4444')
      act(() => { result.current.handleSetColor('#8b5cf6') })
      expect(result.current.formData.color).toBe('#8b5cf6')
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // handleToggle
  // ────────────────────────────────────────────────────────────────────────────
  describe('handleToggle', () => {
    it('adds an id to members when not already present', () => {
      const { result } = renderHook(() =>
        useProjectForm(false, null, vi.fn(), vi.fn())
      )
      act(() => { result.current.handleToggle('members', 'u1') })
      expect(result.current.formData.members).toContain('u1')
    })

    it('removes an id from members when already present (toggle off)', () => {
      const { result } = renderHook(() =>
        useProjectForm(false, null, vi.fn(), vi.fn())
      )
      act(() => { result.current.handleToggle('members', 'u1') })
      act(() => { result.current.handleToggle('members', 'u1') })
      expect(result.current.formData.members).not.toContain('u1')
    })

    it('adds an id to teams when not already present', () => {
      const { result } = renderHook(() =>
        useProjectForm(false, null, vi.fn(), vi.fn())
      )
      act(() => { result.current.handleToggle('teams', 't1') })
      expect(result.current.formData.teams).toContain('t1')
    })

    it('toggles multiple ids independently', () => {
      const { result } = renderHook(() =>
        useProjectForm(false, null, vi.fn(), vi.fn())
      )
      act(() => { result.current.handleToggle('members', 'u1') })
      act(() => { result.current.handleToggle('members', 'u2') })
      expect(result.current.formData.members).toContain('u1')
      expect(result.current.formData.members).toContain('u2')
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // handleSubmit — validation
  // ────────────────────────────────────────────────────────────────────────────
  describe('handleSubmit — validation', () => {
    it('sets errors.name when name is empty', async () => {
      const { result } = renderHook(() =>
        useProjectForm(false, WORKSPACE_ID, vi.fn(), vi.fn())
      )
      await act(async () => { await result.current.handleSubmit() })
      expect(result.current.errors.name).toBe('Project name is required')
    })

    it('sets errors.workspace when workspaceId is null', async () => {
      const { result } = renderHook(() =>
        useProjectForm(false, null, vi.fn(), vi.fn())
      )
      act(() => {
        result.current.handleChange({ target: { name: 'name', value: 'Test' } })
      })
      await act(async () => { await result.current.handleSubmit() })
      expect(result.current.errors.workspace).toBe('Workspace is required')
    })

    it('does not call onSubmit when validation fails', async () => {
      const onSubmit = vi.fn()
      const { result } = renderHook(() =>
        useProjectForm(false, WORKSPACE_ID, onSubmit, vi.fn())
      )
      await act(async () => { await result.current.handleSubmit() })
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // handleSubmit — success
  // ────────────────────────────────────────────────────────────────────────────
  describe('handleSubmit — success', () => {
    it('calls onSubmit with correct payload', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      const onClose = vi.fn()
      const { result } = renderHook(() =>
        useProjectForm(false, WORKSPACE_ID, onSubmit, onClose)
      )

      act(() => {
        result.current.handleChange({ target: { name: 'name', value: 'New Project' } })
        result.current.handleChange({ target: { name: 'description', value: 'Desc' } })
        result.current.handleSetColor('#10b981')
        result.current.handleToggle('members', 'u1')
      })

      await act(async () => { await result.current.handleSubmit() })

      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Project',
        description: 'Desc',
        color: '#10b981',
        members: [{ user: 'u1', role: 'viewer' }],
      }))
    })

    it('calls onClose after successful submit', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      const onClose = vi.fn()
      const { result } = renderHook(() =>
        useProjectForm(false, WORKSPACE_ID, onSubmit, onClose)
      )
      act(() => {
        result.current.handleChange({ target: { name: 'name', value: 'X' } })
      })
      await act(async () => { await result.current.handleSubmit() })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('maps selected members to { user, role: "viewer" } objects', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useProjectForm(false, WORKSPACE_ID, onSubmit, vi.fn())
      )
      act(() => {
        result.current.handleChange({ target: { name: 'name', value: 'P' } })
        result.current.handleToggle('members', 'u1')
        result.current.handleToggle('members', 'u2')
      })
      await act(async () => { await result.current.handleSubmit() })
      const payload = onSubmit.mock.calls[0][0]
      expect(payload.members).toEqual([
        { user: 'u1', role: 'viewer' },
        { user: 'u2', role: 'viewer' },
      ])
    })

    it('trims whitespace from name before submitting', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useProjectForm(false, WORKSPACE_ID, onSubmit, vi.fn())
      )
      act(() => {
        result.current.handleChange({ target: { name: 'name', value: '  My Project  ' } })
      })
      await act(async () => { await result.current.handleSubmit() })
      expect(onSubmit.mock.calls[0][0].name).toBe('My Project')
    })

    it('sets isSubmitting=false after successful submit', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useProjectForm(false, WORKSPACE_ID, onSubmit, vi.fn())
      )
      act(() => {
        result.current.handleChange({ target: { name: 'name', value: 'P' } })
      })
      await act(async () => { await result.current.handleSubmit() })
      expect(result.current.isSubmitting).toBe(false)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // handleSubmit — error
  // ────────────────────────────────────────────────────────────────────────────
  describe('handleSubmit — error', () => {
    it('sets errors.submit when onSubmit rejects', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('Server fail'))
      const { result } = renderHook(() =>
        useProjectForm(false, WORKSPACE_ID, onSubmit, vi.fn())
      )
      act(() => {
        result.current.handleChange({ target: { name: 'name', value: 'P' } })
      })
      await act(async () => { await result.current.handleSubmit() })
      expect(result.current.errors.submit).toBe('Server fail')
    })

    it('falls back to "Failed to create project" when error has no message', async () => {
      const onSubmit = vi.fn().mockRejectedValue({})
      const { result } = renderHook(() =>
        useProjectForm(false, WORKSPACE_ID, onSubmit, vi.fn())
      )
      act(() => {
        result.current.handleChange({ target: { name: 'name', value: 'P' } })
      })
      await act(async () => { await result.current.handleSubmit() })
      expect(result.current.errors.submit).toBe('Failed to create project')
    })

    it('does not call onClose when submit fails', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('fail'))
      const onClose = vi.fn()
      const { result } = renderHook(() =>
        useProjectForm(false, WORKSPACE_ID, onSubmit, onClose)
      )
      act(() => {
        result.current.handleChange({ target: { name: 'name', value: 'P' } })
      })
      await act(async () => { await result.current.handleSubmit() })
      expect(onClose).not.toHaveBeenCalled()
    })

    it('sets isSubmitting=false after error', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('fail'))
      const { result } = renderHook(() =>
        useProjectForm(false, WORKSPACE_ID, onSubmit, vi.fn())
      )
      act(() => {
        result.current.handleChange({ target: { name: 'name', value: 'P' } })
      })
      await act(async () => { await result.current.handleSubmit() })
      expect(result.current.isSubmitting).toBe(false)
    })
  })
})