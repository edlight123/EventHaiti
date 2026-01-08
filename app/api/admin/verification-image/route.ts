import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { adminStorage } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

function normalizeBucketName(bucket: string): string {
  if (bucket.startsWith('gs://')) return bucket.slice('gs://'.length)
  return bucket
}

function getStorageBucketName(): string | null {
  const fromEnv = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  return fromEnv ? normalizeBucketName(fromEnv) : null
}

function parseStorageTarget(rawPath: string): { bucketName: string | null; objectPath: string } {
  const trimmed = rawPath.trim()
  if (trimmed.startsWith('gs://')) {
    // gs://<bucket>/<path>
    const withoutScheme = trimmed.slice('gs://'.length)
    const firstSlash = withoutScheme.indexOf('/')
    if (firstSlash === -1) {
      return { bucketName: withoutScheme, objectPath: '' }
    }
    return {
      bucketName: withoutScheme.slice(0, firstSlash),
      objectPath: withoutScheme.slice(firstSlash + 1),
    }
  }

  return { bucketName: null, objectPath: trimmed }
}

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin()

    // Only allow admin users
    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')

    if (!path) {
      return NextResponse.json(
        { error: 'Missing path parameter' },
        { status: 400 }
      )
    }

    const { bucketName: bucketFromPath, objectPath } = parseStorageTarget(path)
    const bucketName = bucketFromPath || getStorageBucketName()

    if (!bucketName) {
      return NextResponse.json(
        {
          error: 'Storage bucket not configured',
          hint: 'Set FIREBASE_STORAGE_BUCKET (or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) to your Firebase Storage bucket name.',
        },
        { status: 500 }
      )
    }

    if (!objectPath) {
      return NextResponse.json(
        { error: 'Invalid path parameter' },
        { status: 400 }
      )
    }

    // Get signed URL that expires in 1 hour
    const bucket = adminStorage.bucket(bucketName)
    const file = bucket.file(objectPath)

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    })

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Error generating signed URL:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
