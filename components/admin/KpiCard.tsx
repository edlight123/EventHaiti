import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor: string
  iconBg: string
  href?: string
  trend?: {
    value: string
    isPositive: boolean
  }
}

export function KpiCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconColor, 
  iconBg, 
  href,
  trend 
}: KpiCardProps) {
  const content = (
    <div className="relative overflow-hidden">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
      
      {subtitle && (
        <p className="text-sm text-gray-600">{subtitle}</p>
      )}
      
      {trend && (
        <div className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${
          trend.isPositive ? 'text-green-600' : 'text-red-600'
        }`}>
          <span>{trend.isPositive ? '↑' : '↓'}</span>
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="block bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-teal-300 transition-all"
      >
        {content}
      </Link>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      {content}
    </div>
  )
}
