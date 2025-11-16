import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { redirect, notFound } from 'next/navigation'
import EventForm from '../../EventForm'

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const { user, error } = await requireAuth('organizer')

  if (error || !user) {
    redirect('/auth/login')
  }

  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', params.id)
    .eq('organizer_id', user.id)
    .single()

  if (!event) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Event</h1>
        <EventForm userId={user.id} event={event} />
      </div>
    </div>
  )
}
