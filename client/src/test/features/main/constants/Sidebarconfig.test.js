import { describe, it, expect } from 'vitest'
import { NAV_ITEMS, COLOR_THEMES } from '../constants/sidebarConfig'

// ─── Pure data file — zero mocks needed ───────────────────────────────────────

describe('sidebarConfig', () => {

    // ────────────────────────────────────────────────────────────────────────────
    // NAV_ITEMS
    // ────────────────────────────────────────────────────────────────────────────
    describe('NAV_ITEMS', () => {
        it('is an array', () => {
            expect(Array.isArray(NAV_ITEMS)).toBe(true)
        })

        it('contains exactly 6 items', () => {
            expect(NAV_ITEMS).toHaveLength(6)
        })

        // ── Shape checks ──────────────────────────────────────────────────────────
        it('every item has required keys: label, icon, path, exact, description, color', () => {
            NAV_ITEMS.forEach((item, i) => {
                expect(item, `item[${i}]`).toHaveProperty('label')
                expect(item, `item[${i}]`).toHaveProperty('icon')
                expect(item, `item[${i}]`).toHaveProperty('path')
                expect(item, `item[${i}]`).toHaveProperty('exact')
                expect(item, `item[${i}]`).toHaveProperty('description')
                expect(item, `item[${i}]`).toHaveProperty('color')
            })
        })

        it('all label values are non-empty strings', () => {
            NAV_ITEMS.forEach(item => {
                expect(typeof item.label).toBe('string')
                expect(item.label.length).toBeGreaterThan(0)
            })
        })

        it('all path values start with /main', () => {
            NAV_ITEMS.forEach(item => {
                expect(item.path).toMatch(/^\/main/)
            })
        })

        it('all exact values are boolean true', () => {
            NAV_ITEMS.forEach(item => {
                expect(item.exact).toBe(true)
            })
        })

        it('all color values are strings', () => {
            NAV_ITEMS.forEach(item => {
                expect(typeof item.color).toBe('string')
            })
        })

        it('all paths are unique', () => {
            const paths = NAV_ITEMS.map(i => i.path)
            expect(new Set(paths).size).toBe(paths.length)
        })

        it('all labels are unique', () => {
            const labels = NAV_ITEMS.map(i => i.label)
            expect(new Set(labels).size).toBe(labels.length)
        })

        // ── Individual item assertions ──────────────────────────────────────────
        it('first item is Overview at /main with icon Cloud', () => {
            expect(NAV_ITEMS[0]).toMatchObject({
                label: 'Overview',
                icon: 'Cloud',
                path: '/main',
                exact: true,
                description: 'Workspace overview',
                color: 'sky',
            })
        })

        it('second item is Feed at /main/feed with icon Newspaper', () => {
            expect(NAV_ITEMS[1]).toMatchObject({
                label: 'Feed',
                icon: 'Newspaper',
                path: '/main/feed',
                color: 'emerald',
            })
        })

        it('third item is Activity at /main/activity with icon Activity', () => {
            expect(NAV_ITEMS[2]).toMatchObject({
                label: 'Activity',
                icon: 'Activity',
                path: '/main/activity',
                color: 'rose',
            })
        })

        it('fourth item is Dashboard at /main/dashboard with icon BarChart3', () => {
            expect(NAV_ITEMS[3]).toMatchObject({
                label: 'Dashboard',
                icon: 'BarChart3',
                path: '/main/dashboard',
                color: 'violet',
            })
        })

        it('fifth item is Support at /main/support with icon LifeBuoy', () => {
            expect(NAV_ITEMS[4]).toMatchObject({
                label: 'Support',
                icon: 'LifeBuoy',
                path: '/main/support',
                color: 'cyan',
            })
        })

        it('sixth item is Create at /main/create with icon SquarePen', () => {
            expect(NAV_ITEMS[5]).toMatchObject({
                label: 'Create',
                icon: 'SquarePen',
                path: '/main/create',
                color: 'amber',
            })
        })
    })

    // ────────────────────────────────────────────────────────────────────────────
    // COLOR_THEMES
    // ────────────────────────────────────────────────────────────────────────────
    describe('COLOR_THEMES', () => {
        const EXPECTED_COLORS = ['sky', 'violet', 'emerald', 'amber', 'rose', 'cyan']
        const REQUIRED_KEYS = [
            'bg', 'bgInactive', 'border', 'text', 'textInactive',
            'icon', 'iconInactive', 'glow', 'hover', 'gradient',
        ]

        it('is a plain object', () => {
            expect(typeof COLOR_THEMES).toBe('object')
            expect(COLOR_THEMES).not.toBeNull()
            expect(Array.isArray(COLOR_THEMES)).toBe(false)
        })

        it('contains exactly 6 color themes', () => {
            expect(Object.keys(COLOR_THEMES)).toHaveLength(6)
        })

        it('contains all expected color keys', () => {
            EXPECTED_COLORS.forEach(color => {
                expect(COLOR_THEMES, `missing theme: ${color}`).toHaveProperty(color)
            })
        })

        it('every theme has all required property keys', () => {
            EXPECTED_COLORS.forEach(color => {
                const theme = COLOR_THEMES[color]
                REQUIRED_KEYS.forEach(key => {
                    expect(theme, `${color} missing key: ${key}`).toHaveProperty(key)
                })
            })
        })

        it('every theme property value is a non-empty string', () => {
            EXPECTED_COLORS.forEach(color => {
                const theme = COLOR_THEMES[color]
                REQUIRED_KEYS.forEach(key => {
                    expect(typeof theme[key], `${color}.${key}`).toBe('string')
                    expect(theme[key].length, `${color}.${key} is empty`).toBeGreaterThan(0)
                })
            })
        })

        // ── bg values follow the expected Tailwind pattern ──────────────────────
        it('bg values contain /20 opacity modifier', () => {
            EXPECTED_COLORS.forEach(color => {
                expect(COLOR_THEMES[color].bg).toMatch(/\/20$/)
            })
        })

        it('bgInactive values contain /5 opacity modifier', () => {
            EXPECTED_COLORS.forEach(color => {
                expect(COLOR_THEMES[color].bgInactive).toMatch(/\/5$/)
            })
        })

        it('hover values start with hover:', () => {
            EXPECTED_COLORS.forEach(color => {
                expect(COLOR_THEMES[color].hover).toMatch(/^hover:/)
            })
        })

        it('gradient values start with from-', () => {
            EXPECTED_COLORS.forEach(color => {
                expect(COLOR_THEMES[color].gradient).toMatch(/^from-/)
            })
        })

        it('glow values contain shadow-[', () => {
            EXPECTED_COLORS.forEach(color => {
                expect(COLOR_THEMES[color].glow).toContain('shadow-[')
            })
        })

        it('border values start with border-', () => {
            EXPECTED_COLORS.forEach(color => {
                expect(COLOR_THEMES[color].border).toMatch(/^border-/)
            })
        })

        // ── Spot-checks per theme ──────────────────────────────────────────────
        it('sky theme has correct bg and gradient', () => {
            expect(COLOR_THEMES.sky.bg).toBe('bg-sky-500/20')
            expect(COLOR_THEMES.sky.gradient).toBe('from-sky-400 to-cyan-400')
            expect(COLOR_THEMES.sky.icon).toBe('text-sky-300')
        })

        it('violet theme has correct bg and gradient', () => {
            expect(COLOR_THEMES.violet.bg).toBe('bg-violet-500/20')
            expect(COLOR_THEMES.violet.gradient).toBe('from-violet-400 to-purple-400')
        })

        it('emerald theme has correct bg and gradient', () => {
            expect(COLOR_THEMES.emerald.bg).toBe('bg-emerald-500/20')
            expect(COLOR_THEMES.emerald.gradient).toBe('from-emerald-400 to-teal-400')
        })

        it('amber theme has correct bg and gradient', () => {
            expect(COLOR_THEMES.amber.bg).toBe('bg-amber-500/20')
            expect(COLOR_THEMES.amber.gradient).toBe('from-amber-400 to-orange-400')
        })

        it('rose theme has correct bg and gradient', () => {
            expect(COLOR_THEMES.rose.bg).toBe('bg-rose-500/20')
            expect(COLOR_THEMES.rose.gradient).toBe('from-rose-400 to-pink-400')
        })

        it('cyan theme has correct bg and gradient', () => {
            expect(COLOR_THEMES.cyan.bg).toBe('bg-cyan-500/20')
            expect(COLOR_THEMES.cyan.gradient).toBe('from-cyan-400 to-sky-400')
        })

        // ── NAV_ITEMS colors all exist in COLOR_THEMES ─────────────────────────
        it('every NAV_ITEMS color has a corresponding COLOR_THEMES entry', () => {
            NAV_ITEMS.forEach(item => {
                expect(COLOR_THEMES, `no theme for color "${item.color}"`).toHaveProperty(item.color)
            })
        })
    })
})