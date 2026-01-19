/**
 * API Route: Admin Platform Settings
 * 
 * GET: Retrieve current platform settings
 * PATCH: Update platform settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { getPlatformSettings, updatePlatformSettings } from '@/lib/admin/platform-settings'
import { DEFAULT_PLATFORM_SETTINGS } from '@/types/platform-settings'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/settings
 * Retrieve current platform settings
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await requireAdmin()
    if (error) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const settings = await getPlatformSettings()

    return NextResponse.json({
      success: true,
      settings,
      defaults: DEFAULT_PLATFORM_SETTINGS,
    })
  } catch (error) {
    console.error('Error fetching platform settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch platform settings' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/settings
 * Update platform settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await requireAdmin()
    if (error) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { haiti, usCanada, minimumPayoutAmount } = body

    // Validate input
    if (haiti && typeof haiti === 'object') {
      if (typeof haiti.platformFeePercentage !== 'number' || 
          haiti.platformFeePercentage < 0 || 
          haiti.platformFeePercentage > 1) {
        return NextResponse.json(
          { error: 'Invalid Haiti platform fee percentage (must be between 0 and 1)' },
          { status: 400 }
        )
      }
      if (typeof haiti.settlementHoldDays !== 'number' || 
          haiti.settlementHoldDays < 0) {
        return NextResponse.json(
          { error: 'Invalid Haiti settlement hold days (must be >= 0)' },
          { status: 400 }
        )
      }
    }

    if (usCanada && typeof usCanada === 'object') {
      if (typeof usCanada.platformFeePercentage !== 'number' || 
          usCanada.platformFeePercentage < 0 || 
          usCanada.platformFeePercentage > 1) {
        return NextResponse.json(
          { error: 'Invalid US/Canada platform fee percentage (must be between 0 and 1)' },
          { status: 400 }
        )
      }
      if (typeof usCanada.settlementHoldDays !== 'number' || 
          usCanada.settlementHoldDays < 0) {
        return NextResponse.json(
          { error: 'Invalid US/Canada settlement hold days (must be >= 0)' },
          { status: 400 }
        )
      }
    }

    if (minimumPayoutAmount !== undefined && 
        (typeof minimumPayoutAmount !== 'number' || minimumPayoutAmount < 0)) {
      return NextResponse.json(
        { error: 'Invalid minimum payout amount (must be >= 0)' },
        { status: 400 }
      )
    }

    // Update settings
    const updateData: any = {}
    if (haiti) updateData.haiti = haiti
    if (usCanada) updateData.usCanada = usCanada
    if (minimumPayoutAmount !== undefined) updateData.minimumPayoutAmount = minimumPayoutAmount

    const result = await updatePlatformSettings(updateData, user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update settings' },
        { status: 500 }
      )
    }

    // Fetch updated settings
    const updatedSettings = await getPlatformSettings()

    return NextResponse.json({
      success: true,
      message: 'Platform settings updated successfully',
      settings: updatedSettings,
    })
  } catch (error) {
    console.error('Error updating platform settings:', error)
    return NextResponse.json(
      { error: 'Failed to update platform settings' },
      { status: 500 }
    )
  }
}
