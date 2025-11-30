'use server'

import { checkInTicket, overrideCheckIn, type CheckInResult, type CheckInParams } from '@/lib/scan/checkInTicket'

export async function performCheckIn(params: CheckInParams): Promise<CheckInResult> {
  return await checkInTicket(params)
}

export async function performOverrideCheckIn(params: CheckInParams): Promise<CheckInResult> {
  return await overrideCheckIn(params)
}
