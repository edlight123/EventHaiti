'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { firebaseDb as supabase } from '@/lib/firebase-db/client'
import { useRouter } from 'next/navigation'
import { BRAND } from '@/config/brand'
import { useState, useEffect } from 'react'
import { isDemoMode, isDemoEmail } from '@/lib/demo'
import { demoLogout } from '@/app/auth/actions'
import { NotificationBell } from './NotificationBell'

interface NavbarProps {
  user?: {
    id: string
    full_name: string
    email: string
    role: 'attendee' | 'organizer'
  } | null
  isAdmin?: boolean
}

export default function Navbar({ user, isAdmin = false }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  async function handleSignOut() {
    // Handle demo logout
    if (isDemoMode() && user && isDemoEmail(user.email)) {
      await demoLogout()
      return
    }

    // Regular Supabase logout
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold" style={{ color: BRAND.primaryColor }}>
                {BRAND.logoText}
              </span>
            </Link>
            <div className="hidden md:ml-8 md:flex md:space-x-4">
              <Link
                href="/"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === '/' ? 'bg-gradient-to-r from-teal-50 to-teal-100 text-teal-700 shadow-sm' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Events
              </Link>
              <Link
                href="/discover"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === '/discover' ? 'bg-gradient-to-r from-teal-50 to-teal-100 text-teal-700 shadow-sm' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Discover
              </Link>
              {user && (
                <>
                  <Link
                    href="/dashboard"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      pathname === '/dashboard' ? 'bg-gradient-to-r from-teal-50 to-teal-100 text-teal-700 shadow-sm' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/tickets"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      pathname?.startsWith('/tickets') ? 'bg-gradient-to-r from-teal-50 to-teal-100 text-teal-700 shadow-sm' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    My Tickets
                  </Link>
                  <Link
                    href="/favorites"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      pathname === '/favorites' ? 'bg-gradient-to-r from-teal-50 to-teal-100 text-teal-700 shadow-sm' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Favorites
                  </Link>
                  <Link
                    href="/organizer"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      pathname?.startsWith('/organizer') ? 'bg-gradient-to-r from-teal-50 to-teal-100 text-teal-700 shadow-sm' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Organizer
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        pathname?.startsWith('/admin') ? 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 shadow-sm' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Admin
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Notification Bell */}
                <NotificationBell userId={user.id} />
                
                <Link
                  href="/profile"
                  className="hidden sm:flex items-center gap-2 text-sm text-gray-700 hover:text-teal-700 transition-colors duration-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-teal-700 rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-md ring-2 ring-white ring-opacity-50">
                    {user.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="font-medium">{user.full_name}</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Sign up
                </Link>
              </>
            )}
            
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="space-y-1">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  pathname === '/' ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Events
              </Link>
              <Link
                href="/discover"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  pathname === '/discover' ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Discover
              </Link>
              {user && (
                <>
                  <Link
                    href="/tickets"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                      pathname?.startsWith('/tickets') ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    My Tickets
                  </Link>
                  <Link
                    href="/favorites"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                      pathname === '/favorites' ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Favorites
                  </Link>
                  <Link
                    href="/organizer/events"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                      pathname?.startsWith('/organizer') ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    My Events
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                        pathname?.startsWith('/admin') ? 'bg-orange-50 text-orange-700' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Admin
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                      pathname === '/profile' ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Profile
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
