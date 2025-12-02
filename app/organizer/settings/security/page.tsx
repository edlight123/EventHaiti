import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebaseAdmin';
import SecurityForm from './SecurityForm';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

async function getLoginHistory(userId: string) {
  const loginSnapshot = await adminDb
    .collection('organizers')
    .doc(userId)
    .collection('loginHistory')
    .orderBy('timestamp', 'desc')
    .limit(10)
    .get();

  return loginSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export default async function SecuritySettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const loginHistory = await getLoginHistory(session.user.id);

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
          <h1 className="text-3xl font-bold text-gray-900">Security</h1>
          <p className="text-gray-600 mt-2">
            Manage your password and monitor account activity
          </p>
        </div>

        {/* Security Form */}
        <SecurityForm 
          userId={session.user.id}
          loginHistory={loginHistory}
        />
      </div>
    </div>
  );
}
