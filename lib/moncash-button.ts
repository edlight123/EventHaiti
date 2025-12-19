import crypto from 'crypto'

const MONCASH_SANDBOX_URL = 'https://sandbox.moncashbutton.digicelgroup.com'
const MONCASH_PRODUCTION_URL = 'https://moncashbutton.digicelgroup.com'

function getMonCashMode(): 'sandbox' | 'production' {
  const mode = (process.env.MONCASH_BUTTON_MODE || process.env.MONCASH_MODE || 'sandbox').toLowerCase()
  return mode === 'production' ? 'production' : 'sandbox'
}

function getMonCashButtonHost(): string {
  return getMonCashMode() === 'production' ? MONCASH_PRODUCTION_URL : MONCASH_SANDBOX_URL
}

function getMonCashMiddlewareBaseUrl(): string {
  return `${getMonCashButtonHost()}/Moncash-middleware`
}

function normalizePem(pem: string): string {
  // Vercel env vars often store PEMs with literal "\n"
  return pem.includes('\\n') ? pem.replace(/\\n/g, '\n') : pem
}

function toPublicKeyPemFromBase64(base64Der: string): string {
  // Convert base64 DER (SubjectPublicKeyInfo) to PEM.
  // Accept both raw and already-normalized strings.
  const cleaned = base64Der.replace(/\s+/g, '')
  const lines = cleaned.match(/.{1,64}/g) || [cleaned]
  return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`
}

function getMonCashButtonKeyPem(): string {
  // Digicel docs call this the "Secret API KEY". In practice it is usually a PEM key.
  const key = process.env.MONCASH_BUTTON_SECRET_API_KEY
  if (!key) {
    throw new Error('MONCASH_BUTTON_SECRET_API_KEY is not configured')
  }
  const normalized = normalizePem(key).trim()

  // If user provided a base64 DER/SPKI public key (common in vendor portals), wrap it into PEM.
  if (!normalized.includes('BEGIN')) {
    return toPublicKeyPemFromBase64(normalized)
  }

  return normalized
}

function getBusinessKey(): string {
  const businessKey = process.env.MONCASH_BUTTON_BUSINESS_KEY
  if (!businessKey) {
    throw new Error('MONCASH_BUTTON_BUSINESS_KEY is not configured')
  }
  return businessKey
}

export function encryptToMonCashButtonBase64(value: string): string {
  const keyPem = getMonCashButtonKeyPem()
  const buffer = Buffer.from(value, 'utf8')

  // The Digicel PDF describes RSA + base64. PKCS1 padding is the most common for legacy integrations.
  const encrypted = crypto.publicEncrypt(
    {
      key: keyPem,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    buffer
  )

  return encrypted.toString('base64')
}

type MonCashButtonTokenResponse = {
  success: boolean
  token?: string
  message?: string
}

export async function createMonCashButtonCheckoutToken(params: {
  amount: number
  orderId: string
}): Promise<{ token: string }> {
  const businessKey = encodeURIComponent(getBusinessKey())
  const baseUrl = getMonCashMiddlewareBaseUrl()

  const amountStr = params.amount.toFixed(2)
  const encryptedAmount = encryptToMonCashButtonBase64(amountStr)
  const encryptedOrderId = encryptToMonCashButtonBase64(params.orderId)

  const response = await fetch(`${baseUrl}/Checkout/Rest/${businessKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      amount: encryptedAmount,
      orderId: encryptedOrderId,
    }).toString(),
  })

  const data = (await response.json().catch(async () => {
    const text = await response.text().catch(() => '')
    throw new Error(`MonCash Button token request failed (${response.status}): ${text || 'Invalid JSON response'}`)
  })) as MonCashButtonTokenResponse

  if (!response.ok || !data?.success || !data.token) {
    throw new Error(data?.message || `MonCash Button token request failed (${response.status})`)
  }

  return { token: data.token }
}

export function getMonCashButtonRedirectUrl(token: string): string {
  const baseUrl = getMonCashMiddlewareBaseUrl()
  return `${baseUrl}/Checkout/Payment/Redirect/${token}`
}

type MonCashButtonPaymentResponse = {
  success: boolean
  reference?: string
  payment_status?: boolean
  transNumber?: string
  payer?: string
  cost?: string | number
  message?: string
}

export async function getMonCashButtonPaymentByOrderId(orderId: string): Promise<MonCashButtonPaymentResponse> {
  const businessKey = encodeURIComponent(getBusinessKey())
  const baseUrl = getMonCashMiddlewareBaseUrl()

  const encryptedOrderId = encryptToMonCashButtonBase64(orderId)

  const response = await fetch(`${baseUrl}/Checkout/${businessKey}/Payment/Order/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      orderId: encryptedOrderId,
    }).toString(),
  })

  const data = (await response.json().catch(async () => {
    const text = await response.text().catch(() => '')
    throw new Error(`MonCash Button payment lookup failed (${response.status}): ${text || 'Invalid JSON response'}`)
  })) as MonCashButtonPaymentResponse

  if (!response.ok) {
    throw new Error(data?.message || `MonCash Button payment lookup failed (${response.status})`)
  }

  return data
}

export function isMonCashButtonConfigured(): boolean {
  return !!(process.env.MONCASH_BUTTON_BUSINESS_KEY && process.env.MONCASH_BUTTON_SECRET_API_KEY)
}
