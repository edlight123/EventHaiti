'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'

type AdminUsersClientProps = {
  counts: {
    total: number
    organizers: number
    verified: number
  }
  selectedUser?: any | null
  promoteToOrganizer: (formData: FormData) => void
}

export default function AdminUsersClient({
  counts,
  selectedUser = null,
  promoteToOrganizer,
}: AdminUsersClientProps) {
  const { t } = useTranslation('admin')

  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)

  const canPromoteSelected = useMemo(() => {
    if (!selectedUser) return false
    if (selectedUser.role === 'organizer') return false
    return Boolean(selectedUser.is_verified) || Boolean(selectedUser.is_organizer)
  }, [selectedUser])

  useEffect(() => {
    setSearchError(null)
  }, [query])

  const runSearch = async () => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }

    setIsSearching(true)
    setSearchError(null)

    try {
      const res = await fetch('/api/admin/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Search failed')
      }

      const data = await res.json()
      const all = Array.isArray(data?.results) ? data.results : []
      const usersOnly = all.filter((r: any) => r?.type === 'user')
      setResults(usersOnly)
    } catch (err: any) {
      setSearchError(err?.message || 'Search failed')
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      <div className="mb-4 sm:mb-6">
        <Link href="/admin" className="text-teal-600 hover:text-teal-700 text-[13px] sm:text-sm font-medium">
          {t('users.back_to_dashboard')}
        </Link>
      </div>

      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('users.title')}</h1>
        <p className="text-[13px] sm:text-base text-gray-600 mt-1 sm:mt-2">{t('users.subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="flex overflow-x-auto gap-3 sm:gap-6 mb-6 sm:mb-8 pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 scrollbar-hide">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 min-w-[180px] snap-start flex-shrink-0">
          <div className="text-[11px] sm:text-sm font-medium text-gray-600 uppercase tracking-wide">{t('users.total_users')}</div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{counts.total}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 min-w-[180px] snap-start flex-shrink-0">
          <div className="text-[11px] sm:text-sm font-medium text-gray-600 uppercase tracking-wide">{t('users.organizers')}</div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">
            {counts.organizers}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 min-w-[180px] snap-start flex-shrink-0">
          <div className="text-[11px] sm:text-sm font-medium text-gray-600 uppercase tracking-wide">{t('users.verified_organizers')}</div>
          <div className="text-2xl sm:text-3xl font-bold text-teal-600 mt-1 sm:mt-2">
            {counts.verified}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('users.search_users')}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="button"
            onClick={runSearch}
            disabled={isSearching || query.trim().length < 2}
            className="px-4 py-2.5 text-sm font-medium rounded-lg transition-colors bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50"
          >
            {isSearching ? t('users.loading') : t('users.search')}
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">{t('users.search_hint')}</div>
        {searchError && <div className="mt-3 text-sm text-red-600">{searchError}</div>}

        {results.length > 0 && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              {t('users.search_results')}
            </div>
            <div className="divide-y divide-gray-100">
              {results.map((r: any) => (
                <Link
                  key={`${r.type}_${r.id}`}
                  href={r.href || `/admin/users?selected=${r.id}`}
                  className="block py-3 hover:bg-gray-50 rounded-lg px-2"
                >
                  <div className="text-sm font-medium text-gray-900">{r.title}</div>
                  {r.subtitle && <div className="text-[13px] text-gray-500">{r.subtitle}</div>}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {!selectedUser ? (
          <div className="p-8 sm:p-12 text-center">
            <p className="text-[13px] sm:text-base text-gray-500">{t('users.select_user_hint')}</p>
          </div>
        ) : (
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('users.selected_user')}</div>
                <div className="text-xl font-bold text-gray-900 mt-1 truncate">{selectedUser.full_name || 'No name'}</div>
                <div className="text-[13px] text-gray-600 truncate">{selectedUser.email}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {selectedUser.role || 'attendee'}
                  </span>
                  {selectedUser.role === 'organizer' && (
                    <Link
                      href={`/admin/organizers/${selectedUser.id}`}
                      className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800"
                    >
                      {t('users.view_organizer')}
                    </Link>
                  )}
                </div>
              </div>

              {canPromoteSelected && (
                <form action={promoteToOrganizer}>
                  <input type="hidden" name="userId" value={selectedUser.id} />
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    {t('users.promote_to_organizer')}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
