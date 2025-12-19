import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebase/admin';
import TeamList from './TeamList';
import Link from 'next/link';
import { ChevronLeft, Users, UserPlus2, ShieldCheck, Mail } from 'lucide-react';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

type TeamMember = {
  id: string;
  full_name?: string;
  email?: string;
  role?: string;
  status?: string;
  created_at?: string;
  [key: string]: unknown;
};

async function getTeamMembers(userId: string): Promise<TeamMember[]> {
  const teamSnapshot = await adminDb
    .collection('organizers')
    .doc(userId)
    .collection('team')
    .orderBy('created_at', 'desc')
    .get();

  return teamSnapshot.docs.map((doc: QueryDocumentSnapshot) => ({
    id: doc.id,
    ...(doc.data() as Omit<TeamMember, 'id'>),
  }));
}

export default async function TeamSettingsPage() {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect('/auth/login?redirect=/organizer/settings/team');
  }

  if (user.role !== 'organizer') {
    redirect('/organizer?redirect=/organizer/settings/team');
  }

  const teamMembers = await getTeamMembers(user.id);

  const totalMembers = teamMembers.length;
  const activeMembers = teamMembers.filter((member) => member.status === 'active').length;
  const pendingMembers = totalMembers - activeMembers;
  const lastInviteDate = teamMembers[0]?.created_at
    ? new Date(teamMembers[0].created_at).toLocaleDateString()
    : 'No invites yet';

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link 
          href="/organizer/settings"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Settings
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Team & Permissions</h1>
          <p className="text-gray-600 mt-2">
            Manage door staff and team member access to your events
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Team</p>
                <p className="text-2xl font-semibold text-gray-900">{totalMembers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Members</p>
                <p className="text-2xl font-semibold text-gray-900">{activeMembers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <UserPlus2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending Invites</p>
                <p className="text-2xl font-semibold text-gray-900">{pendingMembers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Invitation</p>
                <p className="text-base font-semibold text-gray-900">{lastInviteDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <TeamList 
              organizerId={user.id}
              initialMembers={teamMembers}
            />
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Role Guidelines</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-2">
                  <span className="text-indigo-500">•</span>
                  Door staff can scan tickets using the EventHaiti mobile app
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500">•</span>
                  Limit access to only the events each member needs
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500">•</span>
                  Remove access immediately if a device is lost or a member leaves your team
                </li>
              </ul>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
              <h3 className="text-base font-semibold text-indigo-900 mb-2">Need help?</h3>
              <p className="text-sm text-indigo-800 mb-4">
                Our support team can help onboard large teams, manage access, and set up custom permissions.
              </p>
              <Link
                href="mailto:support@eventhaiti.com"
                className="inline-flex items-center text-sm font-semibold text-indigo-700 hover:text-indigo-900"
              >
                Contact Support →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
