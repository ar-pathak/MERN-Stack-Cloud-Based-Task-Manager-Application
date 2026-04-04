import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }))

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('../../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'user-1', name: 'Alice' } }),
}))

vi.mock('../../../../../../service/post.service', () => ({
  createPost: vi.fn(),
}))

vi.mock('../../../../../../service/story.service', () => ({
  createStory: vi.fn(),
}))

vi.mock('../../../../../../service/upload.service', () => ({
  uploadService: {
    uploadMultipleFiles: vi.fn(),
    uploadFile: vi.fn(),
  },
}))

vi.mock('../../../../../../service/user.service', () => ({
  searchMentionCandidates: vi.fn(),
}))

vi.mock('../../../../../../features/main/components/navigation/MobileBottomNav', () => ({
  default: ({ activeTab, profileId }) => (
    <nav data-testid="mobile-bottom-nav" data-tab={activeTab} data-profile={profileId} />
  ),
}))

vi.mock('../../../../../../features/main/components/PostRichTextEditor', async () => {
  const React = await vi.importActual('react')

  return {
    default: React.forwardRef(function MockPostRichTextEditor(props, ref) {
      const [internalValue, setInternalValue] = React.useState(props.value || '')

      React.useEffect(() => {
        setInternalValue(props.value || '')
      }, [props.value])

      const emitMentionState = (nextValue) => {
        const match = nextValue.match(/(?:^|\s)@([a-z0-9_]{1,20})$/i)

        props.onMentionTriggerChange?.(
          match
            ? {
                query: match[1],
                range: { index: nextValue.lastIndexOf(`@${match[1]}`), length: match[1].length + 1 },
              }
            : { query: '', range: null }
        )
      }

      const emitChange = (nextValue) => {
        setInternalValue(nextValue)
        props.onChange?.(nextValue, {
          plainText: nextValue,
          characterCount: nextValue.length,
        })
        emitMentionState(nextValue)
      }

      React.useImperativeHandle(
        ref,
        () => ({
          focus: vi.fn(),
          insertMention: (candidate) => {
            const username = String(candidate?.username || '').trim()
            if (!username) return

            const nextValue = internalValue.match(/(?:^|\s)@[a-z0-9_]{1,20}$/i)
              ? internalValue.replace(/(^|\s)@[a-z0-9_]{1,20}$/i, `$1@${username} `)
              : `${internalValue}@${username} `

            emitChange(nextValue)
          },
          getPlainText: () => internalValue,
        }),
        [internalValue, props.onChange, props.onMentionTriggerChange]
      )

      return (
        <textarea
          aria-label={props.ariaLabel || 'Post content'}
          placeholder={props.placeholder}
          value={internalValue}
          onChange={(event) => {
            emitChange(event.target.value)
          }}
        />
      )
    }),
  }
})

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import CreatePostPage from '../../../../../../features/main/features/create/pages/CreatePostPage'
import { createPost } from '../../../../../../service/post.service'
import { createStory } from '../../../../../../service/story.service'
import { uploadService } from '../../../../../../service/upload.service'
import { searchMentionCandidates } from '../../../../../../service/user.service'

describe('CreatePostPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockReset()
    createPost.mockResolvedValue({ _id: 'post-1' })
    createStory.mockResolvedValue({ _id: 'story-1' })
    uploadService.uploadMultipleFiles.mockResolvedValue([])
    uploadService.uploadFile.mockResolvedValue({ type: 'image/jpeg', url: 'https://cdn.test/story.jpg' })
    searchMentionCandidates.mockResolvedValue([])
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1200 })
    window.URL.createObjectURL = vi.fn(() => 'blob:test-url')
    window.URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the studio heading and defaults to post mode', () => {
    render(<CreatePostPage />)
    expect(screen.getByText('Post & Story Studio')).toBeInTheDocument()
    expect(screen.getByText('Create Post')).toBeInTheDocument()
    expect(screen.getByText('Create Story')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Write something... use @mentions and #tags')).toBeInTheDocument()
    expect(screen.getByText('Publish Post')).toBeInTheDocument()
  })

  it('switches to story mode', () => {
    render(<CreatePostPage />)
    fireEvent.click(screen.getByText('Create Story'))
    expect(screen.getByPlaceholderText('Story caption with #tags and @mentions')).toBeInTheDocument()
    expect(screen.getByText('Share Story')).toBeInTheDocument()
  })

  it('shows schedule controls in schedule mode', () => {
    render(<CreatePostPage />)
    fireEvent.click(screen.getByText('Schedule'))
    expect(screen.getByLabelText('Date & Time')).toBeInTheDocument()
    expect(screen.getByText('Schedule Post')).toBeInTheDocument()
  })

  it('renders deduplicated lowercase hashtags', async () => {
    render(<CreatePostPage />)
    const textarea = screen.getByPlaceholderText('Write something... use @mentions and #tags')
    fireEvent.change(textarea, { target: { value: 'Hello #React #react #Testing' } })
    expect(screen.getByText('#react')).toBeInTheDocument()
    expect(screen.getAllByText('#react')).toHaveLength(1)
    expect(screen.getByText('#testing')).toBeInTheDocument()
  })

  it('searches mention candidates after debounce', async () => {
    vi.useFakeTimers()
    searchMentionCandidates.mockResolvedValue([{ _id: 'u1', username: 'alice', name: 'Alice' }])
    render(<CreatePostPage />)
    fireEvent.change(screen.getByPlaceholderText('Write something... use @mentions and #tags'), {
      target: { value: '@ali' },
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })

    expect(searchMentionCandidates).toHaveBeenCalledWith('ali', { limit: 6 })
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('inserts the picked mention and publishes without stale explicit mention ids', async () => {
    vi.useFakeTimers()
    searchMentionCandidates.mockResolvedValue([{ _id: 'u1', username: 'alice', name: 'Alice' }])
    render(<CreatePostPage />)

    fireEvent.change(screen.getByPlaceholderText('Write something... use @mentions and #tags'), {
      target: { value: 'Hello @ali' },
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })

    vi.useRealTimers()
    fireEvent.click(screen.getByText('Alice'))
    fireEvent.click(screen.getByText('Publish Post'))

    await waitFor(() => expect(createPost).toHaveBeenCalledTimes(1))

    const payload = createPost.mock.calls[0][0]
    expect(payload.content).toContain('@alice')
    expect(payload.mentions).toBeUndefined()
  })

  it('validates empty post submissions', async () => {
    render(<CreatePostPage />)
    fireEvent.click(screen.getByText('Publish Post'))
    expect(screen.getByText('Post content is required')).toBeInTheDocument()
    expect(createPost).not.toHaveBeenCalled()
  })

  it('publishes a valid post and navigates to the feed', async () => {
    render(<CreatePostPage />)
    fireEvent.change(screen.getByPlaceholderText('Write something... use @mentions and #tags'), {
      target: { value: 'Great launch update' },
    })
    fireEvent.click(screen.getByText('Publish Post'))

    await waitFor(() => expect(createPost).toHaveBeenCalledWith(expect.objectContaining({
      content: 'Great launch update',
      visibility: 'public',
      postType: 'text',
      hashtags: [],
    })))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/main/feed'))
  })

  it('validates missing story media before sharing', async () => {
    render(<CreatePostPage />)
    fireEvent.click(screen.getByText('Create Story'))
    fireEvent.click(screen.getByText('Share Story'))
    expect(screen.getByText('Please choose an image or video for story')).toBeInTheDocument()
    expect(createStory).not.toHaveBeenCalled()
  })

  it('renders MobileBottomNav on mobile viewport', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 600 })
    render(<CreatePostPage />)
    expect(screen.getByTestId('mobile-bottom-nav')).toHaveAttribute('data-tab', 'create')
    expect(screen.getByTestId('mobile-bottom-nav')).toHaveAttribute('data-profile', 'user-1')
  })
})
