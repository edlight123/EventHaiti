import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { notFound } from 'next/navigation'
import FollowButton from '@/components/FollowButton'
import EventCard from '@/components/EventCard'
import { Shield, Calendar, Users, Star } from 'lucide-react'
import type { Metadata } from 'next'

export const revalidate = 0

export async function generateMetadata({ params }: { params: Promise<{ organizerId: string }> }): Promise<Metadata> {
  const { organizerId } = await params
  
  const supabase = await createClient()
  const { data: organizer } = await supabase
    .from('users')
    .select('full_name, is_verified')
    .eq('id', organizerId)
    .single()

  if (!organizer) {
    return {
      title: 'Organizer Not Found',
    }
  }

  return {
    title: `${organizer.full_name} | EventHaiti Organizer`,
    description: `View all events organized by ${organizer.full_name} on EventHaiti`,
  }
}

export default async function OrganizerProfilePage({ params }: { params: Promise<{ organizerId: string }> }) {
  const user = await getCurrentUser()
  const { organizerId } = await params
  
  const supabase = await createClient()
  
  // Fetch organizer info
  const { data: organizer } = await supabase
    .from('users')
    .select('id, full_name, email, is_verified, created_at')
    .eq('id', organizerId)
    .single()

  if (!organizer) {
    notFound()
  }

  // Fetch organizer's events
  const now = new Date().toISOString()
  const { data: upcomingEventsRaw } = await supabase
    .from('events')
    .select('*')
    .eq('organizer_id', organizerId)
    .eq('is_published', true)
    .gte('start_datetime', now)
    .order('start_datetime', { ascending: true })

  const { data: pastEventsRaw } = await supabase
    .from('events')
    .select('*')
    .eq('organizer_id', organizerId)
    .eq('is_published', true)
    .lt('start_datetime', now)
    .order('start_datetime', { ascending: false })
    .limit(6)

  // Add organizer info to each event
  const upcomingEvents = upcomingEventsRaw?.map((event: any) => ({
    ...event,
    users: {
      full_name: organizer.full_name,
      is_verified: organizer.is_verified
    }
  }))

  const pastEvents = pastEventsRaw?.map((event: any) => ({
    ...event,
    users: {
      full_name: organizer.full_name,
      is_verified: organizer.is_verified
    }
  }))

  // Count followers
  const { data: followersData } = await supabase
    .from('organizer_follows')
    .select('id')
    .eq('organizer_id', organizerId)
  
  const followerCount = followersData?.length || 0

  // Count total events
  const { data: eventsCountData } = await supabase
    .from('events')
    .select('id')
    .eq('organizer_id', organizerId)
    .eq('is_published', true)
  
  const totalEvents = eventsCountData?.length || 0

  // Count total tickets sold across all organizer's events
  const { data: ticketStats } = await supabase
    .from('events')
    .select('tickets_sold')
    .eq('organizer_id', organizerId)
    .eq('is_published', true)

  const totalTicketsSold = ticketStats?.reduce((sum: number, event: any) => sum + (event.tickets_sold || 0), 0) || 0

  // Check if current user is following this organizer
  let isFollowing = false
  if (user) {
    const { data: followData } = await supabase
      .from('organizer_follows')
      .select('id')
      .eq('organizer_id', organizerId)
      .eq('follower_id', user.id)
      .single()
    
    isFollowing = !!followData
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      {/* ORGANIZER HERO SECTION */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-500 to-accent-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center text-brand-600 font-bold text-5xl shadow-hard">
              {organizer.full_name[0].toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-4xl md:text-5xl font-bold text-white">
                  {organizer.full_name}
                </h1>
                {organizer.is_verified && (
                  <div className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    <Shield className="w-4 h-4" />
                    <span>Verified</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-6 text-white/90 mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span className="font-semibold">{totalEvents || 0}</span>
                  <span>Events</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span className="font-semibold">{followerCount || 0}</span>
                  <span>Followers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  <span className="font-semibold">{totalTicketsSold}</span>
                  <span>Tickets Sold</span>
                </div>
              </div>

              {/* Follow Button */}
              {user && user.id !== organizerId && (
                <div className="max-w-xs">
                  <FollowButton organizerId={organizerId} userId={user.id} initialIsFollowing={isFollowing} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EVENTS SECTION */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Upcoming Events */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Upcoming Events</h2>
              <p className="text-gray-600 mt-1">
                {upcomingEvents?.length || 0} event{(upcomingEvents?.length || 0) !== 1 ? 's' : ''} coming soon
              </p>
            </div>
          </div>

          {upcomingEvents && upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event: any) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Upcoming Events</h3>
              <p className="text-gray-600">
                This organizer doesn&apos;t have any upcoming events at the moment.
              </p>
            </div>
          )}
        </section>

        {/* Past Events */}
        {pastEvents && pastEvents.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Past Events</h2>
                <p className="text-gray-600 mt-1">
                  Previous events organized by {organizer.full_name}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastEvents.map((event: any) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
