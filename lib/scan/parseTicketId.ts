/**
 * Parse ticket ID from QR code scan result
 * Handles various formats:
 * - Direct ticket ID
 * - URL with ticket ID
 * - JSON with ticket ID
 */
export function parseTicketId(scanResult: string): string | null {
  if (!scanResult) return null

  // Remove whitespace
  const cleaned = scanResult.trim()

  // Try parsing as URL
  try {
    const url = new URL(cleaned)
    // Check for /tickets/{id} pattern
    const match = url.pathname.match(/\/tickets\/([a-zA-Z0-9_-]+)/)
    if (match) return match[1]
  } catch {
    // Not a URL, continue
  }

  // Try parsing as JSON
  try {
    const json = JSON.parse(cleaned)
    if (json.ticketId) return json.ticketId
    if (json.ticket_id) return json.ticket_id
    if (json.id) return json.id
  } catch {
    // Not JSON, continue
  }

  // Assume it's a direct ticket ID
  // Validate format (alphanumeric, hyphens, underscores)
  if (/^[a-zA-Z0-9_-]+$/.test(cleaned)) {
    return cleaned
  }

  return null
}

/**
 * Validate ticket ID format
 */
export function isValidTicketIdFormat(ticketId: string): boolean {
  return /^[a-zA-Z0-9_-]{10,}$/.test(ticketId)
}
