/**
 * MonCash Payment Integration for Haiti
 * 
 * MonCash is Haiti's leading mobile payment service by Digicel
 * Documentation: https://sandbox.moncashbutton.digicelgroup.com/Api/
 * 
 * Environment Variables Required:
 * - MONCASH_CLIENT_ID
 * - MONCASH_SECRET_KEY
 * - MONCASH_MODE (sandbox or production)
 */

const MONCASH_SANDBOX_URL = 'https://sandbox.moncashbutton.digicelgroup.com'
const MONCASH_PRODUCTION_URL = 'https://moncashbutton.digicelgroup.com'

function getMonCashBaseUrl(): string {
  const mode = process.env.MONCASH_MODE || 'sandbox'
  return mode === 'production' ? MONCASH_PRODUCTION_URL : MONCASH_SANDBOX_URL
}

interface MonCashTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

let cachedToken: { token: string; expiresAt: number } | null = null

function getJwtExpiryMs(token: string): number | null {
  // token is a JWT: header.payload.signature
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const payloadB64 = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=')

    const payloadJson = Buffer.from(payloadB64, 'base64').toString('utf8')
    const payload = JSON.parse(payloadJson)
    if (typeof payload.exp !== 'number') return null
    return payload.exp * 1000
  } catch {
    return null
  }
}

function shouldRetryWithFreshToken(status: number, bodyText: string): boolean {
  if (status !== 401) return false
  const text = (bodyText || '').toLowerCase()
  return text.includes('invalid_token') || text.includes('expired')
}

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    console.log('[MonCash] Using cached token')
    return cachedToken.token
  }

  const clientId = process.env.MONCASH_CLIENT_ID
  const secretKey = process.env.MONCASH_SECRET_KEY
  const mode = process.env.MONCASH_MODE || 'sandbox'

  console.log('[MonCash] Getting new token:', { mode, clientId: clientId?.substring(0, 8) + '...' })

  if (!clientId || !secretKey) {
    throw new Error('MonCash credentials not configured')
  }

  const credentials = Buffer.from(`${clientId}:${secretKey}`).toString('base64')
  const baseUrl = getMonCashBaseUrl()

  console.log('[MonCash] Token request URL:', `${baseUrl}/Api/oauth/token`)

  const response = await fetch(`${baseUrl}/Api/oauth/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'scope=read,write&grant_type=client_credentials',
  })

  console.log('[MonCash] Token response status:', response.status)

  if (!response.ok) {
    const error = await response.text()
    console.error('[MonCash] Token error response:', error)
    throw new Error(`Failed to get MonCash token: ${error}`)
  }

  const data: MonCashTokenResponse = await response.json()
  console.log('[MonCash] Token received, expires in:', data.expires_in)

  // Cache token. Prefer JWT exp when present, otherwise use expires_in.
  const jwtExpMs = getJwtExpiryMs(data.access_token)
  const expiresAt = jwtExpMs
    ? Math.max(Date.now() + 30_000, jwtExpMs - 60_000) // 60s safety buffer
    : Date.now() + Math.max(60, (data.expires_in || 3600) - 100) * 1000

  cachedToken = {
    token: data.access_token,
    expiresAt,
  }

  return data.access_token
}

interface CreatePaymentParams {
  amount: number
  reference: string // Order ID / reference
  account: string // Customer's MonCash phone number (e.g., "50938662809")
}

interface MonCashMerchantPaymentResponse {
  mode: string
  reference: string
  path: string
  amount: number
  transactionId: string
  account: string
  timestamp: number
  status: number
}

/**
 * Initiate a MonCash payment using MerchantApi
 * Customer will receive a payment request on their MonCash mobile app
 * 
 * @param amount - Amount in HTG
 * @param reference - Unique order/payment reference
 * @param account - Customer's MonCash phone number (e.g., "50938662809")
 * @returns Transaction ID and payment status
 */
export async function createMonCashPayment({ 
  amount, 
  reference,
  account,
}: CreatePaymentParams): Promise<{ transactionId: string; status: string }> {
  try {
    const baseUrl = getMonCashBaseUrl()

    console.log('[MonCash] Creating payment with MerchantApi:', { amount, reference, account, baseUrl })

    const payload = {
      reference,
      account,
      amount: parseFloat(amount.toFixed(2)),
    }
    console.log('[MonCash] Payment payload:', JSON.stringify(payload))

    // Use /MerChantApi/V1/Payment (note: MerChantApi with capital C and H as per docs)
    const doRequest = async (): Promise<Response> => {
      const token = await getAccessToken()
      return fetch(`${baseUrl}/MerChantApi/V1/Payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
    }

    let response = await doRequest()

    console.log('[MonCash] Payment response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[MonCash] Payment error response:', errorText)

      // Retry once with a fresh token if the cached one expired.
      if (shouldRetryWithFreshToken(response.status, errorText)) {
        cachedToken = null
        response = await doRequest()
        console.log('[MonCash] Payment retry response status:', response.status)
        if (!response.ok) {
          const errorText2 = await response.text()
          console.error('[MonCash] Payment retry error response:', errorText2)
          throw new Error(`MonCash payment creation failed: ${errorText2}`)
        }
      } else {
        throw new Error(`MonCash payment creation failed: ${errorText}`)
      }
    }

    const data: MonCashMerchantPaymentResponse = await response.json()
    console.log('[MonCash] Payment response:', JSON.stringify(data))

    return {
      transactionId: data.transactionId,
      status: data.status === 200 ? 'successful' : 'pending',
    }
  } catch (error: any) {
    console.error('MonCash payment error:', error)
    throw error
  }
}

/**
 * Initiate a MonCash payment without waiting for completion
 * Returns immediately with pending status
 * Use checkPaymentStatus() to poll for completion
 */
export async function initiateMonCashPayment({ 
  amount, 
  reference,
  account,
}: CreatePaymentParams): Promise<{ reference: string; status: string }> {
  try {
    const baseUrl = getMonCashBaseUrl()

    console.log('[MonCash] Initiating payment:', { amount, reference, account })

    const payload = {
      reference,
      account,
      amount: parseFloat(amount.toFixed(2)),
    }

    const doRequest = async (): Promise<Response> => {
      const token = await getAccessToken()
      return fetch(`${baseUrl}/MerChantApi/V1/InitiatePayment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
    }

    let response = await doRequest()

    if (!response.ok) {
      const errorText = await response.text()
      if (shouldRetryWithFreshToken(response.status, errorText)) {
        cachedToken = null
        response = await doRequest()
      }

      if (!response.ok) {
        const errorText2 = await response.text()
        throw new Error(`MonCash payment initiation failed: ${errorText2}`)
      }
    }

    const data = await response.json()
    console.log('[MonCash] Payment initiated:', JSON.stringify(data))

    return {
      reference: data.reference,
      status: data.message, // "pending"
    }
  } catch (error: any) {
    console.error('MonCash initiate payment error:', error)
    throw error
  }
}

interface CheckPaymentResponse {
  reference: string
  mode: string
  path: string
  amount: number
  message: string // "successful" or "pending" or "failed"
  transactionId: string
  account: string
  timestamp: number
  status: number
}

/**
 * Check the status of a MonCash payment
 * Can be called with either transactionId or reference
 */
export async function checkPaymentStatus(
  params: { transactionId: string } | { reference: string }
): Promise<CheckPaymentResponse> {
  try {
    const baseUrl = getMonCashBaseUrl()

    console.log('[MonCash] Checking payment status:', params)

    const doRequest = async (): Promise<Response> => {
      const token = await getAccessToken()
      return fetch(`${baseUrl}/MerChantApi/V1/CheckPayment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })
    }

    let response = await doRequest()

    if (!response.ok) {
      const errorText = await response.text()
      if (shouldRetryWithFreshToken(response.status, errorText)) {
        cachedToken = null
        response = await doRequest()
      }

      if (!response.ok) {
        const errorText2 = await response.text()
        throw new Error(`Failed to check payment status: ${errorText2}`)
      }
    }

    const data: CheckPaymentResponse = await response.json()
    console.log('[MonCash] Payment status:', JSON.stringify(data))
    
    return data
  } catch (error: any) {
    console.error('MonCash check payment error:', error)
    throw error
  }
}

export function isMonCashConfigured(): boolean {
  return !!(process.env.MONCASH_CLIENT_ID && process.env.MONCASH_SECRET_KEY)
}

export function getMonCashStatus(): string {
  if (!isMonCashConfigured()) {
    return 'not_configured'
  }
  return process.env.MONCASH_MODE || 'sandbox'
}
