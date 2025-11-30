/**
 * Admin utilities
 */

export function isAdmin(email?: string | null): boolean {
  if (!email) return false
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(e => e)
  return ADMIN_EMAILS.includes(email)
}

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(e => e)
}
