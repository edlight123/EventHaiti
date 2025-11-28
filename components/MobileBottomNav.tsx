'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Ticket, User, Briefcase, Shield } from 'lucide-react'

interface MobileBottomNavProps {
  isLoggedIn: boolean
  isOrganizer?: boolean
  isAdmin?: boolean
}

export default function MobileBottomNav({ isLoggedIn, isOrganizer = false, isAdmin = false }: MobileBottomNavProps) {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname?.startsWith(path)
  }

  const tabs = [
    { href: '/', label: 'Home', icon: Home, show: true },
    { href: '/discover', label: 'Discover', icon: Compass, show: true },
    { href: '/tickets', label: 'Tickets', icon: Ticket, show: isLoggedIn },
    { href: '/profile', label: 'Profile', icon: User, show: isLoggedIn },
    { href: isAdmin ? '/admin' : '/organizer', label: isAdmin ? 'Admin' : 'Organizer', icon: isAdmin ? Shield : Briefcase, show: isLoggedIn && (isOrganizer || isAdmin) },
  ].filter(tab => tab.show)

  // Don't show if not logged in and only 2 tabs would show
  if (!isLoggedIn && tabs.length <= 2) {
    return null
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = isActive(tab.href)
          
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center min-w-[64px] py-2 px-3 rounded-xl transition-all duration-200 ${
                active
                  ? 'text-brand-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="relative">
                <Icon className={`w-6 h-6 mb-1 transition-transform ${active ? 'scale-110' : ''}`} />
                {active && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-brand-600 rounded-full" />
                )}
              </div>
              <span className={`text-xs font-medium ${active ? 'text-brand-600' : ''}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
