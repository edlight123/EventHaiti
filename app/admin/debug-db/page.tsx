import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import DebugDBClient from './DebugDBClient'

export const dynamic = 'force-dynamic'

export default async function DebugDBPage() {
  const { user, error } = await requireAdmin()
  if (error || !user) {
    redirect('/auth/login?redirect=/admin/debug-db')
  }
  return <DebugDBClient />
}
