import { encryptJson, decryptJson } from '@/lib/security/encryption'

describe('Encryption Module', () => {
  const testData = {
    accountNumber: '1234567890',
    routingNumber: '987654321',
    swiftCode: 'ABCDUS33',
  }

  beforeAll(() => {
    // Ensure encryption key is set for tests
    if (!process.env.ENCRYPTION_KEY) {
      process.env.ENCRYPTION_KEY = 'test_encryption_key_32_chars!!'
    }
  })

  it('should encrypt and decrypt data correctly', () => {
    const encrypted = encryptJson(testData)
    expect(encrypted).toBeDefined()
    expect(typeof encrypted).toBe('object')
    expect(encrypted).toHaveProperty('v', 1)
    expect(encrypted).toHaveProperty('iv')
    expect(encrypted).toHaveProperty('tag')
    expect(encrypted).toHaveProperty('ciphertext')
    expect(encrypted.ciphertext).not.toContain('1234567890') // Should not contain plain text

    const decrypted = decryptJson(encrypted)
    expect(decrypted).toEqual(testData)
  })

  it('should produce different ciphertext for same input (IV randomization)', () => {
    const encrypted1 = encryptJson(testData)
    const encrypted2 = encryptJson(testData)
    
    expect(encrypted1).not.toEqual(encrypted2) // Different ciphertext
    expect(decryptJson(encrypted1)).toEqual(testData) // Both decrypt correctly
    expect(decryptJson(encrypted2)).toEqual(testData)
  })

  it('should handle empty objects', () => {
    const encrypted = encryptJson({})
    const decrypted = decryptJson(encrypted)
    expect(decrypted).toEqual({})
  })

  it('should handle nested objects', () => {
    const nested = {
      bank: {
        name: 'Test Bank',
        account: {
          number: '12345',
          routing: '67890',
        },
      },
    }
    
    const encrypted = encryptJson(nested)
    const decrypted = decryptJson(encrypted)
    expect(decrypted).toEqual(nested)
  })
})
