import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'
import { isAdmin as isAdminEmail } from '@/lib/admin'

const templateEvents = [
  // Haiti Events (15 events - 50%)
  { name: 'Carnaval de Port-au-Prince', location: 'Port-au-Prince, Haiti', country: 'HT', category: 'festival', price: 50, currency: 'USD' },
  { name: 'Festival de Jazz de Port-au-Prince', location: 'Port-au-Prince, Haiti', country: 'HT', category: 'music', price: 4500, currency: 'HTG' },
  { name: 'Fête Gede Celebration', location: 'Port-au-Prince, Haiti', country: 'HT', category: 'cultural', price: 25, currency: 'USD' },
  { name: 'Haitian Art Exhibition', location: 'Pétion-Ville, Haiti', country: 'HT', category: 'art', price: 2000, currency: 'HTG' },
  { name: 'Compas Music Festival', location: 'Cap-Haïtien, Haiti', country: 'HT', category: 'music', price: 60, currency: 'USD' },
  { name: 'Haitian Food Festival', location: 'Jacmel, Haiti', country: 'HT', category: 'food', price: 3000, currency: 'HTG' },
  { name: 'Rara Street Festival', location: 'Gonaïves, Haiti', country: 'HT', category: 'festival', price: 1500, currency: 'HTG' },
  { name: 'Haitian Independence Day Celebration', location: 'Port-au-Prince, Haiti', country: 'HT', category: 'cultural', price: 35, currency: 'USD' },
  { name: 'Caribbean Literature Conference', location: 'Port-au-Prince, Haiti', country: 'HT', category: 'conference', price: 100, currency: 'USD' },
  { name: 'Haitian Film Festival', location: 'Port-au-Prince, Haiti', country: 'HT', category: 'entertainment', price: 3500, currency: 'HTG' },
  { name: 'Vodou Cultural Experience', location: 'Jacmel, Haiti', country: 'HT', category: 'cultural', price: 2500, currency: 'HTG' },
  { name: 'Port-au-Prince Tech Summit', location: 'Port-au-Prince, Haiti', country: 'HT', category: 'conference', price: 85, currency: 'USD' },
  { name: 'Haitian Fashion Show', location: 'Pétion-Ville, Haiti', country: 'HT', category: 'entertainment', price: 55, currency: 'USD' },
  { name: 'Traditional Dance Workshop', location: 'Cap-Haïtien, Haiti', country: 'HT', category: 'workshop', price: 1800, currency: 'HTG' },
  { name: 'Haitian Artisan Market', location: 'Jacmel, Haiti', country: 'HT', category: 'art', price: 1000, currency: 'HTG' },

  // US Events (8 events)
  { name: 'Little Haiti Cultural Festival', location: 'Miami, FL, USA', country: 'US', category: 'festival', price: 55, currency: 'USD' },
  { name: 'Haitian Flag Day Celebration', location: 'Brooklyn, NY, USA', country: 'US', category: 'cultural', price: 40, currency: 'USD' },
  { name: 'Kompa Music Night', location: 'New York, NY, USA', country: 'US', category: 'music', price: 80, currency: 'USD' },
  { name: 'Haitian-American Heritage Month Gala', location: 'Boston, MA, USA', country: 'US', category: 'gala', price: 120, currency: 'USD' },
  { name: 'Haitian Art & Craft Fair', location: 'Orlando, FL, USA', country: 'US', category: 'art', price: 25, currency: 'USD' },
  { name: 'Konpa Dance Workshop', location: 'Atlanta, GA, USA', country: 'US', category: 'workshop', price: 50, currency: 'USD' },
  { name: 'Haitian Business Expo', location: 'Miami, FL, USA', country: 'US', category: 'conference', price: 75, currency: 'USD' },
  { name: 'Caribbean Food Festival', location: 'Fort Lauderdale, FL, USA', country: 'US', category: 'food', price: 45, currency: 'USD' },

  // Canada Events (7 events)
  { name: 'Festival Haïtien de Montréal', location: 'Montreal, QC, Canada', country: 'CA', category: 'festival', price: 65, currency: 'USD' },
  { name: 'Haitian Heritage Celebration', location: 'Toronto, ON, Canada', country: 'CA', category: 'cultural', price: 50, currency: 'USD' },
  { name: 'Kompa Festival Canada', location: 'Montreal, QC, Canada', country: 'CA', category: 'music', price: 85, currency: 'USD' },
  { name: 'Haitian Film Screening Series', location: 'Ottawa, ON, Canada', country: 'CA', category: 'entertainment', price: 35, currency: 'USD' },
  { name: 'Haitian Independence Gala', location: 'Montreal, QC, Canada', country: 'CA', category: 'gala', price: 110, currency: 'USD' },
  { name: 'Haitian Business Summit', location: 'Toronto, ON, Canada', country: 'CA', category: 'conference', price: 95, currency: 'USD' },
  { name: 'Haitian Cuisine Workshop', location: 'Montreal, QC, Canada', country: 'CA', category: 'workshop', price: 55, currency: 'USD' },
]

export async function POST(req: NextRequest) {
  try {
    // Require admin access.
    // Note: This app has two admin models:
    // 1) Role-based: Firestore `users.role` in ['admin','super_admin']
    // 2) Email-based: `ADMIN_EMAILS` env var (see `lib/admin.ts`)
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const role = user.role
    const emailIsAdmin = isAdminEmail(user.email || '')
    const roleIsAdmin = role === 'admin' || role === 'super_admin'
    if (!emailIsAdmin && !roleIsAdmin) {
      return NextResponse.json(
        {
          error: 'Admin access required',
          details: {
            email: user.email || null,
            role,
            hint: 'Add your email to ADMIN_EMAILS or set users.role to admin/super_admin',
          },
        },
        { status: 403 }
      )
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

      const totalCapacity = 250
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
        capacity: totalCapacity,
        availableTickets: totalCapacity,
        status: 'upcoming',
        featured: Math.random() > 0.7, // 30% chance of being featured
        tags: [template.category, 'haitian', 'community'],
        createdAt: now,
        updatedAt: now,
      }

      const eventRef = await adminDb.collection('events').add(eventData)

      // Create multiple ticket tiers with early bird
      const currency = template.currency
      const basePrice = template.price
      
      // Early bird tier (expires 14 days before event)
      const earlyBirdEndDate = new Date(eventDate)
      earlyBirdEndDate.setDate(earlyBirdEndDate.getDate() - 14)
      
      const earlyBirdPrice = Math.round(basePrice * 0.7) // 30% discount
      const earlyBirdTier = {
        eventId: eventRef.id,
        name: 'Early Bird',
        price: earlyBirdPrice,
        currency: currency,
        capacity: 80,
        available: 80,
        description: 'Limited early bird discount - Save 30%!',
        salesStart: now,
        salesEnd: Timestamp.fromDate(earlyBirdEndDate),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }
      await adminDb.collection('ticketTiers').add(earlyBirdTier)

      // General admission tier
      const generalTier = {
        eventId: eventRef.id,
        name: 'General Admission',
        price: basePrice,
        currency: currency,
        capacity: 120,
        available: 120,
        description: 'Standard admission ticket',
        salesStart: now,
        salesEnd: Timestamp.fromDate(eventDate),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }
      await adminDb.collection('ticketTiers').add(generalTier)

      // VIP tier (only for certain event types)
      const hasVIP = ['music', 'festival', 'gala', 'conference'].includes(template.category)
      if (hasVIP) {
        const vipPrice = Math.round(basePrice * 1.8) // 80% premium
        const vipTier = {
          eventId: eventRef.id,
          name: 'VIP',
          price: vipPrice,
          currency: currency,
          capacity: 50,
          available: 50,
          description: 'VIP access with premium seating and exclusive perks',
          salesStart: now,
          salesEnd: Timestamp.fromDate(eventDate),
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }
        await adminDb.collection('ticketTiers').add(vipTier)
      }
      
      createdEvents.push({
        id: eventRef.id,
        title: eventData.title,
        location: eventData.location,
        date: eventDate.toISOString(),
        price: `${earlyBirdPrice} - ${hasVIP ? Math.round(basePrice * 1.8) : basePrice} ${currency}`,
        currency: currency,
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
