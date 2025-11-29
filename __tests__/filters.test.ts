/**
 * Unit tests for filter utilities
 */

import { describe, it, expect } from '@jest/globals'
import { getDateRange, countActiveFilters, getPriceRange, hasActiveFilters, filtersEqual } from '../lib/filters/utils'
import { DEFAULT_FILTERS, EventFilters } from '../lib/filters/types'

describe('Filter Utils', () => {
  describe('getDateRange', () => {
    it('should return empty range for "any" filter', () => {
      const range = getDateRange('any')
      expect(range).toEqual({})
    })
    
    it('should return correct range for "today"', () => {
      const range = getDateRange('today')
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      expect(range.start).toBeDefined()
      expect(range.end).toBeDefined()
      expect(range.start?.getTime()).toBe(today.getTime())
      expect(range.end?.getHours()).toBe(23)
      expect(range.end?.getMinutes()).toBe(59)
    })
    
    it('should return correct range for "tomorrow"', () => {
      const range = getDateRange('tomorrow')
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      expect(range.start).toBeDefined()
      expect(range.start?.toDateString()).toBe(tomorrow.toDateString())
    })
    
    it('should return correct range for "this-week"', () => {
      const range = getDateRange('this-week')
      expect(range.start).toBeDefined()
      expect(range.end).toBeDefined()
      
      const daysDiff = Math.ceil((range.end!.getTime() - range.start!.getTime()) / (1000 * 60 * 60 * 24))
      expect(daysDiff).toBe(7)
    })
    
    it('should return correct range for "this-weekend" (next Saturday-Sunday)', () => {
      const range = getDateRange('this-weekend')
      expect(range.start).toBeDefined()
      expect(range.end).toBeDefined()
      
      // Start should be Saturday (day 6)
      expect(range.start?.getDay()).toBe(6)
      // End should be Sunday (day 0)
      expect(range.end?.getDay()).toBe(0)
      
      // End should be the day after start
      const daysDiff = (range.end!.getTime() - range.start!.getTime()) / (1000 * 60 * 60 * 24)
      expect(Math.round(daysDiff)).toBe(1)
    })
    
    it('should return correct range for "pick-date" with a date', () => {
      const pickedDate = '2025-12-25'
      const range = getDateRange('pick-date', pickedDate)
      
      expect(range.start).toBeDefined()
      expect(range.end).toBeDefined()
      expect(range.start?.toISOString().split('T')[0]).toBe(pickedDate)
      expect(range.end?.getHours()).toBe(23)
      expect(range.end?.getMinutes()).toBe(59)
    })
    
    it('should return empty range for "pick-date" without a date', () => {
      const range = getDateRange('pick-date')
      expect(range).toEqual({})
    })
  })
  
  describe('getPriceRange', () => {
    it('should return empty range for "any" filter', () => {
      const range = getPriceRange('any')
      expect(range).toEqual({})
    })
    
    it('should return 0-0 range for "free" filter', () => {
      const range = getPriceRange('free')
      expect(range).toEqual({ min: 0, max: 0 })
    })
    
    it('should return correct range for "<=500" filter', () => {
      const range = getPriceRange('<=500')
      expect(range.min).toBe(0)
      expect(range.max).toBe(500)
    })
    
    it('should return correct range for ">500" filter', () => {
      const range = getPriceRange('>500')
      expect(range.min).toBe(500)
      expect(range.max).toBeUndefined()
    })
  })
  
  describe('countActiveFilters', () => {
    it('should return 0 for default filters', () => {
      const count = countActiveFilters(DEFAULT_FILTERS)
      expect(count).toBe(0)
    })
    
    it('should count date filter', () => {
      const filters: EventFilters = {
        ...DEFAULT_FILTERS,
        date: 'today'
      }
      expect(countActiveFilters(filters)).toBe(1)
    })
    
    it('should count city filter', () => {
      const filters: EventFilters = {
        ...DEFAULT_FILTERS,
        city: 'Port-au-Prince'
      }
      expect(countActiveFilters(filters)).toBe(1)
    })
    
    it('should count commune filter', () => {
      const filters: EventFilters = {
        ...DEFAULT_FILTERS,
        city: 'Port-au-Prince',
        commune: 'Pétion-Ville'
      }
      expect(countActiveFilters(filters)).toBe(2)
    })
    
    it('should count categories filter', () => {
      const filters: EventFilters = {
        ...DEFAULT_FILTERS,
        categories: ['Music', 'Sports']
      }
      expect(countActiveFilters(filters)).toBe(1)
    })
    
    it('should count price filter', () => {
      const filters: EventFilters = {
        ...DEFAULT_FILTERS,
        price: 'free'
      }
      expect(countActiveFilters(filters)).toBe(1)
    })
    
    it('should count event type filter', () => {
      const filters: EventFilters = {
        ...DEFAULT_FILTERS,
        eventType: 'online'
      }
      expect(countActiveFilters(filters)).toBe(1)
    })
    
    it('should count multiple active filters', () => {
      const filters: EventFilters = {
        date: 'today',
        city: 'Port-au-Prince',
        commune: 'Pétion-Ville',
        categories: ['Music', 'Sports'],
        price: 'free',
        eventType: 'online',
        sortBy: 'date'
      }
      expect(countActiveFilters(filters)).toBe(5)
    })
  })
  
  describe('hasActiveFilters', () => {
    it('should return false for default filters', () => {
      expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false)
    })
    
    it('should return true when filters are active', () => {
      const filters: EventFilters = {
        ...DEFAULT_FILTERS,
        city: 'Port-au-Prince'
      }
      expect(hasActiveFilters(filters)).toBe(true)
    })
  })
  
  describe('filtersEqual', () => {
    it('should return true for identical filters', () => {
      const filters1: EventFilters = {
        date: 'today',
        city: 'Port-au-Prince',
        categories: ['Music'],
        price: 'free',
        eventType: 'online',
        sortBy: 'date'
      }
      const filters2 = { ...filters1 }
      expect(filtersEqual(filters1, filters2)).toBe(true)
    })
    
    it('should return false for different date filters', () => {
      const filters1: EventFilters = { ...DEFAULT_FILTERS, date: 'today' }
      const filters2: EventFilters = { ...DEFAULT_FILTERS, date: 'tomorrow' }
      expect(filtersEqual(filters1, filters2)).toBe(false)
    })
    
    it('should return false for different categories', () => {
      const filters1: EventFilters = { ...DEFAULT_FILTERS, categories: ['Music'] }
      const filters2: EventFilters = { ...DEFAULT_FILTERS, categories: ['Sports'] }
      expect(filtersEqual(filters1, filters2)).toBe(false)
    })
    
    it('should handle undefined values correctly', () => {
      const filters1: EventFilters = { ...DEFAULT_FILTERS, pickedDate: undefined }
      const filters2: EventFilters = { ...DEFAULT_FILTERS, pickedDate: undefined }
      expect(filtersEqual(filters1, filters2)).toBe(true)
    })
  })
})
