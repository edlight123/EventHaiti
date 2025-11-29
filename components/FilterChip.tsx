import React from 'react'

interface FilterChipProps {
  label: string
  active?: boolean
  onClick?: () => void
  onRemove?: () => void
  className?: string
}

export function FilterChip({ label, active, onClick, onRemove, className = '' }: FilterChipProps) {
  if (onRemove) {
    // Removable chip (for applied filters)
    return (
      <button
        onClick={onRemove}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors
          bg-black text-white hover:bg-black/80 ${className}`}
      >
        {label}
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    )
  }

  // Selectable chip (for filter options)
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all
        ${active 
          ? 'bg-black text-white shadow-sm' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        } ${className}`}
    >
      {label}
    </button>
  )
}
