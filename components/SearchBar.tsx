'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchBar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [location, setLocation] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (location) params.set('location', location)
    
    if (params.toString()) {
      router.push(`/?${params.toString()}`)
    }
  }

  return (
    <form onSubmit={handleSearch} className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Search Input */}
          <div className="flex-1 flex items-center px-4 py-3 border-b md:border-b-0 md:border-r border-gray-200">
            <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search for events"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full outline-none text-gray-900 placeholder-gray-500"
            />
          </div>

          {/* Location Dropdown */}
          <div className="flex items-center px-4 py-3 border-b md:border-b-0 md:border-r border-gray-200 min-w-[200px]">
            <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full outline-none text-gray-900 bg-transparent cursor-pointer"
            >
              <option value="">All Haiti</option>
              <option value="Port-au-Prince">Port-au-Prince</option>
              <option value="Cap-Haïtien">Cap-Haïtien</option>
              <option value="Jacmel">Jacmel</option>
              <option value="Gonaïves">Gonaïves</option>
              <option value="Les Cayes">Les Cayes</option>
              <option value="Pétion-Ville">Pétion-Ville</option>
              <option value="Saint-Marc">Saint-Marc</option>
            </select>
          </div>

          {/* Search Button */}
          <button
            type="submit"
            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-8 py-3 transition-colors"
          >
            Search
          </button>
        </div>
      </div>
    </form>
  )
}
