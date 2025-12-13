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

  // Cache token (expires in 3600 seconds, cache for 3500 to be safe)
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + 3500 * 1000,
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
    const token = await getAccessToken()
    const baseUrl = getMonCashBaseUrl()

    console.log('[MonCash] Creating payment with MerchantApi:', { amount, reference, account, baseUrl })

    const payload = {
      reference,
      account,
      amount: parseFloat(amount.toFixed(2)),
    }
    console.log('[MonCash] Payment payload:', JSON.stringify(payload))

    // Use /MerChantApi/V1/Payment (note: MerChantApi with capital C and H as per docs)
    const response = await fetch(`${baseUrl}/MerChantApi/V1/Payment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    console.log('[MonCash] Payment response status:', response.status)

    if (!response.ok) {
      const error = await response.text()
      console.error('[MonCash] Payment error response:', error)
      throw new Error(`MonCash payment creation failed: ${error}`)
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
    const token = await getAccessToken()
    const baseUrl = getMonCashBaseUrl()

    console.log('[MonCash] Initiating payment:', { amount, reference, account })

    const payload = {
      reference,
      account,
      amount: parseFloat(amount.toFixed(2)),
    }

    const response = await fetch(`${baseUrl}/MerChantApi/V1/InitiatePayment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`MonCash payment initiation failed: ${error}`)
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
    const token = await getAccessToken()
    const baseUrl = getMonCashBaseUrl()

    console.log('[MonCash] Checking payment status:', params)

    const response = await fetch(`${baseUrl}/MerChantApi/V1/CheckPayment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to check payment status: ${error}`)
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
