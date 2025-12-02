import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebaseAdmin';
import TeamList from './TeamList';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

async function getTeamMembers(userId: string) {
  const teamSnapshot = await adminDb
    .collection('organizers')
    .doc(userId)
    .collection('team')
    .orderBy('created_at', 'desc')
    .get();

  return teamSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export default async function TeamSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const teamMembers = await getTeamMembers(session.user.id);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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

        {/* Team List */}
        <TeamList 
          organizerId={session.user.id}
          initialMembers={teamMembers}
        />

        {/* Info Notice */}
        <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <p className="text-sm text-indigo-800">
            <strong>Team Roles:</strong> Door staff can check-in attendees using the EventHaiti app. You can assign specific events to each team member.
          </p>
        </div>
      </div>
    </div>
  );
}
