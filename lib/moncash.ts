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
  orderId: string
  description?: string
}

interface MonCashPaymentResponse {
  payment_token: {
    token: string
    created: string
    expired: string
  }
  mode: string
  path: string
  status: number
  timestamp: number
}

export async function createMonCashPayment({ 
  amount, 
  orderId, 
  description = 'Event Ticket Purchase' 
}: CreatePaymentParams): Promise<{ paymentUrl: string; transactionId: string }> {
  try {
    const token = await getAccessToken()
    const baseUrl = getMonCashBaseUrl()

    console.log('[MonCash] Creating payment:', { amount, orderId, baseUrl })
    console.log('[MonCash] Token (first 20 chars):', token.substring(0, 20) + '...')

    const payload = {
      amount: parseInt(amount.toFixed(2)),
      orderId,
    }
    console.log('[MonCash] Payment payload:', JSON.stringify(payload))

    const response = await fetch(`${baseUrl}/Api/v1/CreatePayment`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    console.log('[MonCash] Payment response status:', response.status)
    console.log('[MonCash] Payment response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())))

    if (!response.ok) {
      const error = await response.text()
      console.error('[MonCash] Payment error response:', error)
      throw new Error(`MonCash payment creation failed: ${error}`)
    }

    const data = await response.json()
    console.log('[MonCash] Payment response:', JSON.stringify(data))
    console.log('[MonCash] Full response data:', { 
      path: data.path,
      status: data.status,
      mode: data.mode,
      timestamp: data.timestamp,
      payment_token: data.payment_token 
    })

    // Check if status is 202 (accepted) as per documentation
    if (data.status !== 202) {
      throw new Error(`MonCash returned unexpected status: ${data.status}`)
    }

    // According to MonCash docs: "The redirect URL to load the Payment Gateway will be:
    // GATEWAY_BASE+/Payment/Redirect?token=<payment-token>"
    // Note: Gateway is a public page, not an API endpoint (no /Api prefix)
    // For sandbox, the gateway might be at a different domain than the API
    let gatewayUrl = baseUrl
    
    // Try the standard gateway path first
    const paymentUrl = `${gatewayUrl}/Payment/Redirect?token=${data.payment_token.token}`

    console.log('[MonCash] Payment URL constructed:', paymentUrl)
    console.log('[MonCash] If gateway 404s, the sandbox gateway may not be available.')
    console.log('[MonCash] You may need to contact MonCash for the correct sandbox gateway URL.')

    return {
      paymentUrl,
      transactionId: data.payment_token.token,
    }
  } catch (error: any) {
    console.error('MonCash payment error:', error)
    throw error
  }
}

interface MonCashTransactionDetails {
  reference: string
  transaction_id: string
  cost: number
  message: string
  payer: string
}

export async function getTransactionDetails(
  transactionId: string
): Promise<MonCashTransactionDetails> {
  try {
    const token = await getAccessToken()
    const baseUrl = getMonCashBaseUrl()

    const response = await fetch(
      `${baseUrl}/Api/v1/RetrieveTransactionPayment`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactionId }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to retrieve transaction: ${error}`)
    }

    const data = await response.json()
    return data.payment
  } catch (error: any) {
    console.error('MonCash transaction retrieval error:', error)
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
