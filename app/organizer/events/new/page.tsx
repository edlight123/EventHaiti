import { requireAuth } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { redirect } from 'next/navigation'
import EventForm from '../EventForm'

export default async function NewEventPage() {
  const { user, error } = await requireAuth('organizer')

  if (error || !user) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Event</h1>
        <EventForm userId={user.id} />
      </div>
    </div>
  )
}
