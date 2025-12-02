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
    const {
      organization_name,
      organization_type,
      organization_description,
      website,
      facebook,
      instagram,
      twitter,
      linkedin,
    } = body;

    // Validate required fields
    if (!organization_name || organization_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    // Update organizer data in Firestore
    await adminDb.collection('organizers').doc(user.id).set({
      organization_name: organization_name.trim(),
      organization_type: organization_type || '',
      organization_description: organization_description?.trim() || '',
      website: website?.trim() || '',
      social_media: {
        facebook: facebook?.trim() || '',
        instagram: instagram?.trim() || '',
        twitter: twitter?.trim() || '',
        linkedin: linkedin?.trim() || '',
      },
      updated_at: new Date().toISOString(),
    }, { merge: true });

    return NextResponse.json({ 
      success: true,
      message: 'Organization details updated successfully' 
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    );
  }
}
