import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  toIdString,
  formatRelativeTime,
  resolveNotificationPath,
} from '../../../../../../features/main/features/notifications/utils/notification.helpers'

// ─────────────────────────────────────────────────────────────────────────────
// toIdString
// ─────────────────────────────────────────────────────────────────────────────
describe('toIdString', () => {
  // ── Falsy values ────────────────────────────────────────────────────────────
  describe('falsy inputs', () => {
    it('returns "" for null', () => expect(toIdString(null)).toBe(''))
    it('returns "" for undefined', () => expect(toIdString(undefined)).toBe(''))
    it('returns "" for 0', () => expect(toIdString(0)).toBe(''))
    it('returns "" for false', () => expect(toIdString(false)).toBe(''))
    it('returns "" for empty string', () => expect(toIdString('')).toBe(''))
    it('returns "" with no argument', () => expect(toIdString()).toBe(''))
  })

  // ── Primitive inputs ────────────────────────────────────────────────────────
  describe('primitive inputs', () => {
    it('returns the string as-is for a plain string', () =>
      expect(toIdString('abc123')).toBe('abc123'))

    it('converts a number to a string', () =>
      expect(toIdString(42)).toBe('42'))

    it('converts a large number to a string', () =>
      expect(toIdString(9999999)).toBe('9999999'))
  })

  // ── Object with _id ─────────────────────────────────────────────────────────
  describe('objects with _id', () => {
    it('extracts string _id from object', () =>
      expect(toIdString({ _id: 'user-001' })).toBe('user-001'))

    it('extracts numeric _id from object', () =>
      expect(toIdString({ _id: 7 })).toBe('7'))

    it('handles nested _id object', () =>
      expect(toIdString({ _id: { _id: 'nested-id' } })).toBe('nested-id'))
  })

  // ── Object with id ──────────────────────────────────────────────────────────
  describe('objects with id (fallback)', () => {
    it('uses .id when ._id is absent', () =>
      expect(toIdString({ id: 'proj-42' })).toBe('proj-42'))

    it('uses numeric .id', () =>
      expect(toIdString({ id: 100 })).toBe('100'))
  })

  // ── toString fallback ───────────────────────────────────────────────────────
  describe('toString() fallback', () => {
    it('uses toString() for objects without _id or id', () => {
      const obj = { toString: () => 'custom-id' }
      expect(toIdString(obj)).toBe('custom-id')
    })

    it('returns "" when toString returns "[object Object]"', () => {
      const obj = {}
      expect(toIdString(obj)).toBe('')
    })

    it('returns "" when toString returns empty string', () => {
      const obj = { toString: () => '' }
      expect(toIdString(obj)).toBe('')
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// formatRelativeTime
// ─────────────────────────────────────────────────────────────────────────────
describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T12:00:00.000Z'))
  })
  afterEach(() => vi.useRealTimers())

  // ── Falsy / invalid inputs ──────────────────────────────────────────────────
  describe('falsy / invalid inputs', () => {
    it('returns "" for null', () => expect(formatRelativeTime(null)).toBe(''))
    it('returns "" for undefined', () => expect(formatRelativeTime(undefined)).toBe(''))
    it('returns "" for empty string', () => expect(formatRelativeTime('')).toBe(''))
    it('returns "" for invalid date string', () =>
      expect(formatRelativeTime('not-a-date')).toBe(''))
  })

  // ── "just now" (< 1 minute) ─────────────────────────────────────────────────
  describe('"just now" range', () => {
    it('returns "just now" for 0 seconds ago', () => {
      const now = new Date('2025-01-01T12:00:00.000Z').toISOString()
      expect(formatRelativeTime(now)).toBe('just now')
    })

    it('returns "just now" for 59 seconds ago', () => {
      const ts = new Date('2025-01-01T11:59:01.000Z').toISOString()
      expect(formatRelativeTime(ts)).toBe('just now')
    })
  })

  // ── Minutes (1–59) ──────────────────────────────────────────────────────────
  describe('minutes range (1m–59m)', () => {
    it('returns "1m ago" for exactly 1 minute ago', () => {
      const ts = new Date('2025-01-01T11:59:00.000Z').toISOString()
      expect(formatRelativeTime(ts)).toBe('1m ago')
    })

    it('returns "30m ago" for 30 minutes ago', () => {
      const ts = new Date('2025-01-01T11:30:00.000Z').toISOString()
      expect(formatRelativeTime(ts)).toBe('30m ago')
    })

    it('returns "59m ago" for 59 minutes ago', () => {
      const ts = new Date('2025-01-01T11:01:00.000Z').toISOString()
      expect(formatRelativeTime(ts)).toBe('59m ago')
    })
  })

  // ── Hours (1h–23h) ──────────────────────────────────────────────────────────
  describe('hours range (1h–23h)', () => {
    it('returns "1h ago" for exactly 1 hour ago', () => {
      const ts = new Date('2025-01-01T11:00:00.000Z').toISOString()
      expect(formatRelativeTime(ts)).toBe('1h ago')
    })

    it('returns "5h ago" for 5 hours ago', () => {
      const ts = new Date('2025-01-01T07:00:00.000Z').toISOString()
      expect(formatRelativeTime(ts)).toBe('5h ago')
    })

    it('returns "23h ago" for 23 hours ago', () => {
      const ts = new Date('2024-12-31T13:00:00.000Z').toISOString()
      expect(formatRelativeTime(ts)).toBe('23h ago')
    })
  })

  // ── Days (1d–6d) ────────────────────────────────────────────────────────────
  describe('days range (1d–6d)', () => {
    it('returns "1d ago" for exactly 1 day ago', () => {
      const ts = new Date('2024-12-31T12:00:00.000Z').toISOString()
      expect(formatRelativeTime(ts)).toBe('1d ago')
    })

    it('returns "3d ago" for 3 days ago', () => {
      const ts = new Date('2024-12-29T12:00:00.000Z').toISOString()
      expect(formatRelativeTime(ts)).toBe('3d ago')
    })

    it('returns "6d ago" for 6 days ago', () => {
      const ts = new Date('2024-12-26T12:00:00.000Z').toISOString()
      expect(formatRelativeTime(ts)).toBe('6d ago')
    })
  })

  // ── Date fallback (>= 7 days) ───────────────────────────────────────────────
  describe('date fallback (>= 7 days)', () => {
    it('returns a locale date string for 7 days ago', () => {
      const ts = new Date('2024-12-25T12:00:00.000Z').toISOString()
      const result = formatRelativeTime(ts)
      // Must not be a relative string — should be a formatted date
      expect(result).not.toMatch(/ago$/)
      expect(result).not.toBe('just now')
      expect(result.length).toBeGreaterThan(0)
    })

    it('returns a locale date string for 30 days ago', () => {
      const ts = new Date('2024-12-02T12:00:00.000Z').toISOString()
      const result = formatRelativeTime(ts)
      expect(result).not.toMatch(/ago$/)
      expect(result.length).toBeGreaterThan(0)
    })

    it('accepts a Date object directly', () => {
      const date = new Date('2025-01-01T11:30:00.000Z')
      expect(formatRelativeTime(date)).toBe('30m ago')
    })

    it('accepts a numeric timestamp', () => {
      const ts = new Date('2025-01-01T11:30:00.000Z').getTime()
      expect(formatRelativeTime(ts)).toBe('30m ago')
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// resolveNotificationPath
// ─────────────────────────────────────────────────────────────────────────────
describe('resolveNotificationPath', () => {
  const make = (overrides = {}) => ({
    metadata: {},
    entityType: '',
    entityId: null,
    link: null,
    actor: null,
    ...overrides,
  })

  // ── postId takes highest priority ──────────────────────────────────────────
  describe('postId priority', () => {
    it('returns /post/:postId when metadata.postId is present', () => {
      const n = make({ metadata: { postId: 'post-001' } })
      expect(resolveNotificationPath(n)).toBe('/post/post-001')
    })

    it('postId wins over follow kind', () => {
      const n = make({
        metadata: { kind: 'follow_request', postId: 'p1', actorId: 'u1' },
      })
      expect(resolveNotificationPath(n)).toBe('/post/p1')
    })

    it('postId wins over entityType=user', () => {
      const n = make({
        metadata: { postId: 'p99' },
        entityType: 'user',
        entityId: 'u1',
      })
      expect(resolveNotificationPath(n)).toBe('/post/p99')
    })
  })

  // ── Follow kinds → profile path ────────────────────────────────────────────
  describe('follow kinds', () => {
    const FOLLOW_KINDS = [
      'follow_request',
      'followed_you',
      'follow_request_accepted',
      'follow_request_rejected',
      'follow_request_cancelled',
    ]

    FOLLOW_KINDS.forEach((kind) => {
      it(`routes ${kind} to /profile/:actorId using metadata.actorId`, () => {
        const n = make({ metadata: { kind, actorId: 'actor-123' } })
        expect(resolveNotificationPath(n)).toBe('/profile/actor-123')
      })
    })

    it('uses actor._id when metadata.actorId is absent', () => {
      const n = make({
        metadata: { kind: 'followed_you' },
        actor: { _id: 'actor-from-obj' },
      })
      expect(resolveNotificationPath(n)).toBe('/profile/actor-from-obj')
    })

    it('falls back to entityId when actorId and actor._id are absent', () => {
      const n = make({
        metadata: { kind: 'follow_request' },
        entityId: 'entity-456',
      })
      expect(resolveNotificationPath(n)).toBe('/profile/entity-456')
    })

    it('falls back to /main when follow kind has no actor or entityId', () => {
      const n = make({ metadata: { kind: 'follow_request' } })
      expect(resolveNotificationPath(n)).toBe('/main')
    })

    it('is case-insensitive for kind matching', () => {
      const n = make({ metadata: { kind: 'FOLLOW_REQUEST', actorId: 'u1' } })
      expect(resolveNotificationPath(n)).toBe('/profile/u1')
    })
  })

  // ── entityType = "user" ─────────────────────────────────────────────────────
  describe('entityType = user', () => {
    it('routes to /profile/:entityId when entityType=user', () => {
      const n = make({ entityType: 'user', entityId: 'u-789' })
      expect(resolveNotificationPath(n)).toBe('/profile/u-789')
    })

    it('is case-insensitive for entityType', () => {
      const n = make({ entityType: 'USER', entityId: 'u-001' })
      expect(resolveNotificationPath(n)).toBe('/profile/u-001')
    })

    it('falls back when entityType=user but entityId is empty', () => {
      const n = make({ entityType: 'user', entityId: '' })
      // No entityId → falls through to link/main
      expect(resolveNotificationPath(n)).toBe('/main')
    })
  })

  // ── link fallback ───────────────────────────────────────────────────────────
  describe('link fallback', () => {
    it('uses notification.link as fallback path', () => {
      const n = make({ link: '/main/feed' })
      expect(resolveNotificationPath(n)).toBe('/main/feed')
    })

    it('prepends / when link is missing leading slash', () => {
      const n = make({ link: 'main/activity' })
      expect(resolveNotificationPath(n)).toBe('/main/activity')
    })

    it('returns /main when link starts with http://', () => {
      const n = make({ link: 'http://evil.com/xss' })
      expect(resolveNotificationPath(n)).toBe('/main')
    })

    it('returns /main when link starts with https://', () => {
      const n = make({ link: 'https://external.site' })
      expect(resolveNotificationPath(n)).toBe('/main')
    })

    it('returns /main when link is null', () => {
      const n = make({ link: null })
      expect(resolveNotificationPath(n)).toBe('/main')
    })

    it('returns /main when link is empty string', () => {
      const n = make({ link: '' })
      expect(resolveNotificationPath(n)).toBe('/main')
    })
  })

  // ── Null / undefined notification ───────────────────────────────────────────
  describe('null / undefined notification', () => {
    it('returns /main for null notification', () =>
      expect(resolveNotificationPath(null)).toBe('/main'))

    it('returns /main for undefined notification', () =>
      expect(resolveNotificationPath(undefined)).toBe('/main'))

    it('returns /main for empty object {}', () =>
      expect(resolveNotificationPath({})).toBe('/main'))
  })

  // ── Combined scenarios ──────────────────────────────────────────────────────
  describe('combined scenarios', () => {
    it('postId + follow kind → returns post path', () => {
      const n = make({
        metadata: { kind: 'followed_you', actorId: 'u1', postId: 'p-abc' },
      })
      expect(resolveNotificationPath(n)).toBe('/post/p-abc')
    })

    it('non-follow kind + entityType=user → returns profile path', () => {
      const n = make({
        metadata: { kind: 'comment' },
        entityType: 'user',
        entityId: 'u-comment',
      })
      expect(resolveNotificationPath(n)).toBe('/profile/u-comment')
    })

    it('unknown kind + no entityType + valid link → uses link', () => {
      const n = make({
        metadata: { kind: 'task_assigned' },
        link: '/main/activity',
      })
      expect(resolveNotificationPath(n)).toBe('/main/activity')
    })

    it('notification with object entityId uses toIdString', () => {
      const n = make({
        entityType: 'user',
        entityId: { _id: 'nested-entity' },
      })
      expect(resolveNotificationPath(n)).toBe('/profile/nested-entity')
    })
  })
})