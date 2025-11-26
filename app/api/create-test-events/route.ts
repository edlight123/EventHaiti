import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'

export async function POST() {
  try {
    const db = await createClient()

    // First, ensure the user exists
    const { data: existingUser } = await db
      .from('users')
      .select('id')
      .eq('email', 'info@edlight.org')
      .single()
    
    let userId: string
    
    if (!existingUser) {
      const { data: newUser } = await db
        .from('users')
        .insert({
          email: 'info@edlight.org',
          full_name: 'Ed Light',
          is_organizer: true,
          is_verified: true
        })
        .select('id')
        .single()
      
      userId = newUser?.id || ''
    } else {
      userId = existingUser.id
    }

    // Event images from Unsplash
    const events = [
      {
        title: 'Tech Innovation Summit 2025',
        description: 'Join us for the biggest tech conference in Haiti! Featuring keynote speakers from Silicon Valley, interactive workshops on AI and blockchain, networking sessions with industry leaders, and startup pitch competitions. This is your opportunity to connect with innovators, learn about cutting-edge technologies, and shape the future of tech in Haiti.',
        category: 'Technology',
        start_datetime: new Date('2025-12-15T09:00:00').toISOString(),
        end_datetime: new Date('2025-12-15T18:00:00').toISOString(),
        venue_name: 'Hotel Montana',
        venue_address: 'Rue Cardozo, Petion-Ville',
        city: 'Port-au-Prince',
        commune: 'Petion-Ville',
        price: 2500,
        max_attendees: 500,
        banner_image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=600&fit=crop',
        status: 'published',
        is_virtual: false,
        organizer_id: userId
      },
      {
        title: 'Haiti Jazz & Arts Festival',
        description: 'Experience an unforgettable evening of live jazz performances from renowned Haitian and international artists. The festival celebrates Haiti\'s rich musical heritage with contemporary jazz fusion, traditional rhythms, and modern interpretations. Enjoy food vendors, art exhibitions, and late-night jam sessions under the stars.',
        category: 'Music',
        start_datetime: new Date('2025-12-20T19:00:00').toISOString(),
        end_datetime: new Date('2025-12-20T23:30:00').toISOString(),
        venue_name: 'Parc de Martissant',
        venue_address: 'Avenue Lamartiniere',
        city: 'Port-au-Prince',
        commune: 'Turgeau',
        price: 1500,
        max_attendees: 1000,
        banner_image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200&h=600&fit=crop',
        status: 'published',
        is_virtual: false,
        organizer_id: userId
      },
      {
        title: 'Entrepreneurship Workshop Series',
        description: 'A comprehensive 3-day workshop for aspiring entrepreneurs and small business owners. Learn essential skills including business planning, financial management, marketing strategies, and digital transformation. Industry experts will share real-world case studies and provide one-on-one mentoring sessions. Perfect for anyone looking to start or scale their business.',
        category: 'Education',
        start_datetime: new Date('2025-12-10T08:30:00').toISOString(),
        end_datetime: new Date('2025-12-12T17:00:00').toISOString(),
        venue_name: 'Caribbean Business Center',
        venue_address: 'Route de Delmas',
        city: 'Port-au-Prince',
        commune: 'Delmas',
        price: 3000,
        max_attendees: 150,
        banner_image: 'https://images.unsplash.com/photo-1557426272-fc759fdf7a8d?w=1200&h=600&fit=crop',
        status: 'published',
        is_virtual: false,
        organizer_id: userId
      },
      {
        title: 'Haitian Cuisine Masterclass',
        description: 'Discover the secrets of authentic Haitian cooking with master chefs. This hands-on culinary experience covers traditional dishes like griot, diri ak djon djon, pikliz, and more. Learn cooking techniques passed down through generations, understand the cultural significance of Haitian cuisine, and enjoy a full-course meal at the end. All ingredients and equipment provided.',
        category: 'Food & Drink',
        start_datetime: new Date('2025-12-08T14:00:00').toISOString(),
        end_datetime: new Date('2025-12-08T18:00:00').toISOString(),
        venue_name: 'Culinary Arts Institute',
        venue_address: 'Rue Panaméricaine',
        city: 'Port-au-Prince',
        commune: 'Petion-Ville',
        price: 1800,
        max_attendees: 40,
        banner_image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&h=600&fit=crop',
        status: 'published',
        is_virtual: false,
        organizer_id: userId
      },
      {
        title: 'Charity 5K Run for Education',
        description: 'Run for a cause! This family-friendly charity run supports educational programs for underprivileged children in Haiti. The scenic 5K route takes you through historic neighborhoods with water stations every kilometer. All participants receive a race bib, finisher medal, and commemorative t-shirt. Proceeds go directly to building libraries and providing school supplies.',
        category: 'Sports',
        start_datetime: new Date('2025-12-05T06:00:00').toISOString(),
        end_datetime: new Date('2025-12-05T10:00:00').toISOString(),
        venue_name: 'Champ de Mars',
        venue_address: 'Place des Heros',
        city: 'Port-au-Prince',
        commune: 'Port-au-Prince',
        price: 500,
        max_attendees: 2000,
        banner_image: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=1200&h=600&fit=crop',
        status: 'published',
        is_virtual: false,
        organizer_id: userId
      },
      {
        title: 'Art Gallery Opening: Haitian Masters',
        description: 'Celebrate the opening of our new exhibition featuring works from Haiti\'s most influential contemporary artists. The collection includes paintings, sculptures, and mixed media pieces exploring themes of identity, resilience, and cultural heritage. Meet the artists, enjoy wine and hors d\'oeuvres, and have the opportunity to purchase original artwork.',
        category: 'Arts & Culture',
        start_datetime: new Date('2025-12-18T18:00:00').toISOString(),
        end_datetime: new Date('2025-12-18T22:00:00').toISOString(),
        venue_name: 'Musée d\'Art Haïtien',
        venue_address: 'Rue Capois',
        city: 'Port-au-Prince',
        commune: 'Port-au-Prince',
        price: 0,
        max_attendees: 300,
        banner_image: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=1200&h=600&fit=crop',
        status: 'published',
        is_virtual: false,
        organizer_id: userId
      },
      {
        title: 'Digital Marketing Bootcamp',
        description: 'Master the fundamentals of digital marketing in this intensive virtual bootcamp. Topics include social media strategy, content creation, SEO, email marketing, analytics, and paid advertising. Industry professionals will provide practical insights and real campaign examples. Includes lifetime access to course materials and certificate of completion.',
        category: 'Business',
        start_datetime: new Date('2025-12-22T10:00:00').toISOString(),
        end_datetime: new Date('2025-12-24T16:00:00').toISOString(),
        venue_name: 'Online Event',
        venue_address: 'Virtual Platform',
        city: 'Port-au-Prince',
        commune: 'Virtual',
        price: 2000,
        max_attendees: 500,
        banner_image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=600&fit=crop',
        status: 'published',
        is_virtual: true,
        virtual_platform: 'zoom',
        virtual_link: 'https://zoom.us/j/example',
        organizer_id: userId
      }
    ]

    const createdEvents = []
    const errors = []
    
    for (const event of events) {
      const { data, error } = await db
        .from('events')
        .insert(event)
        .select('id, title')
        .single()

      if (error) {
        errors.push({ event: event.title, error: error.message })
      } else if (data) {
        createdEvents.push(data)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdEvents.length} events`,
      userId,
      events: createdEvents,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create test events', details: error.message },
      { status: 500 }
    )
  }
}
