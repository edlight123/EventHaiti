import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { EventFilters, DEFAULT_FILTERS } from '../types/filters';
import { useAuth } from './AuthContext';
import { getDeviceLocationInfo, getSupportedCountry } from '../utils/deviceLocation';

interface FiltersContextType {
  // Current applied filters
  appliedFilters: EventFilters;
  
  // Draft filters (being edited in modal)
  draftFilters: EventFilters;
  
  // Modal state
  isModalOpen: boolean;
  
  // User's default country (from profile or device)
  userCountry: string;
  
  // Actions
  setDraftFilters: (filters: EventFilters) => void;
  openFiltersModal: () => void;
  closeFiltersModal: () => void;
  applyFilters: () => void;
  applyFiltersDirectly: (filters: EventFilters) => void; // Apply filters directly without draft
  resetFilters: () => void;
  setUserCountry: (country: string) => void;
  
  // Utilities
  hasActiveFilters: () => boolean;
  countActiveFilters: () => number;
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const { userProfile } = useAuth();
  
  // Get initial country from device locale
  const deviceLocation = getDeviceLocationInfo();
  const initialCountry = deviceLocation.country;
  
  const [userCountry, setUserCountry] = useState<string>(initialCountry);
  const [appliedFilters, setAppliedFilters] = useState<EventFilters>({
    ...DEFAULT_FILTERS,
    country: initialCountry,
  });
  const [draftFilters, setDraftFilters] = useState<EventFilters>({
    ...DEFAULT_FILTERS,
    country: initialCountry,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Update filters when user profile loads (profile country takes precedence)
  useEffect(() => {
    if (userProfile?.default_country) {
      const profileCountry = getSupportedCountry(userProfile.default_country);
      console.log('[FiltersContext] Setting country from profile:', profileCountry);
      setUserCountry(profileCountry);
      setAppliedFilters(prev => ({ ...prev, country: profileCountry }));
      setDraftFilters(prev => ({ ...prev, country: profileCountry }));
    }
  }, [userProfile?.default_country]);

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
    // Reset to defaults but keep the user's country
    const resetWithCountry = { ...DEFAULT_FILTERS, country: userCountry };
    setAppliedFilters(resetWithCountry);
    setDraftFilters(resetWithCountry);
    setIsModalOpen(false);
  };

  const hasActiveFilters = (): boolean => {
    return countActiveFilters() > 0;
  };

  const countActiveFilters = (): number => {
    let count = 0;
    
    if (appliedFilters.date !== DEFAULT_FILTERS.date) count++;
    // Don't count country as an "active filter" since it's auto-set
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
        userCountry,
        setDraftFilters,
        openFiltersModal,
        closeFiltersModal,
        applyFilters,
        applyFiltersDirectly,
        resetFilters,
        setUserCountry,
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
