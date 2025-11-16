'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { DEMO_USERS } from '@/lib/demo'

export async function demoLogin(email: string, password: string) {
  const demoUser = email === DEMO_USERS.organizer.email ? DEMO_USERS.organizer : DEMO_USERS.attendee
  
  if (password !== demoUser.password) {
    return { error: 'Invalid password' }
  }

  const cookieStore = await cookies()
  const userData = JSON.stringify({
    id: demoUser.id,
    email: demoUser.email,
    role: email === DEMO_USERS.organizer.email ? 'organizer' : 'attendee'
  })
  
  cookieStore.set('demo_user', userData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  })

  return { success: true, role: email === DEMO_USERS.organizer.email ? 'organizer' : 'attendee' }
}

export async function demoLogout() {
  const cookieStore = await cookies()
  cookieStore.delete('demo_user')
  redirect('/')
}
