'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FilterChip } from '@/components/FilterChip'
import { CATEGORIES } from '@/lib/filters/config'

interface CategoryChipsProps {
  selectedCategories: string[]
}

export function CategoryChips({ selectedCategories }: CategoryChipsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleCategoryToggle = (category: string) => {
    const params = new URLSearchParams(searchParams)
    const current = params.getAll('category')
    
    let updated: string[]
    if (current.includes(category)) {
      updated = current.filter(c => c !== category)
    } else {
      updated = [...current, category]
    }
    
    params.delete('category')
    updated.forEach(cat => params.append('category', cat))
    
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-2 min-w-max">
        {CATEGORIES.map(category => (
          <FilterChip
            key={category}
            label={category}
            active={selectedCategories.includes(category)}
            onClick={() => handleCategoryToggle(category)}
          />
        ))}
      </div>
    </div>
  )
}
