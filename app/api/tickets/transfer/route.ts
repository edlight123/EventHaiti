import { NextRequest, NextResponse } from 'next/server'

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error:
        'This endpoint is deprecated. Use POST /api/tickets/transfer/request to create a transfer link, then /api/tickets/transfer/respond to accept/reject.'
    },
    { status: 410 }
  )
}
