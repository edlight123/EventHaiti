import { getCurrentUser } from '@/lib/auth'
import { AdminEventsModerationConsole } from './AdminEventsModerationConsole'

export const revalidate = 60
export const dynamic = 'force-dynamic'

export default async function AdminEventsPage() {
  const user = await getCurrentUser()
  
  return <AdminEventsModerationConsole userId={user!.id} userEmail={user!.email!} />
}
