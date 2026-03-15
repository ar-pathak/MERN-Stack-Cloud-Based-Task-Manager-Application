import { vi, describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ProjectMemberSelector from '../../../../../features/main/components/popup/ProjectMemberSelector'

describe('ProjectMemberSelector', () => {
  const mockMembers = [
    { id: 'u1', name: 'Alice Johnson', role: 'Admin', avatar: 'AJ' },
    { id: 'u2', name: 'Bob Smith', role: 'Member', avatar: 'BS' },
    { id: 'u3', name: 'Charlie Brown', role: 'Viewer', avatar: 'CB' },
  ]

  const defaultProps = {
    members: mockMembers,
    selectedIds: [],
    isLoading: false,
    onToggle: vi.fn(),
    disabled: false,
  }

  // --- Loading State ---
  describe('loading state', () => {
    it('renders loading spinner when isLoading=true', () => {
      render(<ProjectMemberSelector {...defaultProps} isLoading={true} members={[]} />)
      expect(screen.getByText('Loading workspace members...')).toBeInTheDocument()
    })

    it('does not render member list while loading', () => {
      render(<ProjectMemberSelector {...defaultProps} isLoading={true} members={[]} />)
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument()
    })
  })

  // --- Empty State ---
  describe('empty state', () => {
    it('renders no-members message when members array is empty', () => {
      render(<ProjectMemberSelector {...defaultProps} members={[]} />)
      expect(screen.getByText('No members found')).toBeInTheDocument()
    })

    it('renders helper text in empty state', () => {
      render(<ProjectMemberSelector {...defaultProps} members={[]} />)
      expect(screen.getByText('Add members to the workspace first.')).toBeInTheDocument()
    })

    it('does not show empty state when members exist', () => {
      render(<ProjectMemberSelector {...defaultProps} />)
      expect(screen.queryByText('No members found')).not.toBeInTheDocument()
    })
  })

  // --- Member List ---
  describe('member list', () => {
    it('renders all member names', () => {
      render(<ProjectMemberSelector {...defaultProps} />)
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      expect(screen.getByText('Bob Smith')).toBeInTheDocument()
      expect(screen.getByText('Charlie Brown')).toBeInTheDocument()
    })

    it('renders all member roles', () => {
      render(<ProjectMemberSelector {...defaultProps} />)
      expect(screen.getByText('Admin')).toBeInTheDocument()
      expect(screen.getByText('Member')).toBeInTheDocument()
      expect(screen.getByText('Viewer')).toBeInTheDocument()
    })

    it('renders member avatars', () => {
      render(<ProjectMemberSelector {...defaultProps} />)
      expect(screen.getByText('AJ')).toBeInTheDocument()
      expect(screen.getByText('BS')).toBeInTheDocument()
      expect(screen.getByText('CB')).toBeInTheDocument()
    })

    it('renders Add Team Members label', () => {
      render(<ProjectMemberSelector {...defaultProps} />)
      expect(screen.getByText('Add Team Members')).toBeInTheDocument()
    })

    it('shows selected count in label', () => {
      render(<ProjectMemberSelector {...defaultProps} selectedIds={['u1', 'u2']} />)
      expect(screen.getByText('(2 selected)')).toBeInTheDocument()
    })

    it('shows zero selected count when none selected', () => {
      render(<ProjectMemberSelector {...defaultProps} selectedIds={[]} />)
      expect(screen.getByText('(0 selected)')).toBeInTheDocument()
    })
  })

  // --- Selection State ---
  describe('selection state', () => {
    it('shows CheckSquare icon for selected members', () => {
      const { container } = render(
        <ProjectMemberSelector {...defaultProps} selectedIds={['u1']} />
      )
      const selectedBtn = screen.getByText('Alice Johnson').closest('button')
      expect(selectedBtn.className).toContain('bg-violet-500/10')
      expect(selectedBtn.className).toContain('border-violet-500/30')
    })

    it('shows unselected style for non-selected members', () => {
      render(<ProjectMemberSelector {...defaultProps} selectedIds={['u1']} />)
      const unselectedBtn = screen.getByText('Bob Smith').closest('button')
      expect(unselectedBtn.className).toContain('bg-slate-900/40')
    })

    it('calls onToggle with members field and member id when clicked', () => {
      const onToggle = vi.fn()
      render(<ProjectMemberSelector {...defaultProps} onToggle={onToggle} />)
      fireEvent.click(screen.getByText('Alice Johnson').closest('button'))
      expect(onToggle).toHaveBeenCalledWith('members', 'u1')
    })

    it('calls onToggle for each member when clicked', () => {
      const onToggle = vi.fn()
      render(<ProjectMemberSelector {...defaultProps} onToggle={onToggle} />)
      fireEvent.click(screen.getByText('Bob Smith').closest('button'))
      expect(onToggle).toHaveBeenCalledWith('members', 'u2')
    })
  })

  // --- Disabled State ---
  describe('disabled state', () => {
    it('disables all member buttons when disabled=true', () => {
      render(<ProjectMemberSelector {...defaultProps} disabled={true} />)
      screen.getAllByRole('button').forEach(btn => expect(btn).toBeDisabled())
    })

    it('does not disable buttons when disabled=false', () => {
      render(<ProjectMemberSelector {...defaultProps} disabled={false} />)
      screen.getAllByRole('button').forEach(btn => expect(btn).not.toBeDisabled())
    })
  })
})