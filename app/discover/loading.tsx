import LoadingSkeleton from '@/components/ui/LoadingSkeleton'

export default function Loading() {
  // Focus on list skeletons; hero stays minimal
  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="h-10 w-48 bg-gray-200 rounded-md" />
          <div className="h-5 w-72 bg-gray-200 rounded-md mt-3" />
        </div>
        {/* Trending header placeholder */}
        <div className="mb-5">
          <div className="h-8 w-56 bg-gray-200 rounded-md animate-pulse" />
          <div className="h-4 w-64 bg-gray-200 rounded-md mt-1.5 animate-pulse" />
        </div>
        {/* Nearby header placeholder */}
        <div className="mt-11 mb-5">
          <div className="h-8 w-56 bg-gray-200 rounded-md animate-pulse" />
          <div className="h-4 w-48 bg-gray-200 rounded-md mt-1.5 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
