export default function EventCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 animate-pulse">
      {/* Banner Skeleton */}
      <div className="h-48 bg-gray-200"></div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Category Badge */}
        <div className="h-6 bg-gray-200 rounded-full w-24"></div>

        {/* Title */}
        <div className="space-y-2">
          <div className="h-5 bg-gray-200 rounded w-full"></div>
          <div className="h-5 bg-gray-200 rounded w-3/4"></div>
        </div>

        {/* Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
            <div className="h-4 bg-gray-200 rounded w-40"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-3 bg-gray-200 rounded w-20"></div>
            <div className="h-3 bg-gray-200 rounded w-12"></div>
          </div>
          <div className="h-2.5 bg-gray-200 rounded-full w-full"></div>
        </div>

        {/* Revenue & Check-ins */}
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 bg-gray-200 rounded-lg"></div>
          <div className="h-16 bg-gray-200 rounded-lg"></div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <div className="flex-1 h-9 bg-gray-200 rounded-lg"></div>
          <div className="flex-1 h-9 bg-gray-200 rounded-lg"></div>
          <div className="h-9 w-9 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    </div>
  )
}
