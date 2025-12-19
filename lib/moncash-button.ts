import crypto from 'crypto'

const MONCASH_SANDBOX_URL = 'https://sandbox.moncashbutton.digicelgroup.com'
const MONCASH_PRODUCTION_URL = 'https://moncashbutton.digicelgroup.com'

function getMonCashMode(): 'sandbox' | 'production' {
  const mode = (process.env.MONCASH_BUTTON_MODE || process.env.MONCASH_MODE || 'sandbox').toLowerCase()
  return mode === 'production' ? 'production' : 'sandbox'
}

function isButtonModeExplicit(): boolean {
  return typeof process.env.MONCASH_BUTTON_MODE === 'string' && process.env.MONCASH_BUTTON_MODE.length > 0
}

function getMonCashButtonHost(): string {
  return getMonCashMode() === 'production' ? MONCASH_PRODUCTION_URL : MONCASH_SANDBOX_URL
}

function getMonCashButtonHostForMode(mode: 'sandbox' | 'production'): string {
  return mode === 'production' ? MONCASH_PRODUCTION_URL : MONCASH_SANDBOX_URL
}

function getMonCashMiddlewareBaseUrlForMode(mode: 'sandbox' | 'production'): string {
  return `${getMonCashButtonHostForMode(mode)}/Moncash-middleware`
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
  const configuredMode = getMonCashMode()
  const baseUrl = getMonCashMiddlewareBaseUrl()

  const amountStr = params.amount.toFixed(2)
  const encryptedAmount = encryptToMonCashButtonBase64(amountStr)
  const encryptedOrderId = encryptToMonCashButtonBase64(params.orderId)

  const body = new URLSearchParams({
    amount: encryptedAmount,
    orderId: encryptedOrderId,
  }).toString()

  async function postForMode(mode: 'sandbox' | 'production'): Promise<Response> {
    const modeBaseUrl = mode === configuredMode ? baseUrl : getMonCashMiddlewareBaseUrlForMode(mode)
    return fetch(`${modeBaseUrl}/Checkout/Rest/${businessKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })
  }

  async function parseResponse(resp: Response): Promise<{ data?: MonCashButtonTokenResponse; rawText?: string }> {
    const contentType = resp.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return { data: (await resp.json().catch(() => undefined)) as MonCashButtonTokenResponse | undefined }
    }
    return { rawText: await resp.text().catch(() => '') }
  }

  let response = await postForMode(configuredMode)
  let parsed = await parseResponse(response)

  // If the portal keys belong to the other environment, Digicel often returns 404/410.
  // Only auto-fallback when MONCASH_BUTTON_MODE is NOT explicitly set.
  if (!response.ok && !isButtonModeExplicit() && (response.status === 404 || response.status === 410)) {
    const fallbackMode: 'sandbox' | 'production' = configuredMode === 'sandbox' ? 'production' : 'sandbox'
    console.warn('[MonCash Button] Token request failed on', configuredMode, 'status', response.status, '- trying', fallbackMode)
    response = await postForMode(fallbackMode)
    parsed = await parseResponse(response)
  }

  const data = parsed.data
  if (!response.ok || !data?.success || !data.token) {
    const message =
      data?.message ||
      (parsed.rawText ? parsed.rawText.slice(0, 500) : '') ||
      `MonCash Button token request failed (${response.status})`

    // Avoid logging secrets; only include mode + status.
    console.error('[MonCash Button] Token request error:', { status: response.status, mode: configuredMode })
    throw new Error(`MonCash Button token request failed (${response.status}): ${message}`)
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
