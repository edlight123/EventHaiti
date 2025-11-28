import Link from 'next/link'

const categories = [
  { name: 'Music', icon: '🎵', color: 'from-purple-500 to-pink-500', href: '/?category=Music' },
  { name: 'Sports', icon: '⚽', color: 'from-green-500 to-teal-500', href: '/?category=Sports' },
  { name: 'Arts & Culture', icon: '🎨', color: 'from-pink-500 to-red-500', href: '/?category=Arts & Culture' },
  { name: 'Business', icon: '💼', color: 'from-teal-500 to-green-500', href: '/?category=Business' },
  { name: 'Food & Drink', icon: '🍽️', color: 'from-orange-500 to-yellow-500', href: '/?category=Food & Drink' },
  { name: 'Community', icon: '❤️', color: 'from-rose-500 to-red-500', href: '/?category=Community' },
  { name: 'Education', icon: '📚', color: 'from-blue-500 to-indigo-500', href: '/?category=Education' },
  { name: 'Technology', icon: '💻', color: 'from-indigo-500 to-purple-500', href: '/?category=Technology' },
  { name: 'Health & Wellness', icon: '🏥', color: 'from-red-500 to-pink-500', href: '/?category=Health & Wellness' },
  { name: 'Other', icon: '🌟', color: 'from-gray-500 to-gray-600', href: '/?category=Other' },
]

export default function CategoryGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
      {categories.map((category) => (
        <Link
          key={category.name}
          href={category.href}
          className="group"
        >
          <div className="relative bg-white rounded-2xl shadow-medium hover:shadow-hard transition-all duration-300 overflow-hidden border-2 border-gray-100 group-hover:border-brand-200 group-hover:scale-105 group-hover:-translate-y-1">
            {/* Gradient Background with Glassmorphism */}
            <div className={`relative h-32 md:h-36 bg-gradient-to-br ${category.color} flex items-center justify-center overflow-hidden`}>
              {/* Subtle Pattern Overlay */}
              <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition-colors backdrop-blur-[1px]"></div>
              
              {/* Glow Effect on Hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-white/30 to-transparent"></div>
              
              {/* Icon */}
              <span className="text-5xl md:text-6xl transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 relative z-10 filter drop-shadow-lg">
                {category.icon}
              </span>
            </div>
            
            {/* Card Content */}
            <div className="p-4 text-center bg-gradient-to-b from-white to-gray-50/50">
              <p className="font-bold text-gray-900 text-sm md:text-base group-hover:text-brand-600 transition-colors duration-300">
                {category.name}
              </p>
            </div>

            {/* Hover Glow Ring */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ring-2 ring-brand-400/50 ring-offset-2"></div>
          </div>
        </Link>
      ))}
    </div>
  )
}
