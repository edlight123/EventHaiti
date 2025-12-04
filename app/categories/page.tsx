import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import CategoriesContent from './CategoriesContent'

export const revalidate = 120 // Cache for 2 minutes

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const user = await getCurrentUser()
  const params = await searchParams

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />
      <CategoriesContent initialCategory={params.category} />
      <MobileNavWrapper user={user} />
    </div>
  )
}
