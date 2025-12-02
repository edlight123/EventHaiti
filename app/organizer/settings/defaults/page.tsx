import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebaseAdmin';
import DefaultsForm from './DefaultsForm';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

async function getOrganizerData(userId: string) {
  const organizerDoc = await adminDb.collection('organizers').doc(userId).get();
  return organizerDoc.exists ? organizerDoc.data() : null;
}

export default async function DefaultsSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const organizerData = await getOrganizerData(session.user.id);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
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
          <h1 className="text-3xl font-bold text-gray-900">Event Defaults</h1>
          <p className="text-gray-600 mt-2">
            Set default preferences for new events you create
          </p>
        </div>

        {/* Defaults Form */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <DefaultsForm 
            userId={session.user.id}
            initialData={{
              default_city: organizerData?.default_city || '',
              default_country: organizerData?.default_country || 'Haiti',
              default_timezone: organizerData?.default_timezone || 'America/Port-au-Prince',
              default_currency: organizerData?.default_currency || 'HTG',
              default_categories: organizerData?.default_categories || [],
            }}
          />
        </div>

        {/* Info Notice */}
        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-sm text-purple-800">
            <strong>Note:</strong> These defaults will be pre-filled when you create a new event, but you can always change them for individual events.
          </p>
        </div>
      </div>
    </div>
  );
}
