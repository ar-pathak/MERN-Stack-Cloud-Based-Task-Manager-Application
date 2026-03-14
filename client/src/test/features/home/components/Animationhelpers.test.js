import { describe, it, expect } from 'vitest'
import { fadeUp, stagger } from '../../../../features/home/components/AnimationHelpers'

describe('AnimationHelpers', () => {
  describe('fadeUp', () => {
    it('should have a hidden state with opacity 0 and y 24', () => {
      expect(fadeUp.hidden).toEqual({ opacity: 0, y: 24 })
    })

    it('should have a visible state with opacity 1 and y 0', () => {
      expect(fadeUp.visible).toEqual({ opacity: 1, y: 0 })
    })

    it('should export fadeUp as an object', () => {
      expect(typeof fadeUp).toBe('object')
    })

    it('should have both hidden and visible keys', () => {
      expect(fadeUp).toHaveProperty('hidden')
      expect(fadeUp).toHaveProperty('visible')
    })
  })

  describe('stagger', () => {
    it('should have an empty hidden state', () => {
      expect(stagger.hidden).toEqual({})
    })

    it('should have a visible state with transition', () => {
      expect(stagger.visible).toHaveProperty('transition')
    })

    it('should have staggerChildren of 0.15 in visible transition', () => {
      expect(stagger.visible.transition).toEqual({ staggerChildren: 0.15 })
    })

    it('should export stagger as an object', () => {
      expect(typeof stagger).toBe('object')
    })

    it('should have both hidden and visible keys', () => {
      expect(stagger).toHaveProperty('hidden')
      expect(stagger).toHaveProperty('visible')
    })
  })
})