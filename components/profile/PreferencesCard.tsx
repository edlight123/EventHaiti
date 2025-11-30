'use client'

import { useState, useEffect } from 'react'
import { MapPin, Tag, Globe, Info } from 'lucide-react'
import { CITIES, CITY_CONFIG, CATEGORIES, getLocationTypeLabel, getSubdivisions } from '@/lib/filters/config'
import type { UserProfile } from '@/lib/firestore/user-profile'

interface PreferencesCardProps {
  profile: UserProfile
  onUpdate: (updates: Partial<UserProfile>) => Promise<void>
}

export function PreferencesCard({ profile, onUpdate }: PreferencesCardProps) {
  const [defaultCity, setDefaultCity] = useState(profile.defaultCity || '')
  const [defaultSubarea, setDefaultSubarea] = useState(profile.defaultSubarea || '')
  const [favoriteCategories, setFavoriteCategories] = useState<string[]>(profile.favoriteCategories || [])
  const [language, setLanguage] = useState(profile.language || 'en')
  const [isUpdating, setIsUpdating] = useState(false)

  // Get current subdivisions based on selected city
  const subdivisions = defaultCity ? getSubdivisions(defaultCity) : []
  const subareaType = defaultCity ? CITY_CONFIG[defaultCity]?.type.toUpperCase() : 'COMMUNE'
  const subareaLabel = defaultCity ? getLocationTypeLabel(defaultCity) : 'Area'

  // Reset subarea when city changes
  useEffect(() => {
    if (defaultCity && !subdivisions.includes(defaultSubarea)) {
      setDefaultSubarea('')
    }
  }, [defaultCity, defaultSubarea, subdivisions])

  const handleCityChange = async (city: string) => {
    setDefaultCity(city)
    setDefaultSubarea('') // Reset subarea
    setIsUpdating(true)
    try {
      await onUpdate({ 
        defaultCity: city,
        defaultSubarea: '',
        subareaType: CITY_CONFIG[city]?.type.toUpperCase() as 'COMMUNE' | 'NEIGHBORHOOD'
      })
    } catch (error) {
      console.error('Failed to update city:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSubareaChange = async (subarea: string) => {
    setDefaultSubarea(subarea)
    setIsUpdating(true)
    try {
      await onUpdate({ defaultSubarea: subarea })
    } catch (error) {
      console.error('Failed to update subarea:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCategoryToggle = async (category: string) => {
    const newCategories = favoriteCategories.includes(category)
      ? favoriteCategories.filter(c => c !== category)
      : [...favoriteCategories, category]
    
    setFavoriteCategories(newCategories)
    setIsUpdating(true)
    try {
      await onUpdate({ favoriteCategories: newCategories })
    } catch (error) {
      console.error('Failed to update categories:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleLanguageChange = async (lang: 'en' | 'fr' | 'ht') => {
    setLanguage(lang)
    setIsUpdating(true)
    try {
      await onUpdate({ language: lang })
    } catch (error) {
      console.error('Failed to update language:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Preferences</h2>
        <p className="text-sm text-gray-600">Customize your event discovery experience</p>
      </div>

      <div className="space-y-6">
        {/* Default Location Pill */}
        {defaultCity && defaultSubarea && (
          <div className="bg-gradient-to-r from-teal-50 to-purple-50 border border-teal-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-1">
                  Default Location (Used by Discover)
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {defaultCity} • {defaultSubarea}
                </p>
                <p className="text-xs text-teal-600 mt-1">
                  Events near this location will be prioritized in your feed
                </p>
              </div>
            </div>
          </div>
        )}

        {/* City Selector */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <MapPin className="w-4 h-4" />
            Default City
          </label>
          <select
            value={defaultCity}
            onChange={(e) => handleCityChange(e.target.value)}
            disabled={isUpdating}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Select a city...</option>
            {CITIES.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        {/* Subarea Selector */}
        {defaultCity && subdivisions.length > 0 && (
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <MapPin className="w-4 h-4" />
              {subareaLabel}
            </label>
            <select
              value={defaultSubarea}
              onChange={(e) => handleSubareaChange(e.target.value)}
              disabled={isUpdating}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select a {subareaLabel.toLowerCase()}...</option>
              {subdivisions.map(subarea => (
                <option key={subarea} value={subarea}>{subarea}</option>
              ))}
            </select>
          </div>
        )}

        {/* Favorite Categories */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <Tag className="w-4 h-4" />
            Favorite Categories
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(category => {
              const isSelected = favoriteCategories.includes(category)
              return (
                <button
                  key={category}
                  onClick={() => handleCategoryToggle(category)}
                  disabled={isUpdating}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50 ${
                    isSelected
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Select your interests to get personalized event recommendations
          </p>
        </div>

        {/* Language Selector */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Globe className="w-4 h-4" />
            Language
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { code: 'en' as const, label: 'English' },
              { code: 'fr' as const, label: 'Français' },
              { code: 'ht' as const, label: 'Kreyòl' }
            ].map(({ code, label }) => (
              <button
                key={code}
                onClick={() => handleLanguageChange(code)}
                disabled={isUpdating}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${
                  language === code
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
