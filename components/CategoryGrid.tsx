import Link from 'next/link'

const categories = [
  { name: 'Konpa/Music', color: 'from-purple-500 to-pink-500', href: '/?category=Music' },
  { name: 'Sports', color: 'from-green-500 to-teal-500', href: '/?category=Sports' },
  { name: 'Food & Dining', color: 'from-orange-500 to-red-500', href: '/?category=Food & Drink' },
  { name: 'Business/Conference', color: 'from-teal-500 to-cyan-500', href: '/?category=Business' },
  { name: 'Arts & Culture', color: 'from-pink-500 to-rose-500', href: '/?category=Arts & Culture' },
  { name: 'Nightlife/Parties', color: 'from-indigo-500 to-purple-500', href: '/?category=Party' },
  { name: 'Religious', color: 'from-blue-500 to-indigo-500', href: '/?category=Religious' },
  { name: 'Education', color: 'from-cyan-500 to-blue-500', href: '/?category=Education' },
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
          <div className="relative bg-white rounded-xl shadow-medium hover:shadow-hard transition-all duration-300 overflow-hidden border-2 border-gray-100 group-hover:border-brand-200 group-hover:scale-105 group-hover:-translate-y-1">
            {/* Gradient Background */}
            <div className={`relative h-20 md:h-24 bg-gradient-to-br ${category.color} flex items-center justify-center overflow-hidden p-3`}>
              {/* Subtle Pattern Overlay */}
              <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition-colors backdrop-blur-[1px]"></div>
              
              {/* Glow Effect on Hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-white/30 to-transparent"></div>
              
              {/* Category Text */}
              <p className="font-bold text-white text-sm md:text-base text-center relative z-10 drop-shadow-lg">
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
