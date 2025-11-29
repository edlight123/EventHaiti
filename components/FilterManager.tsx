'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import EventSearchFilters from './EventSearchFilters'
import FilterPanel from './FilterPanel'
import { EventFilters, DEFAULT_FILTERS } from '@/lib/filters/types'
import { parseFiltersFromURL, serializeFilters, resetFilters } from '@/lib/filters/utils'

export default function FilterManager() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Parse initial filters from URL
  const [appliedFilters, setAppliedFilters] = useState<EventFilters>(() => 
    parseFiltersFromURL(searchParams)
  )
  const [draftFilters, setDraftFilters] = useState<EventFilters>(appliedFilters)
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  
  const handleOpenFilters = () => {
    // Reset draft to current applied filters when opening
    setDraftFilters(appliedFilters)
    setIsFilterPanelOpen(true)
  }
  
  const handleCloseFilters = () => {
    // Discard draft changes
    setDraftFilters(appliedFilters)
    setIsFilterPanelOpen(false)
  }
  
  const handleApplyFilters = () => {
    // Apply draft filters
    setAppliedFilters(draftFilters)
    setIsFilterPanelOpen(false)
    
    // Update URL
    const params = serializeFilters(draftFilters)
    const newUrl = params.toString() ? `?${params.toString()}` : '/'
    router.push(newUrl, { scroll: false })
  }
  
  const handleResetFilters = () => {
    const reset = resetFilters()
    setDraftFilters(reset)
    setAppliedFilters(reset)
    setIsFilterPanelOpen(false)
    router.push('/', { scroll: false })
  }
  
  return (
    <>
      <EventSearchFilters 
        filters={appliedFilters}
        onOpenFilters={handleOpenFilters}
      />
      
      <FilterPanel
        isOpen={isFilterPanelOpen}
        onClose={handleCloseFilters}
        draftFilters={draftFilters}
        appliedFilters={appliedFilters}
        onDraftChange={setDraftFilters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />
    </>
  )
}
