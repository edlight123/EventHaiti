import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import DebugDBClient from './DebugDBClient'

export default async function DebugDBPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/login?redirect=/admin/debug-db')
  }
  if (!isAdmin(user.email)) {
    redirect('/organizer')
  }
  return <DebugDBClient />
}
