import React from 'react'

export function DiscoverSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Top Bar Skeleton */}
      <div className="flex gap-3">
        <div className="flex-1 h-11 bg-gray-200 rounded-lg" />
        <div className="w-32 h-11 bg-gray-200 rounded-full hidden md:block" />
        <div className="w-24 h-11 bg-gray-200 rounded-lg" />
      </div>

      {/* Date Chips Skeleton */}
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-9 w-24 bg-gray-200 rounded-full flex-shrink-0" />
        ))}
      </div>

      {/* Section Skeleton */}
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function EventCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      <div className="aspect-[16/10] bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-1/3 mt-4" />
      </div>
    </div>
  )
}
