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

    // Gather all user data
    const userData: any = {};

    // Get user profile
    const userDoc = await adminDb.collection('users').doc(session.user.id).get();
    userData.profile = userDoc.data();

    // Get organizer data
    const organizerDoc = await adminDb.collection('organizers').doc(session.user.id).get();
    userData.organizer = organizerDoc.data();

    // Get events
    const eventsSnapshot = await adminDb.collection('events')
      .where('organizer_id', '==', session.user.id)
      .get();
    userData.events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Get payout config
    const payoutConfigDoc = await adminDb
      .collection('organizers')
      .doc(session.user.id)
      .collection('payoutConfig')
      .doc('main')
      .get();
    userData.payoutConfig = payoutConfigDoc.data();

    // Get payouts
    const payoutsSnapshot = await adminDb
      .collection('organizers')
      .doc(session.user.id)
      .collection('payouts')
      .get();
    userData.payouts = payoutsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Get team members
    const teamSnapshot = await adminDb
      .collection('organizers')
      .doc(session.user.id)
      .collection('team')
      .get();
    userData.team = teamSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Create JSON file
    const jsonData = JSON.stringify(userData, null, 2);
    const buffer = Buffer.from(jsonData);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="eventhaiti-data-${session.user.id}-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
