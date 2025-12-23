import { adminDb } from '@/lib/firebase/admin'
import { decryptJson, encryptJson } from '@/lib/security/encryption'

export type PayoutDestinationType = 'bank'

export type BankDestinationMeta = {
  id: string
  type: 'bank'
  bankName: string
  accountName: string
  accountNumberLast4: string
  isPrimary: boolean
  createdAt: string
  updatedAt: string
}

export type BankDestinationDetails = {
  accountNumber: string
  bankName: string
  accountHolder: string
  swiftCode?: string
  routingNumber?: string
  iban?: string
}

type StoredBankDestination = {
  type: 'bank'
  bankName: string
  accountName: string
  accountNumberLast4: string
  isPrimary?: boolean
  encrypted: {
    v: 1
    iv: string
    tag: string
    ciphertext: string
  }
  createdAt: string
  updatedAt: string
}

const destinationsCollection = (organizerId: string) =>
  adminDb.collection('organizers').doc(organizerId).collection('payoutDestinations')

export async function listBankDestinations(organizerId: string): Promise<BankDestinationMeta[]> {
  const snap = await destinationsCollection(organizerId).where('type', '==', 'bank').get()

  const items: BankDestinationMeta[] = []
  for (const doc of snap.docs) {
    const data = doc.data() as any
    items.push({
      id: doc.id,
      type: 'bank',
      bankName: String(data.bankName || ''),
      accountName: String(data.accountName || ''),
      accountNumberLast4: String(data.accountNumberLast4 || ''),
      isPrimary: Boolean(data.isPrimary),
      createdAt: String(data.createdAt || ''),
      updatedAt: String(data.updatedAt || ''),
    })
  }

  // Primary first, then stable sort.
  items.sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
    return a.createdAt.localeCompare(b.createdAt)
  })

  return items
}

export async function upsertPrimaryBankDestinationFromPayoutSettings(params: {
  organizerId: string
  bankDetails: BankDestinationDetails
}): Promise<{ id: string }> {
  const { organizerId, bankDetails } = params

  const now = new Date().toISOString()
  const id = 'bank_primary'

  const accountNumber = String(bankDetails.accountNumber)
  const last4 = accountNumber.slice(-4)

  const encrypted = encryptJson({
    accountNumber,
    bankName: String(bankDetails.bankName),
    accountHolder: String(bankDetails.accountHolder),
    swiftCode: bankDetails.swiftCode ? String(bankDetails.swiftCode) : undefined,
    routingNumber: bankDetails.routingNumber ? String(bankDetails.routingNumber) : undefined,
    iban: bankDetails.iban ? String(bankDetails.iban) : undefined,
  })

  const docRef = destinationsCollection(organizerId).doc(id)
  const existing = await docRef.get()
  const createdAt = existing.exists ? String((existing.data() as any)?.createdAt || now) : now

  const toStore: StoredBankDestination = {
    type: 'bank',
    bankName: String(bankDetails.bankName),
    accountName: String(bankDetails.accountHolder),
    accountNumberLast4: last4,
    isPrimary: true,
    encrypted,
    createdAt,
    updatedAt: now,
  }

  await docRef.set(toStore, { merge: true })

  return { id }
}

export async function addSecondaryBankDestination(params: {
  organizerId: string
  bankDetails: BankDestinationDetails
}): Promise<{ id: string }> {
  const { organizerId, bankDetails } = params

  const now = new Date().toISOString()

  const accountNumber = String(bankDetails.accountNumber)
  const last4 = accountNumber.slice(-4)

  const encrypted = encryptJson({
    accountNumber,
    bankName: String(bankDetails.bankName),
    accountHolder: String(bankDetails.accountHolder),
    swiftCode: bankDetails.swiftCode ? String(bankDetails.swiftCode) : undefined,
    routingNumber: bankDetails.routingNumber ? String(bankDetails.routingNumber) : undefined,
    iban: bankDetails.iban ? String(bankDetails.iban) : undefined,
  })

  const docRef = destinationsCollection(organizerId).doc()
  const toStore: StoredBankDestination = {
    type: 'bank',
    bankName: String(bankDetails.bankName),
    accountName: String(bankDetails.accountHolder),
    accountNumberLast4: last4,
    isPrimary: false,
    encrypted,
    createdAt: now,
    updatedAt: now,
  }

  await docRef.set(toStore)
  return { id: docRef.id }
}

export async function getDecryptedBankDestination(params: {
  organizerId: string
  destinationId: string
}): Promise<BankDestinationDetails | null> {
  const { organizerId, destinationId } = params

  const doc = await destinationsCollection(organizerId).doc(destinationId).get()
  if (!doc.exists) return null

  const data = doc.data() as any
  if (String(data?.type || '') !== 'bank') return null

  const encrypted = data?.encrypted
  if (!encrypted) return null

  const decoded = decryptJson<BankDestinationDetails>(encrypted)
  return decoded
}
