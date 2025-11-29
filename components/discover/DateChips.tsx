'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { DateFilter } from '@/lib/filters/types'
import { FilterChip } from '@/components/FilterChip'
import { X } from 'lucide-react'

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'any', label: 'Any date' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this-week', label: 'This week' },
  { value: 'this-weekend', label: 'This weekend' },
  { value: 'pick-date', label: 'Pick a date' }
]

interface DateChipsProps {
  currentDate: DateFilter
}

export function DateChips({ currentDate }: DateChipsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')

  const handleDateChange = (date: DateFilter) => {
    const params = new URLSearchParams(searchParams)
    
    if (date === 'any') {
      params.delete('date')
      params.delete('pickedDate')
      router.push(`?${params.toString()}`)
    } else if (date === 'pick-date') {
      setShowDatePicker(true)
    } else {
      params.set('date', date)
      params.delete('pickedDate')
      router.push(`?${params.toString()}`)
    }
  }

  const handleDatePickerSubmit = () => {
    if (!selectedDate) return
    
    const params = new URLSearchParams(searchParams)
    params.set('date', 'pick-date')
    params.set('pickedDate', selectedDate)
    router.push(`?${params.toString()}`)
    setShowDatePicker(false)
  }

  const handleDatePickerClose = () => {
    setShowDatePicker(false)
    setSelectedDate('')
  }

  return (
    <>
      <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 min-w-max">
          {DATE_OPTIONS.map(option => (
            <FilterChip
              key={option.value}
              label={option.value === 'pick-date' && currentDate === 'pick-date' && searchParams.get('pickedDate')
                ? new Date(searchParams.get('pickedDate')! + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : option.label
              }
              active={currentDate === option.value}
              onClick={() => handleDateChange(option.value)}
            />
          ))}
        </div>
      </div>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Pick a date</h3>
              <button
                onClick={handleDatePickerClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
              
              <div className="flex gap-3">
                <button
                  onClick={handleDatePickerClose}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDatePickerSubmit}
                  disabled={!selectedDate}
                  className="flex-1 px-4 py-3 bg-black text-white rounded-lg font-medium hover:bg-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
