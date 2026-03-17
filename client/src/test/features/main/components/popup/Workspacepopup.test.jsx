import { vi, describe, it, expect } from 'vitest'

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

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import WorkspacePopup from '../../../../../features/main/components/popup/WorkspacePopup'

describe('WorkspacePopup', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  }

  // ─── Visibility ─────────────────────────────────────────────────────────────
  describe('visibility', () => {
    it('renders when isOpen=true', () => {
      render(<WorkspacePopup {...defaultProps} />)
      expect(screen.getByRole('heading', { name: 'Create Workspace' })).toBeInTheDocument()
    })

    it('renders nothing when isOpen=false', () => {
      render(<WorkspacePopup {...defaultProps} isOpen={false} />)
      expect(screen.queryByRole('heading', { name: 'Create Workspace' })).not.toBeInTheDocument()
    })
  })

  // ─── Static Content ──────────────────────────────────────────────────────────
  describe('static content', () => {
    it('renders the Create Workspace heading', () => {
      render(<WorkspacePopup {...defaultProps} />)
      expect(screen.getByRole('heading', { name: 'Create Workspace' })).toBeInTheDocument()
    })

    it('renders the subtitle', () => {
      render(<WorkspacePopup {...defaultProps} />)
      expect(screen.getByText('Set up a new workspace for your team')).toBeInTheDocument()
    })

    it('renders Workspace Name label with required asterisk', () => {
      render(<WorkspacePopup {...defaultProps} />)
      expect(screen.getByText('Workspace Name')).toBeInTheDocument()
      expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('renders Description label', () => {
      render(<WorkspacePopup {...defaultProps} />)
      expect(screen.getByText('Description')).toBeInTheDocument()
    })

    it('renders Cancel button', () => {
      render(<WorkspacePopup {...defaultProps} />)
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('renders Create Workspace submit button', () => {
      render(<WorkspacePopup {...defaultProps} />)
      expect(screen.getByRole('button', { name: /Create Workspace/i })).toBeInTheDocument()
    })

    it('renders name input placeholder', () => {
      render(<WorkspacePopup {...defaultProps} />)
      expect(screen.getByPlaceholderText('e.g., Product Development')).toBeInTheDocument()
    })

    it('renders description textarea placeholder', () => {
      render(<WorkspacePopup {...defaultProps} />)
      expect(screen.getByPlaceholderText('Describe what this workspace is for...')).toBeInTheDocument()
    })
  })

  // ─── Form Interaction ────────────────────────────────────────────────────────
  describe('form interaction', () => {
    it('updates name input value on change', () => {
      render(<WorkspacePopup {...defaultProps} />)
      const input = screen.getByPlaceholderText('e.g., Product Development')
      fireEvent.change(input, { target: { name: 'name', value: 'My Workspace' } })
      expect(input.value).toBe('My Workspace')
    })

    it('updates description textarea value on change', () => {
      render(<WorkspacePopup {...defaultProps} />)
      const textarea = screen.getByPlaceholderText('Describe what this workspace is for...')
      fireEvent.change(textarea, { target: { name: 'description', value: 'Team workspace' } })
      expect(textarea.value).toBe('Team workspace')
    })

    it('clears name error when user starts typing after error', async () => {
      render(<WorkspacePopup {...defaultProps} />)
      // trigger validation error first
      fireEvent.click(screen.getByRole('button', { name: /Create Workspace/i }))
      await waitFor(() => expect(screen.getByText('Workspace name is required')).toBeInTheDocument())
      // now type to clear the error
      fireEvent.change(screen.getByPlaceholderText('e.g., Product Development'), {
        target: { name: 'name', value: 'New Name' },
      })
      expect(screen.queryByText('Workspace name is required')).not.toBeInTheDocument()
    })
  })

  // ─── Validation ──────────────────────────────────────────────────────────────
  describe('validation', () => {
    it('shows name required error when submitting empty form', async () => {
      render(<WorkspacePopup {...defaultProps} />)
      fireEvent.click(screen.getByRole('button', { name: /Create Workspace/i }))
      await waitFor(() =>
        expect(screen.getByText('Workspace name is required')).toBeInTheDocument()
      )
    })

    it('does not call onSubmit when name is empty', async () => {
      const onSubmit = vi.fn()
      render(<WorkspacePopup {...defaultProps} onSubmit={onSubmit} />)
      fireEvent.click(screen.getByRole('button', { name: /Create Workspace/i }))
      await waitFor(() => screen.getByText('Workspace name is required'))
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  // ─── Submission ──────────────────────────────────────────────────────────────
  describe('successful submission', () => {
    it('calls onSubmit with form data when name is filled', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      const onClose = vi.fn()
      render(<WorkspacePopup {...defaultProps} onSubmit={onSubmit} onClose={onClose} />)

      fireEvent.change(screen.getByPlaceholderText('e.g., Product Development'), {
        target: { name: 'name', value: 'Design Hub' },
      })
      fireEvent.change(screen.getByPlaceholderText('Describe what this workspace is for...'), {
        target: { name: 'description', value: 'For all design work' },
      })
      fireEvent.click(screen.getByRole('button', { name: /Create Workspace/i }))

      await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
        name: 'Design Hub',
        description: 'For all design work',
      }))
    })

    it('calls onClose after successful submission', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      const onClose = vi.fn()
      render(<WorkspacePopup {...defaultProps} onSubmit={onSubmit} onClose={onClose} />)

      fireEvent.change(screen.getByPlaceholderText('e.g., Product Development'), {
        target: { name: 'name', value: 'My Workspace' },
      })
      fireEvent.click(screen.getByRole('button', { name: /Create Workspace/i }))

      await waitFor(() => expect(onClose).toHaveBeenCalled())
    })

    it('shows Creating... text while submitting', async () => {
      let resolveSubmit
      const onSubmit = vi.fn().mockReturnValue(new Promise(res => { resolveSubmit = res }))
      render(<WorkspacePopup {...defaultProps} onSubmit={onSubmit} />)

      fireEvent.change(screen.getByPlaceholderText('e.g., Product Development'), {
        target: { name: 'name', value: 'Workspace' },
      })
      fireEvent.click(screen.getByRole('button', { name: /Create Workspace/i }))

      await waitFor(() => expect(screen.getByText('Creating...')).toBeInTheDocument())
      await act(async () => {
        resolveSubmit()
        await Promise.resolve()
      })
    })
  })

  // ─── Error Handling ──────────────────────────────────────────────────────────
  describe('submission error handling', () => {
    it('shows submit error message when onSubmit rejects', async () => {
      const onSubmit = vi.fn().mockRejectedValue({ message: 'Server error' })
      render(<WorkspacePopup {...defaultProps} onSubmit={onSubmit} />)

      fireEvent.change(screen.getByPlaceholderText('e.g., Product Development'), {
        target: { name: 'name', value: 'My Workspace' },
      })
      fireEvent.click(screen.getByRole('button', { name: /Create Workspace/i }))

      await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument())
    })

    it('shows fallback error message when error has no message', async () => {
      const onSubmit = vi.fn().mockRejectedValue({})
      render(<WorkspacePopup {...defaultProps} onSubmit={onSubmit} />)

      fireEvent.change(screen.getByPlaceholderText('e.g., Product Development'), {
        target: { name: 'name', value: 'My Workspace' },
      })
      fireEvent.click(screen.getByRole('button', { name: /Create Workspace/i }))

      await waitFor(() => expect(screen.getByText('Failed to create workspace')).toBeInTheDocument())
    })
  })

  // ─── Close Behaviour ─────────────────────────────────────────────────────────
  describe('close behaviour', () => {
    it('calls onClose when Cancel button is clicked', () => {
      const onClose = vi.fn()
      render(<WorkspacePopup {...defaultProps} onClose={onClose} />)
      fireEvent.click(screen.getByText('Cancel'))
      expect(onClose).toHaveBeenCalled()
    })

    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn()
      const { container } = render(<WorkspacePopup {...defaultProps} onClose={onClose} />)
      // backdrop is the first motion div (absolute inset-0)
      const backdrop = container.querySelector('.absolute.inset-0.bg-black\\/60')
      fireEvent.click(backdrop)
      expect(onClose).toHaveBeenCalled()
    })

    it('does not call onClose when modal content is clicked', () => {
      const onClose = vi.fn()
      render(<WorkspacePopup {...defaultProps} onClose={onClose} />)
      fireEvent.click(screen.getByRole('heading', { name: 'Create Workspace' }))
      expect(onClose).not.toHaveBeenCalled()
    })
  })
})
