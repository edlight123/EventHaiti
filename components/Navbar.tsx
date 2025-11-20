'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { firebaseDb as supabase } from '@/lib/firebase-db/client'
import { useRouter } from 'next/navigation'
import { BRAND } from '@/config/brand'
import { useState, useEffect } from 'react'
import { isDemoMode, isDemoEmail } from '@/lib/demo'
import { demoLogout } from '@/app/auth/actions'

interface NavbarProps {
  user?: {
    id: string
    full_name: string
    email: string
    role: 'attendee' | 'organizer'
  } | null
}

export default function Navbar({ user }: NavbarProps) {
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
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold" style={{ color: BRAND.primaryColor }}>
                {BRAND.logoText}
              </span>
            </Link>
            <div className="hidden md:ml-8 md:flex md:space-x-4">
              <Link
                href="/"
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  pathname === '/' ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Events
              </Link>
              {user && (
                <>
                  <Link
                    href="/tickets"
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      pathname?.startsWith('/tickets') ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    My Tickets
                  </Link>
                  <Link
                    href="/organizer/events"
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      pathname?.startsWith('/organizer') ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    My Events
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="hidden sm:block text-sm text-gray-700">
                  {user.full_name}
                </span>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-teal-700 hover:bg-teal-800"
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
                    href="/organizer/events"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                      pathname?.startsWith('/organizer') ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    My Events
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
