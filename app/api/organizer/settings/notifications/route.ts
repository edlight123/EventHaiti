import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { adminDb } from '@/lib/firebaseAdmin';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Update notification preferences in Firestore
    await adminDb
      .collection('organizers')
      .doc(session.user.id)
      .collection('notificationPreferences')
      .doc('main')
      .set({
        ...body,
        updated_at: new Date().toISOString(),
      }, { merge: true });

    return NextResponse.json({ 
      success: true,
      message: 'Notification preferences updated successfully' 
    });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}
