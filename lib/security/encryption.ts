import crypto from 'crypto'

type EncryptedPayloadV1 = {
  v: 1
  iv: string
  tag: string
  ciphertext: string
}

function decodeKey(raw: string): Buffer {
  const trimmed = raw.trim()

  // base64
  try {
    const b = Buffer.from(trimmed, 'base64')
    if (b.length === 32) return b
  } catch {
    // ignore
  }

  // hex
  if (/^[0-9a-fA-F]+$/.test(trimmed)) {
    const b = Buffer.from(trimmed, 'hex')
    if (b.length === 32) return b
  }

  // raw utf8
  const b = Buffer.from(trimmed, 'utf8')
  if (b.length === 32) return b

  throw new Error(
    'PAYOUT_DETAILS_ENCRYPTION_KEY must be 32 bytes (base64, hex, or raw).'
  )
}

function getKey(): Buffer {
  const raw = process.env.PAYOUT_DETAILS_ENCRYPTION_KEY
  if (!raw) {
    throw new Error('Missing PAYOUT_DETAILS_ENCRYPTION_KEY environment variable.')
  }
  return decodeKey(raw)
}

export function encryptJson(value: unknown): EncryptedPayloadV1 {
  const key = getKey()
  const iv = crypto.randomBytes(12)

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8')

  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()

  return {
    v: 1,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  }
}

export function decryptJson<T>(payload: EncryptedPayloadV1): T {
  if (!payload || payload.v !== 1) {
    throw new Error('Unsupported encrypted payload version')
  }

  const key = getKey()
  const iv = Buffer.from(payload.iv, 'base64')
  const tag = Buffer.from(payload.tag, 'base64')
  const ciphertext = Buffer.from(payload.ciphertext, 'base64')

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return JSON.parse(plaintext.toString('utf8')) as T
}
