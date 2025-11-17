import Link from 'next/link'

const categories = [
  { name: 'Music', icon: '🎵', color: 'from-purple-500 to-pink-500', href: '/?category=Music' },
  { name: 'Nightlife', icon: '🌙', color: 'from-blue-500 to-purple-500', href: '/?category=Nightlife' },
  { name: 'Business', icon: '💼', color: 'from-teal-500 to-green-500', href: '/?category=Business' },
  { name: 'Arts', icon: '🎨', color: 'from-pink-500 to-red-500', href: '/?category=Arts' },
  { name: 'Food & Drink', icon: '🍽️', color: 'from-orange-500 to-yellow-500', href: '/?category=Food & Drink' },
  { name: 'Sports', icon: '⚽', color: 'from-green-500 to-teal-500', href: '/?category=Sports' },
  { name: 'Health', icon: '🏥', color: 'from-red-500 to-pink-500', href: '/?category=Health' },
  { name: 'Charity', icon: '❤️', color: 'from-rose-500 to-red-500', href: '/?category=Charity' },
]

export default function CategoryGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
      {categories.map((category) => (
        <Link
          key={category.name}
          href={category.href}
          className="group"
        >
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-200 group-hover:scale-105">
            <div className={`h-24 bg-gradient-to-br ${category.color} flex items-center justify-center`}>
              <span className="text-4xl">{category.icon}</span>
            </div>
            <div className="p-3 text-center">
              <p className="font-semibold text-gray-900 text-sm">{category.name}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
