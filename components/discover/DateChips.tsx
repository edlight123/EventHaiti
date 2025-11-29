'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { DateFilter } from '@/lib/filters/types'
import { FilterChip } from '@/components/FilterChip'

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

  const handleDateChange = (date: DateFilter) => {
    const params = new URLSearchParams(searchParams)
    
    if (date === 'any') {
      params.delete('date')
      params.delete('pickedDate')
    } else {
      params.set('date', date)
      if (date !== 'pick-date') {
        params.delete('pickedDate')
      }
    }
    
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-2 min-w-max">
        {DATE_OPTIONS.map(option => (
          <FilterChip
            key={option.value}
            label={option.label}
            active={currentDate === option.value}
            onClick={() => handleDateChange(option.value)}
          />
        ))}
      </div>
    </div>
  )
}
