import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { getDecryptedBankDestination } from '@/lib/firestore/payout-destinations'
import { requireAdmin } from '@/lib/auth'

const PAGE_SIZE = 50

function toISOStringMaybe(value: any): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value?.toDate === 'function') {
    try {
      const date = value.toDate()
      if (date instanceof Date) return date.toISOString()
    } catch {
      // no-op
    }
  }
  return String(value)
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const { error } = await requireAdmin()
    if (error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const statusFilterRaw = searchParams.get('status') || 'pending'
    const cursor = searchParams.get('cursor')

    // Map UI status to document status
    // UI: pending, approved, rejected -> Doc: pending, verified, failed
    const statusMap: Record<string, string> = {
      pending: 'pending',
      approved: 'verified',
      rejected: 'failed',
    }
    const statusFilter = statusMap[statusFilterRaw] || statusFilterRaw

    // Parse cursor if provided
    let cursorData: { submittedAt: string; path: string } | null = null
    if (cursor) {
      try {
        const decoded = Buffer.from(cursor, 'base64').toString('utf-8')
        cursorData = JSON.parse(decoded)
      } catch {
        return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 })
      }
    }

    // Query bank verifications only (filter by type === 'bank')
    let query = adminDb
      .collectionGroup('verificationDocuments')
      .where('type', '==', 'bank')
      .where('status', '==', statusFilter)
      .orderBy('submittedAt', 'desc')
      .limit(PAGE_SIZE + 1)

    if (cursorData) {
      const docSnap = await adminDb.doc(cursorData.path).get()
      if (docSnap.exists) {
        query = query.startAfter(docSnap)
      }
    }

    const snapshot = await query.get()
    const hasMore = snapshot.docs.length > PAGE_SIZE
    const docs = hasMore ? snapshot.docs.slice(0, PAGE_SIZE) : snapshot.docs

    // Process verifications
    const verifications = await Promise.all(
      docs.map(async (doc: any) => {
        const data = doc.data()
        const pathParts = doc.ref.path.split('/')
        // Path: organizers/{organizerId}/verificationDocuments/bank_{destinationId}
        const organizerId = pathParts[1]
        // Document ID is 'bank_{destinationId}', extract the destinationId from data or doc ID
        const docId = doc.id // e.g., 'bank_bank_primary'
        const destinationId = data.destinationId || docId.replace(/^bank_/, '')

        try {
          // Get organizer info
          const organizerDoc = await adminDb.collection('users').doc(organizerId).get()
          const organizerData = organizerDoc.data()

          // Get destination info (including isPrimary)
          const destinationDoc = await adminDb
            .collection('organizers')
            .doc(organizerId)
            .collection('payoutDestinations')
            .doc(destinationId)
            .get()

          if (!destinationDoc.exists) {
            return null
          }

          const destinationData = destinationDoc.data() as any
          const isPrimary = Boolean(destinationData?.isPrimary)

          // Get decrypted bank details
          let destination
          try {
            destination = await getDecryptedBankDestination({ organizerId, destinationId })
          } catch {
            return null
          }

          if (!destination) {
            return null
          }

          return {
            organizerId,
            organizerName: organizerData?.displayName || organizerData?.full_name || 'Unknown',
            organizerEmail: organizerData?.email || '',
            destinationId,
            isPrimary,
            bankDetails: {
              accountName: destination.accountHolder || '',
              accountNumber: destination.accountNumber
                ? `****${destination.accountNumber.slice(-4)}`
                : '',
              bankName: destination.bankName || '',
              routingNumber: destination.routingNumber || destination.swiftCode || '',
            },
            verificationDoc: {
              type: data.type,
              verificationType: data.verificationType || 'bank_statement',
              status: data.status,
              submittedAt: toISOStringMaybe(data.submittedAt),
              documentPath: data.documentPath,
              documentName: data.documentName || '',
              documentSize: data.documentSize || 0,
            },
          }
        } catch (error) {
          console.error('Error processing verification:', error)
          return null
        }
      })
    )

    const filteredVerifications = verifications.filter((v) => v !== null)

    // Create next cursor if there are more results
    let nextCursor: string | null = null
    if (hasMore && docs.length > 0) {
      const lastDoc = docs[docs.length - 1]
      const lastData = lastDoc.data()
      const cursorObj = {
        submittedAt: toISOStringMaybe(lastData.submittedAt),
        path: lastDoc.ref.path,
      }
      nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString('base64')
    }

    return NextResponse.json({
      verifications: filteredVerifications,
      hasMore,
      nextCursor,
    })
  } catch (error) {
    console.error('Error fetching bank verifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch verifications' },
      { status: 500 }
    )
  }
}
