import Link from 'next/link'
import Image from 'next/image'
import { Heart, TrendingUp, ArrowRight, Calendar, MapPin } from 'lucide-react'
import { format } from 'date-fns'

interface FavoriteEvent {
  id: string
  title: string
  banner_image_url?: string | null
  start_datetime: string
  city: string
  category?: string
  ticket_price: number
}

interface FavoritesRowProps {
  favorites: FavoriteEvent[]
}

export function FavoritesRow({ favorites }: FavoritesRowProps) {
  const displayFavorites = favorites.slice(0, 8)

  if (favorites.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center">
        <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-pink-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No saved events yet</h3>
        <p className="text-sm text-gray-600 mb-6">Save events you&apos;re interested in to find them later</p>
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-600 to-pink-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
        >
          <TrendingUp className="w-4 h-4" />
          Discover Events
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Horizontal Scroll Container */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        <div className="flex gap-4 min-w-max sm:min-w-0 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {displayFavorites.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all w-64 sm:w-auto flex-shrink-0"
            >
              {/* Event Image */}
              <div className="relative aspect-[16/10] bg-gray-100">
                {event.banner_image_url ? (
                  <Image
                    src={event.banner_image_url}
                    alt={event.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="256px"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                    <span className="text-4xl">❤️</span>
                  </div>
                )}

                {/* Heart Icon */}
                <div className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Heart className="w-4 h-4 fill-pink-600 text-pink-600" />
                </div>

                {/* Category Badge */}
                {event.category && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-full text-xs font-medium text-white">
                    {event.category}
                  </div>
                )}
              </div>

              {/* Event Info */}
              <div className="p-3">
                <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-2 min-h-[2.5rem]">
                  {event.title}
                </h3>

                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">
                      {format(new Date(event.start_datetime), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{event.city}</span>
                  </div>
                </div>

                {/* Price */}
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className={`text-sm font-semibold ${event.ticket_price === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                    {event.ticket_price === 0 ? 'Free' : `${event.ticket_price} HTG`}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* View All Link */}
      {favorites.length > 8 && (
        <Link
          href="/favorites"
          className="block text-center py-3 text-pink-600 hover:text-pink-700 font-semibold hover:bg-pink-50 rounded-xl transition-colors"
        >
          View all {favorites.length} saved events →
        </Link>
      )}
    </div>
  )
}
