'use client'

import { format } from 'date-fns'
import { AlertCircle, Check } from 'lucide-react'

interface Event {
  id: string
  title: string
  start_datetime: string
  city: string
  is_published: boolean
  organizer_name: string
  organizer_email: string
  reports_count?: number
}

interface AdminEventsTableProps {
  events: Event[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  onRowClick: (event: Event) => void
}

export function AdminEventsTable({
  events,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick
}: AdminEventsTableProps) {
  const allSelected = events.length > 0 && events.every(e => selectedIds.has(e.id))
  const someSelected = events.some(e => selectedIds.has(e.id)) && !allSelected

  return (
    <div className="bg-white">
      {/* Mobile: Cards */}
      <div className="md:hidden divide-y divide-gray-100">
        {events.map((event) => (
          <div
            key={event.id}
            onClick={() => onRowClick(event)}
            className="p-4 hover:bg-gray-50 cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedIds.has(event.id)}
                onChange={(e) => {
                  e.stopPropagation()
                  onToggleSelect(event.id)
                }}
                className="mt-1 w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                    {event.title}
                  </h4>
                  {event.reports_count && event.reports_count > 0 && (
                    <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                      <AlertCircle className="w-3 h-3" />
                      {event.reports_count}
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-xs text-gray-600">
                  <div>{format(new Date(event.start_datetime), 'MMM d, yyyy')}</div>
                  <div>{event.city}</div>
                  <div>{event.organizer_name}</div>
                </div>

                <div className="mt-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    event.is_published
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {event.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-6 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected
                  }}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Event
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                City
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Organizer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reports
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {events.map((event) => (
              <tr
                key={event.id}
                onClick={() => onRowClick(event)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(event.id)}
                    onChange={(e) => {
                      e.stopPropagation()
                      onToggleSelect(event.id)
                    }}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900 line-clamp-1">
                    {event.title}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {format(new Date(event.start_datetime), 'MMM d, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {event.city}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    event.is_published
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {event.is_published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{event.organizer_name}</div>
                  <div className="text-xs text-gray-500">{event.organizer_email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {event.reports_count && event.reports_count > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                      <AlertCircle className="w-3 h-3" />
                      {event.reports_count}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {events.length === 0 && (
        <div className="p-12 text-center">
          <p className="text-gray-500">No events found</p>
        </div>
      )}
    </div>
  )
}
