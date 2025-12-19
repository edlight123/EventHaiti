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

type RsaPaddingMode = 'pkcs1' | 'oaep-sha1' | 'oaep-sha256'

function getRsaPaddingMode(): RsaPaddingMode {
  const mode = (process.env.MONCASH_BUTTON_RSA_PADDING || 'pkcs1').toLowerCase()
  if (mode === 'oaep' || mode === 'oaep-sha1') return 'oaep-sha1'
  if (mode === 'oaep-sha256') return 'oaep-sha256'
  return 'pkcs1'
}

function publicEncryptBase64(value: string): string {
  const keyPem = getMonCashButtonKeyPem()
  const buffer = Buffer.from(value, 'utf8')
  const paddingMode = getRsaPaddingMode()

  const keyObject = crypto.createPublicKey(keyPem)
  const modulusLength = (keyObject.asymmetricKeyDetails as any)?.modulusLength as number | undefined

  // OAEP has significant overhead; with small sandbox keys it will always fail.
  if (paddingMode !== 'pkcs1' && modulusLength && modulusLength < 1024) {
    throw new Error(
      `MonCash Button RSA key too small for OAEP (modulusLength=${modulusLength}). Set MONCASH_BUTTON_RSA_PADDING=pkcs1.`
    )
  }

  const encryptOptions: crypto.RsaPublicKey | crypto.RsaPublicKey = {
    key: keyPem,
    padding:
      paddingMode === 'pkcs1'
        ? crypto.constants.RSA_PKCS1_PADDING
        : crypto.constants.RSA_PKCS1_OAEP_PADDING,
  }

  if (paddingMode === 'oaep-sha256') {
    ;(encryptOptions as any).oaepHash = 'sha256'
  }

  // Default OAEP hash is SHA-1 (Node default), which is commonly expected by legacy gateways.
  try {
    const encrypted = crypto.publicEncrypt(encryptOptions as any, buffer)
    return encrypted.toString('base64')
  } catch (err: any) {
    if (err?.code === 'ERR_OSSL_RSA_DATA_TOO_LARGE_FOR_KEY_SIZE') {
      const k = modulusLength ? Math.ceil(modulusLength / 8) : undefined
      const overhead = paddingMode === 'pkcs1' ? 11 : undefined
      const maxLen = k && overhead ? k - overhead : undefined
      const hint =
        maxLen != null
          ? `Max plaintext length is ~${maxLen} bytes for this key/padding.`
          : 'Plaintext is larger than allowed for this key/padding.'

      throw new Error(
        `MonCash Button RSA encryption failed: data too large for key size (padding=${paddingMode}, modulusLength=${modulusLength ?? 'unknown'}). ${hint} Use a shorter orderId and ensure MONCASH_BUTTON_RSA_PADDING=pkcs1.`
      )
    }
    throw err
  }
}

function formatAmountForGateway(amount: number): string {
  // Many MonCash integrations expect a whole-number HTG amount.
  if (Number.isFinite(amount) && Math.abs(amount - Math.round(amount)) < 1e-9) {
    return String(Math.round(amount))
  }
  return amount.toFixed(2)
}

function getBusinessKey(): string {
  const businessKey = process.env.MONCASH_BUTTON_BUSINESS_KEY
  if (!businessKey) {
    throw new Error('MONCASH_BUTTON_BUSINESS_KEY is not configured')
  }
  return businessKey
}

function getBusinessKeyPathSegments(): { raw: string; encoded: string } {
  const raw = getBusinessKey()
  // Some vendor gateways do not route correctly if the path is percent-encoded.
  // We'll try raw first, then encoded as a fallback.
  const encoded = encodeURIComponent(raw)
  return { raw, encoded }
}

export function encryptToMonCashButtonBase64(value: string): string {
  return publicEncryptBase64(value)
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
  const businessKey = getBusinessKeyPathSegments()
  const configuredMode = getMonCashMode()
  const baseUrl = getMonCashMiddlewareBaseUrl()

  const amountStr = formatAmountForGateway(params.amount)
  const encryptedAmount = encryptToMonCashButtonBase64(amountStr)
  const encryptedOrderId = encryptToMonCashButtonBase64(params.orderId)

  const body = new URLSearchParams({
    amount: encryptedAmount,
    orderId: encryptedOrderId,
  }).toString()

  async function postForMode(mode: 'sandbox' | 'production', businessKeySegment: string): Promise<Response> {
    const modeBaseUrl = mode === configuredMode ? baseUrl : getMonCashMiddlewareBaseUrlForMode(mode)
    return fetch(`${modeBaseUrl}/Checkout/Rest/${businessKeySegment}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })
  }

  async function parseResponse(resp: Response): Promise<{ data?: MonCashButtonTokenResponse; rawText?: string }> {
    const rawText = await resp.text().catch(() => '')
    // Attempt JSON parse regardless of content-type; Digicel sometimes returns JSON without the header.
    const data = (() => {
      try {
        return JSON.parse(rawText) as MonCashButtonTokenResponse
      } catch {
        return undefined
      }
    })()
    return { data, rawText }
  }

  // Try with raw BusinessKey first.
  let response = await postForMode(configuredMode, businessKey.raw)
  let parsed = await parseResponse(response)

  // If routing rejects the raw key (or the key contains URL-sensitive characters), try encoded.
  if (!response.ok && (response.status === 404 || response.status === 410)) {
    response = await postForMode(configuredMode, businessKey.encoded)
    parsed = await parseResponse(response)
  }

  // If the portal keys belong to the other environment, Digicel often returns 404/410.
  // Only auto-fallback when MONCASH_BUTTON_MODE is NOT explicitly set.
  if (!response.ok && !isButtonModeExplicit() && (response.status === 404 || response.status === 410)) {
    const fallbackMode: 'sandbox' | 'production' = configuredMode === 'sandbox' ? 'production' : 'sandbox'
    console.warn('[MonCash Button] Token request failed on', configuredMode, 'status', response.status, '- trying', fallbackMode)
    response = await postForMode(fallbackMode, businessKey.raw)
    parsed = await parseResponse(response)

    if (!response.ok && (response.status === 404 || response.status === 410)) {
      response = await postForMode(fallbackMode, businessKey.encoded)
      parsed = await parseResponse(response)
    }
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
  const businessKey = getBusinessKeyPathSegments()
  const baseUrl = getMonCashMiddlewareBaseUrl()

  const encryptedOrderId = encryptToMonCashButtonBase64(orderId)

  let response = await fetch(`${baseUrl}/Checkout/${businessKey.raw}/Payment/Order/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      orderId: encryptedOrderId,
    }).toString(),
  })

  // Fallback for gateways that require encoded key.
  if (!response.ok && (response.status === 404 || response.status === 410)) {
    response = await fetch(`${baseUrl}/Checkout/${businessKey.encoded}/Payment/Order/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        orderId: encryptedOrderId,
      }).toString(),
    })
  }

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
