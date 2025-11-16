'use client'

import { useRouter } from 'next/navigation'
import { useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { BRAND } from '@/config/brand'
import { UserRole } from '@/types/database'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [role, setRole] = useState<UserRole>('attendee')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Sign up with Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      })

      if (signUpError) throw signUpError

      if (!data.user) {
        throw new Error('Signup failed')
      }

      // The user profile will be created automatically by the database trigger
      // Wait a moment for the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Update phone number if provided
      if (phoneNumber) {
        await supabase
          .from('users')
          .update({ phone_number: phoneNumber })
          .eq('id', data.user.id)
      }

      // Redirect based on role
      if (role === 'organizer') {
        router.push('/organizer')
      } else {
        router.push('/')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-orange-50 px-4 py-12">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900" style={{ color: BRAND.primaryColor }}>
            {BRAND.logoText}
          </h1>
          <p className="mt-2 text-gray-600">{BRAND.tagline}</p>
          <h2 className="mt-6 text-2xl font-semibold text-gray-900">
            Create your account
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                placeholder="Jean Dupont"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                Phone Number (Optional)
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                placeholder="+509 1234 5678"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                placeholder="••••••••"
                minLength={6}
              />
              <p className="mt-1 text-xs text-gray-500">At least 6 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                I want to:
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="role"
                    value="attendee"
                    checked={role === 'attendee'}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="ml-3">
                    <span className="block text-sm font-medium text-gray-900">Attend events</span>
                    <span className="block text-xs text-gray-500">Browse and buy tickets</span>
                  </span>
                </label>
                <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="role"
                    value="organizer"
                    checked={role === 'organizer'}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="ml-3">
                    <span className="block text-sm font-medium text-gray-900">Organize events</span>
                    <span className="block text-xs text-gray-500">Create and manage events</span>
                  </span>
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white font-medium bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                href="/auth/login"
                className="font-medium text-teal-700 hover:text-teal-800"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
