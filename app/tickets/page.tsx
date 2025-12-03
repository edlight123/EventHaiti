import { createClient } from '@/lib/firebase-db/server'
import { requireAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import PullToRefresh from '@/components/PullToRefresh'
import EmptyState from '@/components/EmptyState'
import { redirect } from 'next/navigation'
import { isDemoMode, DEMO_TICKETS, DEMO_EVENTS } from '@/lib/demo'
import { Ticket, TrendingUp, Clock, CheckCircle2 } from 'lucide-react'
import TicketCard from './TicketCard'
import { Suspense } from 'react'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import MyTicketsList from './sections/MyTicketsList'

export const dynamic = 'force-dynamic'
export const revalidate = 30 // Cache for 30 seconds

// Helper function to serialize all Timestamp objects recursively
function serializeTimestamps(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj
  
  // Check if it's a Firestore Timestamp
  if (obj.toDate && typeof obj.toDate === 'function') {
    return obj.toDate().toISOString()
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => serializeTimestamps(item))
  }
  
  // Handle plain objects
  const serialized: any = {}
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      serialized[key] = serializeTimestamps(obj[key])
    }
  }
  return serialized
}

export default async function MyTicketsPage() {
  const { user, error } = await requireAuth()

  if (error || !user) {
    redirect('/auth/login')
  }

  // List now loads within Suspense async component

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />

      <PullToRefresh onRefresh={async () => {
        'use server'
        const { revalidatePath } = await import('next/cache')
        revalidatePath('/tickets')
      }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          {/* Header - Refined */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Tickets</h1>
            <p className="text-sm text-gray-600 mt-1">
              {/* Hint text kept simple; detailed count comes from list */}
              Your tickets
            </p>
          </div>

        <Suspense fallback={<LoadingSkeleton rows={5} animated={false} />}>
          <MyTicketsList userId={user.id} />
        </Suspense>
        </div>
      </PullToRefresh>
      
      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
    </div>
  )
}
