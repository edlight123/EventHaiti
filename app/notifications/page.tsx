import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { isAdmin } from '@/lib/admin'
import { getUserNotifications, getUnreadCount } from '@/lib/notifications'
import { NotificationsClient } from '@/components/NotificationsClient'

export const metadata = {
  title: 'Notifications | EventHaiti',
  description: 'View your notifications'
}

export default async function NotificationsPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth/login?redirect=/notifications')
  }

  // Fetch notifications and unread count
  const [notifications, unreadCount] = await Promise.all([
    getUserNotifications(user.id, 50),
    getUnreadCount(user.id)
  ])

  return (
    <>
      <Navbar user={user} isAdmin={isAdmin(user.email)} />
      <NotificationsClient 
        userId={user.id}
        initialNotifications={notifications}
        initialUnreadCount={unreadCount}
      />
      <MobileNavWrapper user={user} isAdmin={isAdmin(user.email)} />
    </>
  )
}
