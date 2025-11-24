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
    <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
      {categories.map((category) => (
        <Link
          key={category.name}
          href={category.href}
          className="group flex-shrink-0"
        >
          <div className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 group-hover:scale-110 group-hover:-translate-y-2 w-28">
            <div className={`h-24 bg-gradient-to-br ${category.color} flex items-center justify-center relative overflow-hidden`}>
              <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition-colors"></div>
              <span className="text-4xl transform group-hover:scale-125 transition-transform duration-500 relative z-10">{category.icon}</span>
            </div>
            <div className="p-4 text-center bg-gradient-to-b from-white to-gray-50">
              <p className="font-bold text-gray-900 text-sm whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-teal-700 transition-colors">{category.name}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
