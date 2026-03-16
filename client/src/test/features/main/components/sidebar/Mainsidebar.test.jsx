import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

const { mockSetIsToggle } = vi.hoisted(() => ({
  mockSetIsToggle: vi.fn(),
}))

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get(_, tag) {
        return ({ children, ...rest }) => {
          const Component = tag
          return <Component {...rest}>{children}</Component>
        }
      },
    }
  ),
}))

vi.mock('../../../../../context/ToggleContext.jsx', () => ({
  useToggle: () => ({
    setIsToggle: mockSetIsToggle,
  }),
}))

vi.mock('../../../../../features/main/constants/sidebarConfig.js', () => ({
  NAV_ITEMS: [
    { path: '/main', icon: 'Activity', label: 'Overview', description: 'Dashboard', color: 'sky', exact: true },
    { path: '/main/feed', icon: 'Newspaper', label: 'Feed', description: 'Posts', color: 'blue', exact: false },
  ],
}))

vi.mock('../../../../../features/main/components/sidebar/SidebarContent', () => ({
  SidebarContent: ({ isExpanded, navItems, onLogoClick }) => (
    <div data-testid="sidebar-content">
      <span data-testid="expanded-state">{String(isExpanded)}</span>
      <span data-testid="nav-items-count">{navItems.length}</span>
      <button data-testid="logo-btn" onClick={onLogoClick}>Logo</button>
    </div>
  ),
}))

vi.mock('../../../../../features/main/components/sidebar/ToggleButton', () => ({
  ToggleButton: ({ isExpanded, onClick }) => (
    <button data-testid="toggle-btn" onClick={onClick}>
      {isExpanded ? 'Collapse' : 'Expand'}
    </button>
  ),
}))

import { render, screen, fireEvent, act } from '@testing-library/react'
import MainSidebar from '../../../../../features/main/components/sidebar/MainSidebar'

describe('MainSidebar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockSetIsToggle.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the sidebar shell and content', () => {
    const { container } = render(<MainSidebar />)
    expect(container.querySelector('aside')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar-content')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-btn')).toBeInTheDocument()
  })

  it('passes navigation items to SidebarContent', () => {
    render(<MainSidebar />)
    expect(screen.getByTestId('nav-items-count')).toHaveTextContent('2')
  })

  it('starts expanded', () => {
    render(<MainSidebar />)
    expect(screen.getByTestId('expanded-state')).toHaveTextContent('true')
    expect(screen.getByTestId('toggle-btn')).toHaveTextContent('Collapse')
  })

  it('auto-collapses after 5 seconds', () => {
    render(<MainSidebar />)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByTestId('expanded-state')).toHaveTextContent('false')
  })

  it('toggles expanded state from the toggle button', () => {
    render(<MainSidebar />)
    fireEvent.click(screen.getByTestId('toggle-btn'))
    expect(screen.getByTestId('expanded-state')).toHaveTextContent('false')
    fireEvent.click(screen.getByTestId('toggle-btn'))
    expect(screen.getByTestId('expanded-state')).toHaveTextContent('true')
  })

  it('calls setIsToggle when the logo is clicked', () => {
    render(<MainSidebar />)
    fireEvent.click(screen.getByTestId('logo-btn'))
    expect(mockSetIsToggle).toHaveBeenCalledTimes(1)
  })
})
