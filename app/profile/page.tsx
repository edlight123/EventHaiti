import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Calendar, 
  Ticket, 
  Heart, 
  Plus,
  TrendingUp,
  Award,
  Users,
  Settings,
  LogOut
} from 'lucide-react'
import Badge from '@/components/ui/Badge'

export const revalidate = 0

export default async function ProfilePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  const supabase = await createClient()

  // Fetch user stats
  const { data: tickets } = await supabase
    .from('tickets')
    .select('id')
    .eq('user_id', user.id)

  const { data: events } = await supabase
    .from('events')
    .select('id')
    .eq('organizer_id', user.id)

  const { data: favorites } = await supabase
    .from('event_favorites')
    .select('id')
    .eq('user_id', user.id)

  const { data: followers } = await supabase
    .from('organizer_follows')
    .select('id')
    .eq('organizer_id', user.id)

  const ticketCount = tickets?.length || 0
  const eventCount = events?.length || 0
  const favoriteCount = favorites?.length || 0
  const followerCount = followers?.length || 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden mb-6">
          {/* Hero Background */}
          <div className="relative h-48 bg-gradient-to-br from-brand-600 via-brand-500 to-accent-500">
            <div className="absolute inset-0 bg-black/10"></div>
            {/* Decorative circles */}
            <div className="absolute top-10 right-20 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-10 left-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          {/* Profile Info */}
          <div className="relative px-8 pb-8">
            {/* Avatar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end -mt-16 mb-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-brand-400 to-accent-400 flex items-center justify-center text-white font-bold text-5xl shadow-hard border-4 border-white">
                  {user.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                {user.is_verified && (
                  <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white rounded-full p-2 shadow-lg">
                    <Shield className="w-5 h-5" />
                  </div>
                )}
              </div>
              
              <div className="mt-4 sm:mt-0 sm:ml-6 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                      {user.full_name}
                      {user.is_verified && (
                        <Badge variant="success" size="md" icon={<Shield className="w-4 h-4" />}>
                          Verified
                        </Badge>
                      )}
                    </h1>
                    <p className="text-gray-600 mt-1 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {user.email}
                    </p>
                    {user.phone_number && (
                      <p className="text-gray-600 mt-1 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {user.phone_number}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-all"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Role Badge */}
            <div className="flex items-center gap-2 mb-6">
              <Badge variant={user.role === 'organizer' ? 'vip' : 'primary'} size="lg">
                {user.role === 'organizer' ? 'Event Organizer' : 'Event Attendee'}
              </Badge>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-brand-50 to-brand-100 rounded-xl p-4 border border-brand-200">
                <div className="flex items-center gap-2 text-brand-600 mb-2">
                  <Ticket className="w-5 h-5" />
                  <span className="text-sm font-semibold">Tickets</span>
                </div>
                <p className="text-3xl font-bold text-brand-900">{ticketCount}</p>
                <p className="text-xs text-brand-600 mt-1">Events attended</p>
              </div>

              <div className="bg-gradient-to-br from-accent-50 to-accent-100 rounded-xl p-4 border border-accent-200">
                <div className="flex items-center gap-2 text-accent-600 mb-2">
                  <Heart className="w-5 h-5" />
                  <span className="text-sm font-semibold">Favorites</span>
                </div>
                <p className="text-3xl font-bold text-accent-900">{favoriteCount}</p>
                <p className="text-xs text-accent-600 mt-1">Saved events</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-2 text-purple-600 mb-2">
                  <Calendar className="w-5 h-5" />
                  <span className="text-sm font-semibold">Events</span>
                </div>
                <p className="text-3xl font-bold text-purple-900">{eventCount}</p>
                <p className="text-xs text-purple-600 mt-1">Events created</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <Users className="w-5 h-5" />
                  <span className="text-sm font-semibold">Followers</span>
                </div>
                <p className="text-3xl font-bold text-blue-900">{followerCount}</p>
                <p className="text-xs text-blue-600 mt-1">People following</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Actions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-brand-600" />
                Quick Actions
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/tickets"
                  className="group relative overflow-hidden flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-100 group-hover:bg-brand-200 flex items-center justify-center text-brand-600 transition-colors">
                    <Ticket className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">My Tickets</p>
                    <p className="text-sm text-gray-600">{ticketCount} ticket{ticketCount !== 1 ? 's' : ''}</p>
                  </div>
                </Link>

                <Link
                  href="/favorites"
                  className="group relative overflow-hidden flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-accent-400 hover:bg-accent-50 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-accent-100 group-hover:bg-accent-200 flex items-center justify-center text-accent-600 transition-colors">
                    <Heart className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Favorites</p>
                    <p className="text-sm text-gray-600">{favoriteCount} saved</p>
                  </div>
                </Link>

                {eventCount > 0 && (
                  <Link
                    href="/organizer/events"
                    className="group relative overflow-hidden flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-purple-100 group-hover:bg-purple-200 flex items-center justify-center text-purple-600 transition-colors">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">My Events</p>
                      <p className="text-sm text-gray-600">{eventCount} event{eventCount !== 1 ? 's' : ''}</p>
                    </div>
                  </Link>
                )}

                <Link
                  href="/organizer/events/new"
                  className="group relative overflow-hidden flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-brand-500 hover:bg-brand-50 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-500 group-hover:bg-brand-600 flex items-center justify-center text-white transition-colors">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Create Event</p>
                    <p className="text-sm text-gray-600">Start organizing</p>
                  </div>
                </Link>

                <Link
                  href="/dashboard"
                  className="group relative overflow-hidden flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center text-blue-600 transition-colors">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Dashboard</p>
                    <p className="text-sm text-gray-600">View analytics</p>
                  </div>
                </Link>

                <Link
                  href="/discover"
                  className="group relative overflow-hidden flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-green-100 group-hover:bg-green-200 flex items-center justify-center text-green-600 transition-colors">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Discover</p>
                    <p className="text-sm text-gray-600">Find events</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Account Info Sidebar */}
          <div className="space-y-6">
            
            {/* Account Details */}
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-brand-600" />
                Account Details
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name</label>
                  <p className="mt-1 text-gray-900 font-medium">{user.full_name}</p>
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</label>
                  <p className="mt-1 text-gray-900 font-medium break-all">{user.email}</p>
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</label>
                  <p className="mt-1 text-gray-900 font-medium">{user.phone_number || 'Not provided'}</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</label>
                  <div className="mt-2">
                    {user.is_verified ? (
                      <Badge variant="success" size="md" icon={<Shield className="w-4 h-4" />}>
                        Verified Account
                      </Badge>
                    ) : (
                      <Badge variant="warning" size="md">
                        Not Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Account Actions */}
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Account</h3>
              
              <div className="space-y-2">
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">Settings</span>
                </Link>
                
                {!user.is_verified && user.role === 'organizer' && (
                  <Link
                    href="/organizer/verify"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50 text-blue-600 transition-colors"
                  >
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">Get Verified</span>
                  </Link>
                )}
                
                <Link
                  href="/api/auth/logout"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-600 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Log Out</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
