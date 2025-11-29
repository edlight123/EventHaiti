import { getCurrentUser } from '@/lib/auth'
import EventCard from '@/components/EventCard'
import EventCardHorizontal from '@/components/EventCardHorizontal'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import PullToRefresh from '@/components/PullToRefresh'
import AdvancedSearch from '@/components/AdvancedSearch'
import Badge from '@/components/ui/Badge'
import { isAdmin } from '@/lib/admin'
import { TrendingUp, MapPin, Sparkles, Calendar, Star } from 'lucide-react'
import { Suspense } from 'react'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import TrendingSection from './sections/TrendingSection'
import NearbySection from './sections/NearbySection'

export default async function DiscoverPage() {
  const user = await getCurrentUser()

  // Sections now fetch data within Suspense async components

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />
      
      {/* Premium Hero with Search */}
      <div className="relative bg-gradient-to-br from-brand-600 via-brand-700 to-accent-600 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Sparkles className="w-12 h-12 text-accent-300 animate-pulse" />
              <h1 className="text-5xl md:text-6xl font-bold text-white">
                Discover Events
              </h1>
              <Sparkles className="w-12 h-12 text-accent-300 animate-pulse" />
            </div>
            <p className="text-xl md:text-2xl text-brand-100 max-w-2xl mx-auto">
              Explore trending events, find nearby experiences, and discover your next adventure
            </p>
          </div>
          <AdvancedSearch />
        </div>
      </div>

      <PullToRefresh onRefresh={async () => {
        'use server'
        const { revalidatePath } = await import('next/cache')
        revalidatePath('/discover')
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Trending Events */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-accent-600" />
                Trending Now
              </h2>
              <p className="text-gray-600 mt-2">Events everyone is talking about</p>
            </div>
            <Badge variant="trending" size="lg" icon={<TrendingUp className="w-4 h-4" />}>
              Hot Events
            </Badge>
          </div>
          <Suspense fallback={<LoadingSkeleton rows={6} animated={false} />}>
            <TrendingSection />
          </Suspense>
        </section>

        {/* Nearby Events */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <MapPin className="w-8 h-8 text-brand-600" />
                Events Near You
              </h2>
              <p className="text-gray-600 mt-2">Happening in Port-au-Prince</p>
            </div>
            <Badge variant="primary" size="lg" icon={<MapPin className="w-4 h-4" />}>
              Nearby
            </Badge>
          </div>
          <Suspense fallback={<LoadingSkeleton rows={6} animated={false} />}>
            <NearbySection />
          </Suspense>
        </section>

        {/* Categories Grid */}
        <section>
          <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            <Star className="w-8 h-8 text-accent-600" />
            Browse by Category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {['Music', 'Sports', 'Arts', 'Business', 'Food', 'Community', 'Education', 'Technology', 'Health', 'Other'].map((category: string) => (
              <a
                key={category}
                href={`/?category=${category}`}
                className="bg-white rounded-2xl border-2 border-gray-100 p-6 hover:border-brand-500 hover:shadow-medium transition-all duration-300 text-center group"
              >
                <div className="text-5xl mb-3 transform group-hover:scale-110 transition-transform duration-300">
                  {getCategoryEmoji(category)}
                </div>
                <div className="font-bold text-gray-900 group-hover:text-brand-700 transition-colors">
                  {category}
                </div>
              </a>
            ))}
          </div>
        </section>
        </div>
      </PullToRefresh>
      
      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
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
