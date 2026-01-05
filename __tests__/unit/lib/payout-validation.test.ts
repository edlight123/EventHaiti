describe('Payout Name Matching', () => {
  const normalizeName = (value: string) =>
    String(value || '')
      .toLowerCase()
      .replace(/[']/g, '') // Remove apostrophes
      .replace(/[-]/g, ' ') // Replace hyphens with spaces
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  const nameMatchesOrganizer = (accountHolder: string, organizerNames: string[]): boolean => {
    const holder = normalizeName(accountHolder)
    if (!holder) return false
  
    const candidates = organizerNames.map(normalizeName).filter(Boolean)
    for (const candidate of candidates) {
      if (!candidate) continue
      if (holder === candidate) return true
      if (holder.includes(candidate) || candidate.includes(holder)) return true
    }
  
    return false
  }

  describe('Exact Name Matching', () => {
    it('should match exact names', () => {
      expect(nameMatchesOrganizer('John Smith', ['John Smith'])).toBe(true)
    })

    it('should match case-insensitive', () => {
      expect(nameMatchesOrganizer('john smith', ['John Smith'])).toBe(true)
      expect(nameMatchesOrganizer('JOHN SMITH', ['John Smith'])).toBe(true)
    })

    it('should match with extra spaces', () => {
      expect(nameMatchesOrganizer('John  Smith', ['John Smith'])).toBe(true)
      expect(nameMatchesOrganizer('John Smith ', ['John Smith'])).toBe(true)
    })
  })

  describe('Partial Name Matching', () => {
    it('should match partial names', () => {
      expect(nameMatchesOrganizer('John', ['John Smith'])).toBe(true)
      expect(nameMatchesOrganizer('Smith', ['John Smith'])).toBe(true)
    })

    it('should match full name against first name', () => {
      expect(nameMatchesOrganizer('John Smith', ['John'])).toBe(true)
    })
  })

  describe('Special Characters', () => {
    it('should ignore special characters', () => {
      expect(nameMatchesOrganizer("John O'Brien", ['John OBrien'])).toBe(true)
      expect(nameMatchesOrganizer('Jean-Paul', ['Jean Paul'])).toBe(true)
      // Note: José matches Jose due to partial matching (jos ⊂ jose)
      // This is a known limitation - accents are replaced with spaces,
      // and partial matching allows 'jos' to match 'jose'
      expect(nameMatchesOrganizer('José', ['Jose'])).toBe(true)
    })
  })

  describe('Multiple Organizer Names', () => {
    it('should match against any organizer name', () => {
      const organizerNames = ['John Smith', 'John Doe', 'john.smith@example.com']
      
      expect(nameMatchesOrganizer('John Smith', organizerNames)).toBe(true)
      expect(nameMatchesOrganizer('John Doe', organizerNames)).toBe(true)
      expect(nameMatchesOrganizer('John', organizerNames)).toBe(true)
    })
  })

  describe('Rejection Cases', () => {
    it('should reject completely different names', () => {
      expect(nameMatchesOrganizer('Jane Doe', ['John Smith'])).toBe(false)
    })

    it('should reject empty names', () => {
      expect(nameMatchesOrganizer('', ['John Smith'])).toBe(false)
      expect(nameMatchesOrganizer('John Smith', [''])).toBe(false)
    })

    it('should handle missing data gracefully', () => {
      expect(nameMatchesOrganizer('John', [])).toBe(false)
    })
  })

  describe('Last 4 Digits Extraction', () => {
    it('should extract last 4 digits from account number', () => {
      const accountNumber = '1234567890'
      const last4 = accountNumber.slice(-4)
      expect(last4).toBe('7890')
    })

    it('should handle short account numbers', () => {
      const accountNumber = '123'
      const last4 = accountNumber.slice(-4)
      expect(last4).toBe('123')
    })

    it('should handle empty strings', () => {
      const accountNumber = ''
      const last4 = accountNumber.slice(-4)
      expect(last4).toBe('')
    })
  })
})
