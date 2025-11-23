import { getCurrentUser } from '@/lib/auth'
import { getTrendingEvents, getNearbyEvents } from '@/lib/recommendations'
import EventCard from '@/components/EventCard'

export default async function DiscoverPage() {
  const user = await getCurrentUser()

  // Get trending events
  const trendingEvents = await getTrendingEvents(12)

  // Get nearby events if user has a location
  // For now, using Port-au-Prince as default
  const nearbyEvents = await getNearbyEvents('Port-au-Prince', 12)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🔥 Discover Amazing Events
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Find the hottest events happening in Haiti right now
          </p>
        </div>

        {/* Trending Events */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Trending Now</h2>
              <p className="text-gray-600 mt-1">Events everyone is talking about</p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
              Hot
            </span>
          </div>
          
          {trendingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingEvents.map((event, index) => (
                <div key={event.id} className="relative">
                  {index < 3 && (
                    <div className="absolute -top-2 -left-2 z-10 w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                      {index + 1}
                    </div>
                  )}
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-600">No trending events at the moment</p>
            </div>
          )}
        </section>

        {/* Nearby Events */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Events Near You</h2>
              <p className="text-gray-600 mt-1">Happening in Port-au-Prince</p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-teal-100 text-teal-800">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              Nearby
            </span>
          </div>

          {nearbyEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nearbyEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-600">No nearby events found</p>
            </div>
          )}
        </section>

        {/* Categories Quick Links */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {['Music', 'Sports', 'Arts', 'Business', 'Food', 'Community', 'Education', 'Technology', 'Health', 'Other'].map(category => (
              <a
                key={category}
                href={`/?category=${category}`}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:border-teal-500 hover:shadow-md transition-all text-center group"
              >
                <div className="text-3xl mb-2">{getCategoryEmoji(category)}</div>
                <div className="font-semibold text-gray-900 group-hover:text-teal-700">{category}</div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    'Music': '🎵',
    'Sports': '⚽',
    'Arts': '🎨',
    'Business': '💼',
    'Food': '🍴',
    'Community': '👥',
    'Education': '📚',
    'Technology': '💻',
    'Health': '🏥',
    'Other': '🎯'
  }
  return emojis[category] || '🎉'
}
