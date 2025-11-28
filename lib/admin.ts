/**
 * Admin utilities
 */

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(e => e)

export function isAdmin(email?: string | null): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email)
}

export function getAdminEmails(): string[] {
  return ADMIN_EMAILS
}
