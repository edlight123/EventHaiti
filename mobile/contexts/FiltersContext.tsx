import React, { createContext, useContext, useState, ReactNode } from 'react';
import { EventFilters, DEFAULT_FILTERS } from '../types/filters';

interface FiltersContextType {
  // Current applied filters
  appliedFilters: EventFilters;
  
  // Draft filters (being edited in modal)
  draftFilters: EventFilters;
  
  // Modal state
  isModalOpen: boolean;
  
  // Actions
  setDraftFilters: (filters: EventFilters) => void;
  openFiltersModal: () => void;
  closeFiltersModal: () => void;
  applyFilters: () => void;
  applyFiltersDirectly: (filters: EventFilters) => void; // Apply filters directly without draft
  resetFilters: () => void;
  
  // Utilities
  hasActiveFilters: () => boolean;
  countActiveFilters: () => number;
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [appliedFilters, setAppliedFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openFiltersModal = () => {
    // Copy current applied filters to draft when opening
    setDraftFilters({ ...appliedFilters });
    setIsModalOpen(true);
  };

  const closeFiltersModal = () => {
    // Revert draft to applied filters when closing without applying
    setDraftFilters({ ...appliedFilters });
    setIsModalOpen(false);
  };

  const applyFilters = () => {
    // Apply draft filters and close modal
    setAppliedFilters({ ...draftFilters });
    setIsModalOpen(false);
  };

  const applyFiltersDirectly = (filters: EventFilters) => {
    // Apply filters directly, bypassing draft state
    // Useful for programmatic filter application (e.g., category navigation)
    setAppliedFilters(filters);
    setDraftFilters(filters);
  };

  const resetFilters = () => {
    // Reset to defaults
    setAppliedFilters(DEFAULT_FILTERS);
    setDraftFilters(DEFAULT_FILTERS);
    setIsModalOpen(false);
  };

  const hasActiveFilters = (): boolean => {
    return countActiveFilters() > 0;
  };

  const countActiveFilters = (): number => {
    let count = 0;
    
    if (appliedFilters.date !== DEFAULT_FILTERS.date) count++;
    if ((appliedFilters.country || 'HT') !== (DEFAULT_FILTERS.country || 'HT')) count++;
    if (appliedFilters.city !== DEFAULT_FILTERS.city) count++;
    if (appliedFilters.categories.length > 0) count++;
    if (appliedFilters.price !== DEFAULT_FILTERS.price) count++;
    if (appliedFilters.eventType !== DEFAULT_FILTERS.eventType) count++;
    
    return count;
  };

  return (
    <FiltersContext.Provider
      value={{
        appliedFilters,
        draftFilters,
        isModalOpen,
        setDraftFilters,
        openFiltersModal,
        closeFiltersModal,
        applyFilters,
        applyFiltersDirectly,
        resetFilters,
        hasActiveFilters,
        countActiveFilters
      }}
    >
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FiltersContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FiltersProvider');
  }
  return context;
}
