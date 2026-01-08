import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import CreateTestDataClient from './CreateTestDataClient'

export const dynamic = 'force-dynamic'

export default async function CreateTestDataPage() {
  const { user, error } = await requireAdmin()
  if (error || !user) {
    redirect('/auth/login?redirect=/admin/create-test-data')
  }
  return <CreateTestDataClient />
}
