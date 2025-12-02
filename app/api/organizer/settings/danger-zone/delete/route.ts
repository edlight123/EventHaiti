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

    // NOTE: This is a simplified implementation
    // In production, you should:
    // 1. Check for pending payouts and handle them
    // 2. Notify attendees of cancelled events
    // 3. Process refunds if necessary
    // 4. Archive data for legal compliance before deletion
    // 5. Use a background job for complete deletion

    const batch = adminDb.batch();

    // Delete user document
    const userRef = adminDb.collection('users').doc(session.user.id);
    batch.delete(userRef);

    // Delete organizer document
    const organizerRef = adminDb.collection('organizers').doc(session.user.id);
    batch.delete(organizerRef);

    // Delete all events
    const eventsSnapshot = await adminDb.collection('events')
      .where('organizer_id', '==', session.user.id)
      .get();
    eventsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    // Note: Subcollections (team, payoutConfig, etc.) need to be deleted separately
    // This would typically be handled by a Cloud Function or background job

    return NextResponse.json({ 
      success: true,
      message: 'Account deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
