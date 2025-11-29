import Link from 'next/link'
import Image from 'next/image'

const categories = [
  { name: 'Konpa/Music', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=300&fit=crop', href: '/?category=Music' },
  { name: 'Sports', image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=300&fit=crop', href: '/?category=Sports' },
  { name: 'Food & Dining', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop', href: '/?category=Food & Drink' },
  { name: 'Business/Conference', image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=300&fit=crop', href: '/?category=Business' },
  { name: 'Arts & Culture', image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400&h=300&fit=crop', href: '/?category=Arts & Culture' },
  { name: 'Nightlife/Parties', image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop', href: '/?category=Party' },
  { name: 'Religious', image: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=400&h=300&fit=crop', href: '/?category=Religious' },
  { name: 'Education', image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop', href: '/?category=Education' },
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
            {/* Background Image */}
            <div className="relative h-12 md:h-14 flex items-center justify-center overflow-hidden">
              <Image
                src={category.image}
                alt={category.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              
              {/* Dark overlay for text readability */}
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors"></div>
              
              {/* Glow Effect on Hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-brand-500/30 to-transparent"></div>
              
              {/* Category Text */}
              <p className="font-bold text-white text-sm md:text-base text-center relative z-10 drop-shadow-lg px-2">
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
