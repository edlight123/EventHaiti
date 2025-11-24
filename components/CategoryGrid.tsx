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
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((category) => (
        <Link
          key={category.name}
          href={category.href}
          className="group flex-shrink-0"
        >
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-200 group-hover:scale-105 w-24">
            <div className={`h-20 bg-gradient-to-br ${category.color} flex items-center justify-center`}>
              <span className="text-3xl">{category.icon}</span>
            </div>
            <div className="p-3 text-center">
              <p className="font-semibold text-gray-900 text-xs whitespace-nowrap overflow-hidden text-ellipsis">{category.name}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
