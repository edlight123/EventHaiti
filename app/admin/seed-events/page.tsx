import { redirect } from 'next/navigation'

import { requireAdmin } from '@/lib/auth'
import SeedEventsClient from './SeedEventsClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SeedEventsPage() {
  const { user, error } = await requireAdmin()
  if (error || !user) {
    redirect('/auth/login?redirect=/admin/seed-events')
  }

  return <SeedEventsClient />
}
