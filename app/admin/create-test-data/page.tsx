import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import CreateTestDataClient from './CreateTestDataClient'

export default async function CreateTestDataPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/login?redirect=/admin/create-test-data')
  }
  if (!isAdmin(user.email)) {
    redirect('/organizer')
  }
  return <CreateTestDataClient />
}
