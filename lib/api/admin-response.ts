import { NextResponse } from 'next/server'

export type AdminApiOk<T> = {
  ok: true
  success: true
} & T

export type AdminApiError = {
  ok: false
  success: false
  error: string
  details?: string
}

export function adminOk<T extends Record<string, any>>(payload: T, status: number = 200) {
  return NextResponse.json({ ok: true, success: true, ...payload } as AdminApiOk<T>, { status })
}

export function adminError(error: string, status: number, details?: string) {
  const body: AdminApiError = { ok: false, success: false, error }
  if (details) body.details = details
  return NextResponse.json(body, { status })
}
