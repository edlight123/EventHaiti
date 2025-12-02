import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email, full_name } = body;

    if (!email || !full_name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Check if member already exists
    const existingMembers = await adminDb
      .collection('organizers')
      .doc(user.id)
      .collection('team')
      .where('email', '==', email.toLowerCase())
      .get();

    if (!existingMembers.empty) {
      return NextResponse.json(
        { error: 'This email is already in your team' },
        { status: 400 }
      );
    }

    // Create team member
    const teamMemberRef = await adminDb
      .collection('organizers')
      .doc(user.id)
      .collection('team')
      .add({
        email: email.toLowerCase(),
        full_name: full_name.trim(),
        role: 'door_staff',
        status: 'pending',
        created_at: new Date().toISOString(),
        invited_by: user.id,
      });

    const teamMember = {
      id: teamMemberRef.id,
      email: email.toLowerCase(),
      full_name: full_name.trim(),
      role: 'door_staff',
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    // TODO: Send invitation email
    console.log('Send invitation email to:', email);

    return NextResponse.json(teamMember);
  } catch (error) {
    console.error('Error inviting team member:', error);
    return NextResponse.json(
      { error: 'Failed to invite team member' },
      { status: 500 }
    );
  }
}
