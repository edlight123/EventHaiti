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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
      {categories.map((category) => (
        <Link
          key={category.name}
          href={category.href}
          className="group"
        >
          <div className="relative rounded-xl overflow-hidden transition-all duration-300 group-hover:scale-[1.02]">
            {/* Background Image */}
            <div className="relative h-14 md:h-16 flex items-center justify-center overflow-hidden">
              <Image
                src={category.image}
                alt={category.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              
              {/* Lighter overlay for better image visibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/20 group-hover:from-black/50 group-hover:via-black/20 group-hover:to-transparent transition-all duration-300"></div>
              
              {/* Category Text */}
              <p className="font-bold text-white text-xs sm:text-sm md:text-base text-center relative z-10 drop-shadow-lg px-2 leading-tight">
                {category.name}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
