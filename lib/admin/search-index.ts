export type AdminSearchIndexType = 'event' | 'user' | 'order'

export type AdminSearchIndexDoc = {
  type: AdminSearchIndexType
  refId: string
  title: string
  subtitle: string | null
  href: string
  metadata: any | null
  tokens: string[]
  updatedAt: string
}

export function tokenizeForAdminSearch(input: string): string[] {
  const normalized = String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9@._\s-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) return []

  const rawParts = normalized
    .split(/[\s-]+/g)
    .map((p) => p.trim())
    .filter(Boolean)

  const tokens = new Set<string>()
  for (const part of rawParts) {
    if (part.length < 2) continue

    tokens.add(part)

    // Prefixes for typeahead (cap to avoid huge token arrays)
    const maxPrefix = Math.min(6, part.length)
    for (let i = 2; i <= maxPrefix; i++) {
      tokens.add(part.slice(0, i))
    }

    // Email-like parts: split on common separators
    if (part.includes('@') || part.includes('.')) {
      for (const sub of part.split(/[@.]+/g)) {
        const s = sub.trim()
        if (s.length >= 2) tokens.add(s)
      }
    }
  }

  return Array.from(tokens).slice(0, 60)
}

export function buildAdminSearchIndexDoc(params: {
  type: AdminSearchIndexType
  id: string
  title: string
  subtitle?: string
  href: string
  metadata?: any
  tokenSource: string
}): AdminSearchIndexDoc {
  const nowIso = new Date().toISOString()

  return {
    type: params.type,
    refId: params.id,
    title: params.title,
    subtitle: params.subtitle || null,
    href: params.href,
    metadata: params.metadata || null,
    tokens: tokenizeForAdminSearch(params.tokenSource),
    updatedAt: nowIso,
  }
}

export function adminSearchIndexDocId(type: AdminSearchIndexType, refId: string): string {
  return `${type}_${refId}`
}
