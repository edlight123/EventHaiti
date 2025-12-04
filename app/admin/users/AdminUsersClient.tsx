'use client'

import { useTranslation } from 'react-i18next'
import Link from 'next/link'

type AdminUsersClientProps = {
  counts: {
    total: number
    organizers: number
    verified: number
  }
  usersWithAdminFlag: any[]
  promoteToOrganizer: (formData: FormData) => void
}

export default function AdminUsersClient({ counts, usersWithAdminFlag, promoteToOrganizer }: AdminUsersClientProps) {
  const { t } = useTranslation('admin')

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

      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {usersWithAdminFlag.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <p className="text-[13px] sm:text-base text-gray-500">{t('users.no_users_found')}</p>
          </div>
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <div className="sm:hidden divide-y divide-gray-100">
              {usersWithAdminFlag.map((u: any) => {
                const shouldBeOrganizer = (u.is_verified && u.is_organizer && u.role !== 'organizer') || (u.is_verified && u.isAdminUser && u.role !== 'organizer')
                return (
                  <div key={u.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{u.full_name || 'No name'}</div>
                        <div className="text-[13px] text-gray-500 truncate">{u.email}</div>
                        {u.isAdminUser && (
                          <div className="text-[11px] text-orange-600 font-semibold mt-0.5">{t('users.admin')}</div>
                        )}
                      </div>
                      <div>
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          u.role === 'organizer' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {u.role || 'attendee'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        {u.role === 'organizer' || u.is_organizer || u.isAdminUser ? (
                          u.verification_status === 'approved' ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">✓ {t('users.verified')}</span>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              {u.verification_status === 'pending' ? 'Pending' : 'Not Verified'}
                            </span>
                          )
                        ) : (
                          <span className="text-[13px] text-gray-400">N/A</span>
                        )}
                      </div>
                      <div className="text-[13px] text-gray-500">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                    {shouldBeOrganizer && (
                      <form action={promoteToOrganizer} className="mt-3">
                        <input type="hidden" name="userId" value={u.id} />
                        <button
                          type="submit"
                          className="w-full px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                        >
                          {t('users.promote_to_organizer')}
                        </button>
                      </form>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Verification</th>
                    <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usersWithAdminFlag.map((u: any) => {
                    const shouldBeOrganizer = (u.is_verified && u.is_organizer && u.role !== 'organizer') || (u.is_verified && u.isAdminUser && u.role !== 'organizer')
                    return (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{u.full_name || 'No name'}</div>
                            <div className="text-[13px] text-gray-500 truncate">{u.email}</div>
                            {u.isAdminUser && (
                              <div className="text-[11px] text-orange-600 font-semibold mt-0.5">{t('users.admin')}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            u.role === 'organizer' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {u.role || 'attendee'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {u.role === 'organizer' || u.is_organizer || u.isAdminUser ? (
                            u.verification_status === 'approved' ? (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">✓ {t('users.verified')}</span>
                            ) : (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                {u.verification_status === 'pending' ? 'Pending' : 'Not Verified'}
                              </span>
                            )
                          ) : (
                            <span className="text-[13px] text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-[13px] text-gray-500 whitespace-nowrap">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {shouldBeOrganizer && (
                            <form action={promoteToOrganizer}>
                              <input type="hidden" name="userId" value={u.id} />
                              <button
                                type="submit"
                                className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                              >
                                {t('users.promote_to_organizer')}
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
