import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'

const templateEvents = [
  // Haiti Events
  { name: 'Carnaval de Port-au-Prince', location: 'Port-au-Prince, Haiti', country: 'HT', category: 'festival', price: 50 },
  { name: 'Festival de Jazz de Port-au-Prince', location: 'Port-au-Prince, Haiti', country: 'HT', category: 'music', price: 75 },
  { name: 'Fête Gede Celebration', location: 'Port-au-Prince, Haiti', country: 'HT', category: 'cultural', price: 25 },
  { name: 'Haitian Art Exhibition', location: 'Pétion-Ville, Haiti', country: 'HT', category: 'art', price: 30 },
  { name: 'Compas Music Festival', location: 'Cap-Haïtien, Haiti', country: 'HT', category: 'music', price: 60 },
  { name: 'Haitian Food Festival', location: 'Jacmel, Haiti', country: 'HT', category: 'food', price: 40 },
  { name: 'Rara Street Festival', location: 'Gonaïves, Haiti', country: 'HT', category: 'festival', price: 20 },
  { name: 'Haitian Independence Day Celebration', location: 'Port-au-Prince, Haiti', country: 'HT', category: 'cultural', price: 35 },
  { name: 'Caribbean Literature Conference', location: 'Port-au-Prince, Haiti', country: 'HT', category: 'conference', price: 100 },
  { name: 'Haitian Film Festival', location: 'Port-au-Prince, Haiti', country: 'HT', category: 'entertainment', price: 45 },

  // US Events
  { name: 'Little Haiti Cultural Festival', location: 'Miami, FL, USA', country: 'US', category: 'festival', price: 55 },
  { name: 'Haitian Flag Day Celebration', location: 'Brooklyn, NY, USA', country: 'US', category: 'cultural', price: 40 },
  { name: 'Kompa Music Night', location: 'New York, NY, USA', country: 'US', category: 'music', price: 80 },
  { name: 'Haitian-American Heritage Month Gala', location: 'Boston, MA, USA', country: 'US', category: 'gala', price: 120 },
  { name: 'Haitian Art & Craft Fair', location: 'Orlando, FL, USA', country: 'US', category: 'art', price: 25 },
  { name: 'Konpa Dance Workshop', location: 'Atlanta, GA, USA', country: 'US', category: 'workshop', price: 50 },
  { name: 'Haitian Business Expo', location: 'Miami, FL, USA', country: 'US', category: 'conference', price: 75 },
  { name: 'Haitian Creole Language Conference', location: 'Chicago, IL, USA', country: 'US', category: 'conference', price: 90 },
  { name: 'Caribbean Food Festival', location: 'Fort Lauderdale, FL, USA', country: 'US', category: 'food', price: 45 },
  { name: 'Haitian Comedy Night', location: 'Queens, NY, USA', country: 'US', category: 'entertainment', price: 60 },

  // Canada Events
  { name: 'Festival Haïtien de Montréal', location: 'Montreal, QC, Canada', country: 'CA', category: 'festival', price: 65 },
  { name: 'Haitian Heritage Celebration', location: 'Toronto, ON, Canada', country: 'CA', category: 'cultural', price: 50 },
  { name: 'Kompa Festival Canada', location: 'Montreal, QC, Canada', country: 'CA', category: 'music', price: 85 },
  { name: 'Haitian Film Screening Series', location: 'Ottawa, ON, Canada', country: 'CA', category: 'entertainment', price: 35 },
  { name: 'Haitian Art Gallery Opening', location: 'Toronto, ON, Canada', country: 'CA', category: 'art', price: 40 },
  { name: 'Haitian Independence Gala', location: 'Montreal, QC, Canada', country: 'CA', category: 'gala', price: 110 },
  { name: 'Caribbean Music Festival', location: 'Vancouver, BC, Canada', country: 'CA', category: 'music', price: 70 },
  { name: 'Haitian Business Summit', location: 'Toronto, ON, Canada', country: 'CA', category: 'conference', price: 95 },
  { name: 'Haitian Cuisine Workshop', location: 'Montreal, QC, Canada', country: 'CA', category: 'workshop', price: 55 },
  { name: 'Haitian Literary Evening', location: 'Quebec City, QC, Canada', country: 'CA', category: 'cultural', price: 30 },
]

export async function POST(req: NextRequest) {
  try {
    // Require super admin access
    const { user, error } = await requireAuth()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is super admin
    const userDoc = await adminDb.collection('users').doc(user.id).get()
    const userData = userDoc.data()
    if (userData?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    // Find the organizer with email info@edlight.org
    const organizersSnap = await adminDb
      .collection('users')
      .where('email', '==', 'info@edlight.org')
      .limit(1)
      .get()

    if (organizersSnap.empty) {
      return NextResponse.json(
        { error: 'Organizer account info@edlight.org not found' },
        { status: 404 }
      )
    }

    const organizerId = organizersSnap.docs[0].id
    const organizerData = organizersSnap.docs[0].data()

    // Create events
    const now = Timestamp.now()
    const createdEvents = []

    for (let i = 0; i < templateEvents.length; i++) {
      const template = templateEvents[i]
      
      // Generate event date 30-90 days in the future
      const daysInFuture = 30 + Math.floor(Math.random() * 60)
      const eventDate = new Date()
      eventDate.setDate(eventDate.getDate() + daysInFuture)
      eventDate.setHours(19, 0, 0, 0) // 7 PM

      const eventData = {
        title: template.name,
        description: `Join us for ${template.name}! This exciting event brings together the community for an unforgettable experience celebrating Haitian culture and heritage.`,
        location: template.location,
        country: template.country,
        date: Timestamp.fromDate(eventDate),
        time: '19:00',
        category: template.category,
        organizerId: organizerId,
        organizerName: organizerData.full_name || 'Edlight Events',
        isVirtual: false,
        imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
        capacity: 200,
        availableTickets: 200,
        status: 'upcoming',
        featured: Math.random() > 0.7, // 30% chance of being featured
        tags: [template.category, 'haitian', 'community'],
        createdAt: now,
        updatedAt: now,
      }

      const eventRef = await adminDb.collection('events').add(eventData)

      // Create ticket tier
      const tierData = {
        eventId: eventRef.id,
        name: 'General Admission',
        price: template.price,
        capacity: 200,
        available: 200,
        description: 'Standard admission ticket',
        salesStart: now,
        salesEnd: Timestamp.fromDate(eventDate),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }

      await adminDb.collection('ticketTiers').add(tierData)
      
      createdEvents.push({
        id: eventRef.id,
        title: eventData.title,
        location: eventData.location,
        date: eventDate.toISOString(),
        price: template.price,
      })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdEvents.length} events for ${organizerData.full_name || 'info@edlight.org'}`,
      events: createdEvents,
    })
  } catch (error) {
    console.error('Error seeding events:', error)
    return NextResponse.json(
      { error: 'Failed to seed events', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
