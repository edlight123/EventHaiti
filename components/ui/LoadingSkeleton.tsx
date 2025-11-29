'use client'

interface LoadingSkeletonProps {
  rows?: number
  className?: string
  animated?: boolean // controls shimmer on rows; defaults to true
}

export default function LoadingSkeleton({ rows = 6, className = '', animated = true }: LoadingSkeletonProps) {
  return (
    <div className={`${animated ? 'animate-pulse' : ''} ${className}`}>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 mb-3">
          <div className="h-16 w-16 rounded-lg bg-gray-200" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/5 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-2/5" />
          </div>
        </div>
      ))}
    </div>
  )
}