import crypto from 'crypto'

// Bump to confirm deployments in logs (no secrets).
const MONCASH_BUTTON_HELPER_VERSION = '2025-12-19d'

const MONCASH_SANDBOX_URL = 'https://sandbox.moncashbutton.digicelgroup.com'
const MONCASH_PRODUCTION_URL = 'https://moncashbutton.digicelgroup.com'

function getMonCashMode(): 'sandbox' | 'production' {
  const mode = (process.env.MONCASH_BUTTON_MODE || process.env.MONCASH_MODE || 'sandbox').toLowerCase()
  return mode === 'production' ? 'production' : 'sandbox'
}

function isButtonModeExplicit(): boolean {
  return typeof process.env.MONCASH_BUTTON_MODE === 'string' && process.env.MONCASH_BUTTON_MODE.length > 0
}

function isRsaPaddingExplicit(): boolean {
  return (
    typeof process.env.MONCASH_BUTTON_RSA_PADDING === 'string' && process.env.MONCASH_BUTTON_RSA_PADDING.length > 0
  )
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

function getRsaPaddingModesToTry(): RsaPaddingMode[] {
  const configured = getRsaPaddingMode()
  if (isRsaPaddingExplicit()) return [configured]

  const all: RsaPaddingMode[] = ['pkcs1', 'oaep-sha1', 'oaep-sha256']
  return [configured, ...all.filter((m) => m !== configured)]
}

function getKeyDetails() {
  const keyPem = getMonCashButtonKeyPem()
  const keyObject = crypto.createPublicKey(keyPem)
  const modulusLength = (keyObject.asymmetricKeyDetails as any)?.modulusLength as number | undefined
  return { keyPem, modulusLength }
}

function maxPlaintextBytes(modulusLengthBits: number | undefined, paddingMode: RsaPaddingMode): number | undefined {
  if (!modulusLengthBits) return undefined
  const k = Math.ceil(modulusLengthBits / 8)
  if (paddingMode === 'pkcs1') return k - 11
  const hLen = paddingMode === 'oaep-sha256' ? 32 : 20
  return k - 2 * hLen - 2
}

function publicEncryptBase64(value: string, paddingOverride?: RsaPaddingMode): string {
  const { keyPem, modulusLength } = getKeyDetails()
  const buffer = Buffer.from(value, 'utf8')
  const paddingMode = paddingOverride ?? getRsaPaddingMode()

  const maxLen = maxPlaintextBytes(modulusLength, paddingMode)
  if (maxLen != null && buffer.length > maxLen) {
    throw new Error(
      `MonCash Button RSA plaintext too long (len=${buffer.length}, max=${maxLen}) for padding=${paddingMode} (modulusLength=${modulusLength ?? 'unknown'}). Use a shorter orderId.`
    )
  }

  // OAEP has significant overhead; with small sandbox keys it will usually fail.
  if (paddingMode !== 'pkcs1' && modulusLength && modulusLength < 1024) {
    throw new Error(
      `MonCash Button RSA key too small for OAEP (modulusLength=${modulusLength}). Set MONCASH_BUTTON_RSA_PADDING=pkcs1.`
    )
  }

  const encryptOptions: crypto.RsaPublicKey = {
    key: keyPem,
    padding:
      paddingMode === 'pkcs1'
        ? crypto.constants.RSA_PKCS1_PADDING
        : crypto.constants.RSA_PKCS1_OAEP_PADDING,
  }

  if (paddingMode === 'oaep-sha256') {
    ;(encryptOptions as any).oaepHash = 'sha256'
  }

  try {
    const encrypted = crypto.publicEncrypt(encryptOptions as any, buffer)
    return encrypted.toString('base64')
  } catch (err: any) {
    if (err?.code === 'ERR_OSSL_RSA_DATA_TOO_LARGE_FOR_KEY_SIZE') {
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

function isLikelyBase64(value: string): boolean {
  const cleaned = value.trim().replace(/\s+/g, '')
  if (cleaned.length < 8) return false
  if (cleaned.length % 4 !== 0) return false
  return /^[A-Za-z0-9+/=]+$/.test(cleaned)
}

function base64DecodeUtf8(value: string): string | null {
  try {
    const decoded = Buffer.from(value.trim(), 'base64').toString('utf8').trim()
    if (!decoded) return null
    // Keep it conservative; BusinessKey is typically short ASCII.
    if (!/^[\x20-\x7E]+$/.test(decoded)) return null
    if (decoded.length > 256) return null
    return decoded
  } catch {
    return null
  }
}

function expandWhitespaceVariants(value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed) return []
  if (!/\s/.test(trimmed)) return [trimmed]

  const tokens = trimmed.split(/\s+/g).map((t) => t.trim()).filter(Boolean)
  const noWhitespace = trimmed.replace(/\s+/g, '')
  const joined = tokens.join('')

  // IMPORTANT: never include the original whitespace-containing value, because it will produce "%20" in the URL path.
  return Array.from(new Set([noWhitespace, ...tokens, joined].filter(Boolean)))
}

function getBusinessKeyCandidates(): string[] {
  const raw = getBusinessKey().trim()
  const candidates: string[] = []

  // If the env var was pasted with spaces/newlines, try additional variants.
  if (/\s/.test(raw)) {
    const tokens = raw.split(/\s+/g).map((t) => t.trim()).filter(Boolean)
    // Prefer whitespace-safe variants first so we avoid routing with "%20" in the path.
    const noWhitespace = raw.replace(/\s+/g, '')
    if (noWhitespace && noWhitespace !== raw) candidates.push(noWhitespace)
    for (const token of tokens) candidates.push(token)

    // Sometimes portals show a key in two wrapped lines; concatenation is the intended value.
    if (tokens.length > 1) {
      const joined = tokens.join('')
      if (joined && joined !== noWhitespace) candidates.push(joined)
    }
  }

  // Always include the raw value as a fallback.
  candidates.push(raw)

  // If any candidate looks like base64, also try decoding it (some portals provide an encoded BusinessKey).
  // If the decoded value contains whitespace, try its tokens first (to avoid "%20" in the path).
  for (const candidate of [...candidates]) {
    if (!isLikelyBase64(candidate)) continue
    const decoded = base64DecodeUtf8(candidate)
    if (!decoded) continue

    const decodedVariants = expandWhitespaceVariants(decoded)
    for (const v of decodedVariants) candidates.push(v)
  }

  // Dedupe + drop empties
  return Array.from(new Set(candidates.map((c) => c.trim()).filter(Boolean)))
}

function getBusinessKeyPathSegments(): string[] {
  // Some vendor gateways do not route correctly if the path is percent-encoded.
  // We'll try raw first, then encoded as a fallback.
  const segments: string[] = []
  for (const candidate of getBusinessKeyCandidates()) {
    if (/\s/.test(candidate)) continue
    segments.push(candidate)
    const encoded = encodeURIComponent(candidate)
    if (encoded !== candidate) segments.push(encoded)
  }
  return Array.from(new Set(segments))
}

export function encryptToMonCashButtonBase64(value: string): string {
  return publicEncryptBase64(value)
}

function encryptToMonCashButtonBase64WithPadding(value: string, paddingMode: RsaPaddingMode): string {
  return publicEncryptBase64(value, paddingMode)
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
  const configuredMode = getMonCashMode()
  const baseUrl = getMonCashMiddlewareBaseUrl()

  const amountStr = formatAmountForGateway(params.amount)
  const businessKeySegments = getBusinessKeyPathSegments()
  const paddingModes = getRsaPaddingModesToTry()

  async function postForMode(
    mode: 'sandbox' | 'production',
    businessKeySegment: string,
    paddingMode: RsaPaddingMode
  ): Promise<Response> {
    const modeBaseUrl = mode === configuredMode ? baseUrl : getMonCashMiddlewareBaseUrlForMode(mode)
    const encryptedAmount = encryptToMonCashButtonBase64WithPadding(amountStr, paddingMode)
    const encryptedOrderId = encryptToMonCashButtonBase64WithPadding(params.orderId, paddingMode)

    const body = new URLSearchParams({
      amount: encryptedAmount,
      orderId: encryptedOrderId,
    }).toString()

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

  const retryableHttpStatuses = new Set([404, 410])
  const retryableGatewayError = (rawText?: string) => {
    if (!rawText) return false
    return /system\s*error/i.test(rawText)
  }

  async function tryTokenRequestsForMode(mode: 'sandbox' | 'production') {
    let lastAttempt: { response: Response; parsed: { data?: MonCashButtonTokenResponse; rawText?: string } } | null =
      null
    let attempts = 0
    for (const paddingMode of paddingModes) {
      for (const segment of businessKeySegments) {
        try {
          attempts += 1
          const response = await postForMode(mode, segment, paddingMode)
          const parsed = await parseResponse(response)

          lastAttempt = { response, parsed }

          if (response.ok && parsed.data?.success && parsed.data.token) {
            return { response, parsed, attempts }
          }

          const rawText = parsed.rawText || ''
          const shouldRetry =
            !response.ok
              ? (response.status === 500 ? true : retryableHttpStatuses.has(response.status))
              : !parsed.data?.success && retryableGatewayError(rawText)

          if (!shouldRetry) {
            return { response, parsed, attempts }
          }
        } catch (err: any) {
          // Allow trying other variants when a padding/key combination can't encrypt.
          const message = String(err?.message || err)
          if (/rsa/i.test(message)) continue
          throw err
        }
      }
    }
    return lastAttempt ? { ...lastAttempt, attempts } : null
  }

  let bestAttempt = await tryTokenRequestsForMode(configuredMode)

  // If the portal keys belong to the other environment, Digicel often returns 404/410.
  // Only auto-fallback when MONCASH_BUTTON_MODE is NOT explicitly set.
  if (!bestAttempt && !isButtonModeExplicit()) {
    const fallbackMode: 'sandbox' | 'production' = configuredMode === 'sandbox' ? 'production' : 'sandbox'
    console.warn('[MonCash Button] Token request failed on', configuredMode, '- trying', fallbackMode)
    bestAttempt = await tryTokenRequestsForMode(fallbackMode)
  }

  if (!bestAttempt) throw new Error('MonCash Button token request failed: unable to perform any attempts')

  const { response, parsed } = bestAttempt
  const data = parsed.data
  if (!response.ok || !data?.success || !data.token) {
    const message =
      data?.message ||
      (parsed.rawText ? parsed.rawText.slice(0, 500) : '') ||
      `MonCash Button token request failed (${response.status})`

    // Avoid logging secrets; only include mode + status.
    console.error('[MonCash Button] Token request error:', {
      status: response.status,
      mode: configuredMode,
      helperVersion: MONCASH_BUTTON_HELPER_VERSION,
      modeExplicit: isButtonModeExplicit(),
      rsaPaddingExplicit: isRsaPaddingExplicit(),
      businessKeySegments: businessKeySegments.length,
      paddingModes: paddingModes.length,
      attempts: (bestAttempt as any)?.attempts,
    })
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
  const configuredMode = getMonCashMode()
  const baseUrl = getMonCashMiddlewareBaseUrl()
  const businessKeySegments = getBusinessKeyPathSegments()
  const paddingModes = getRsaPaddingModesToTry()

  const retryableHttpStatuses = new Set([404, 410])
  const retryableGatewayError = (rawText?: string) => {
    if (!rawText) return false
    return /system\s*error/i.test(rawText)
  }

  async function postLookupForMode(
    mode: 'sandbox' | 'production',
    businessKeySegment: string,
    paddingMode: RsaPaddingMode
  ): Promise<Response> {
    const modeBaseUrl = mode === configuredMode ? baseUrl : getMonCashMiddlewareBaseUrlForMode(mode)
    const encryptedOrderId = encryptToMonCashButtonBase64WithPadding(orderId, paddingMode)
    return fetch(`${modeBaseUrl}/Checkout/${businessKeySegment}/Payment/Order/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        orderId: encryptedOrderId,
      }).toString(),
    })
  }

  async function parsePaymentResponse(resp: Response): Promise<{ data?: MonCashButtonPaymentResponse; rawText?: string }> {
    const rawText = await resp.text().catch(() => '')
    const data = (() => {
      try {
        return JSON.parse(rawText) as MonCashButtonPaymentResponse
      } catch {
        return undefined
      }
    })()
    return { data, rawText }
  }

  async function tryLookupForMode(mode: 'sandbox' | 'production') {
    let lastAttempt: { response: Response; parsed: { data?: MonCashButtonPaymentResponse; rawText?: string } } | null =
      null
    let attempts = 0
    for (const paddingMode of paddingModes) {
      for (const segment of businessKeySegments) {
        try {
          attempts += 1
          const response = await postLookupForMode(mode, segment, paddingMode)
          const parsed = await parsePaymentResponse(response)

          lastAttempt = { response, parsed }

          if (response.ok && parsed.data?.success) {
            return { response, parsed, attempts }
          }

          const rawText = parsed.rawText || ''
          const shouldRetry =
            !response.ok
              ? (response.status === 500 ? true : retryableHttpStatuses.has(response.status))
              : !parsed.data?.success && retryableGatewayError(rawText)

          if (!shouldRetry) {
            return { response, parsed, attempts }
          }
        } catch (err: any) {
          const message = String(err?.message || err)
          if (/rsa/i.test(message)) continue
          throw err
        }
      }
    }
    return lastAttempt ? { ...lastAttempt, attempts } : null
  }

  let bestAttempt = await tryLookupForMode(configuredMode)
  if (!bestAttempt && !isButtonModeExplicit()) {
    const fallbackMode: 'sandbox' | 'production' = configuredMode === 'sandbox' ? 'production' : 'sandbox'
    bestAttempt = await tryLookupForMode(fallbackMode)
  }

  if (!bestAttempt) throw new Error('MonCash Button payment lookup failed: unable to perform any attempts')

  const { response, parsed } = bestAttempt
  const data = parsed.data
  if (!data) {
    const text = parsed.rawText || ''
    throw new Error(`MonCash Button payment lookup failed (${response.status}): ${text || 'Invalid JSON response'}`)
  }

  if (!response.ok) {
    console.error('[MonCash Button] Payment lookup error:', {
      status: response.status,
      mode: configuredMode,
      helperVersion: MONCASH_BUTTON_HELPER_VERSION,
      modeExplicit: isButtonModeExplicit(),
      rsaPaddingExplicit: isRsaPaddingExplicit(),
      businessKeySegments: businessKeySegments.length,
      paddingModes: paddingModes.length,
      attempts: (bestAttempt as any)?.attempts,
    })
    throw new Error(data?.message || `MonCash Button payment lookup failed (${response.status})`)
  }

  return data
}

export function isMonCashButtonConfigured(): boolean {
  return !!(process.env.MONCASH_BUTTON_BUSINESS_KEY && process.env.MONCASH_BUTTON_SECRET_API_KEY)
}
