import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Mark account as deactivated
    await adminDb.collection('users').doc(session.user.id).update({
      account_status: 'deactivated',
      deactivated_at: new Date().toISOString(),
      reactivation_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    });

    // Hide all events
    const eventsSnapshot = await adminDb.collection('events')
      .where('organizer_id', '==', session.user.id)
      .get();

    const batch = adminDb.batch();
    eventsSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { status: 'hidden', hidden_reason: 'account_deactivated' });
    });
    await batch.commit();

    return NextResponse.json({ 
      success: true,
      message: 'Account deactivated successfully',
      reactivation_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Error deactivating account:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate account' },
      { status: 500 }
    );
  }
}
