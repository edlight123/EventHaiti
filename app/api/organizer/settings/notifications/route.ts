import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { adminDb } from '@/lib/firebase/admin';

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Update notification preferences in Firestore
    await adminDb
      .collection('organizers')
      .doc(user.id)
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
