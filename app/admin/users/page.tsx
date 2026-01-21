import { getUserCounts } from '@/lib/data/users'
import AdminUsersClient from './AdminUsersClient'

export const revalidate = 60
export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const counts = await getUserCounts()

  return <AdminUsersClient counts={counts} />
}