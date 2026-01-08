import { adminDb } from '@/lib/firebase/admin'

export type AuditAction = 
  | 'event.publish'
  | 'event.unpublish'
  | 'event.delete'
  | 'event.restore'
  | 'admin.backfill'
  | 'admin.search_index.rebuild'
  | 'user.verify'
  | 'user.unverify'
  | 'user.ban'
  | 'user.unban'
  | 'user.disable_posting'
  | 'user.enable_posting'
  | 'ticket.refund'
  | 'verification.approve'
  | 'verification.reject'
  | 'verification.needs_info'
  | 'bank_verification.approve'
  | 'bank_verification.reject'
  | 'bank_verification.needs_info'
  | 'payout.approve'
  | 'payout.decline'
  | 'payout.mark_paid'
  | 'payout.prefunding.update'
  | 'payout.receipt.upload'
  | 'payout.receipt.delete'
  | 'moncash.prefunded.transfer'
  | 'suspicious_activity.review'
  | 'withdrawal.approve'
  | 'withdrawal.reject'
  | 'withdrawal.complete'
  | 'withdrawal.fail'

function toIsoTimestamp(value: unknown): string {
  if (!value) return ''

  // Firestore Timestamp (admin SDK)
  const maybeTimestamp = value as any
  if (maybeTimestamp?.toDate && typeof maybeTimestamp.toDate === 'function') {
    try {
      return maybeTimestamp.toDate().toISOString()
    } catch {
      return ''
    }
  }

  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : ''
  }

  if (typeof value === 'number') {
    const d = new Date(value)
    return Number.isFinite(d.getTime()) ? d.toISOString() : ''
  }

  if (typeof value === 'string') {
    const d = new Date(value)
    return Number.isFinite(d.getTime()) ? d.toISOString() : ''
  }

  return ''
}

interface LogAuditParams {
  action: AuditAction
  adminId: string
  adminEmail: string
  resourceId?: string
  resourceType?: string
  details?: Record<string, any>
}

/**
 * Log an admin action to the audit trail
 */
export async function logAdminAction({
  action,
  adminId,
  adminEmail,
  resourceId,
  resourceType,
  details = {}
}: LogAuditParams): Promise<void> {
  try {
    const nowIso = new Date().toISOString()
    await adminDb.collection('admin_audit_log').add({
      action,
      adminId,
      adminEmail,
      resourceId: resourceId || null,
      resourceType: resourceType || null,
      details,
      timestamp: nowIso,
      timestampMs: Date.now(),
      createdAt: nowIso
    })
  } catch (error) {
    console.error('Error logging admin action:', error)
    // Don't throw - audit logging shouldn't break the main action
  }
}

/**
 * Get recent admin activities
 */
export async function getRecentAdminActivities(limit: number = 10) {
  try {
    const snapshot = await adminDb
      .collection('admin_audit_log')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get()

    return snapshot.docs.map((doc: any) => {
      const data = doc.data()
      const ts =
        toIsoTimestamp(data.timestamp) ||
        toIsoTimestamp(data.createdAt) ||
        toIsoTimestamp(data.timestampMs) ||
        ''
      return {
        id: doc.id,
        action: getActionDescription(data.action, data.details),
        user: data.adminEmail || 'Unknown Admin',
        timestamp: ts,
        icon: getActionIcon(data.action)
      }
    })
  } catch (error) {
    console.error('Error fetching admin activities:', error)
    return []
  }
}

/**
 * Convert action code to human-readable description
 */
function getActionDescription(action: string, details: any = {}): string {
  const descriptions: Record<string, string> = {
    'event.publish': `Published event "${details.eventTitle || 'Untitled'}"`,
    'event.unpublish': `Unpublished event "${details.eventTitle || 'Untitled'}"`,
    'event.delete': `Deleted event "${details.eventTitle || 'Untitled'}"`,
    'event.restore': `Restored event "${details.eventTitle || 'Untitled'}"`,
    'admin.backfill': `Backfilled ${details?.name || 'data'} (${details?.updated ?? 0} updated)`,
    'admin.search_index.rebuild': `Rebuilt admin search index (${details?.type || 'all'})`,
    'user.verify': `Verified user ${details.userName || details.userEmail || 'Unknown'}`,
    'user.unverify': `Unverified user ${details.userName || details.userEmail || 'Unknown'}`,
    'user.ban': `Banned user ${details.userName || details.userEmail || 'Unknown'}`,
    'user.unban': `Unbanned user ${details.userName || details.userEmail || 'Unknown'}`,
    'user.disable_posting': `Disabled posting for ${details.userName || details.userEmail || 'Unknown'}`,
    'user.enable_posting': `Enabled posting for ${details.userName || details.userEmail || 'Unknown'}`,
    'ticket.refund': `Refunded ticket #${details.ticketId || 'Unknown'}`,
    'verification.approve': `Approved verification for ${details.userName || 'Unknown'}`,
    'verification.reject': `Rejected verification for ${details.userName || 'Unknown'}`,
    'verification.needs_info': `Requested more info for ${details.userName || 'Unknown'}`,
    'bank_verification.approve': `Approved bank verification for ${details.organizerName || details.organizerEmail || 'Unknown'}`,
    'bank_verification.reject': `Rejected bank verification for ${details.organizerName || details.organizerEmail || 'Unknown'}`,
    'bank_verification.needs_info': `Requested more info for ${details.organizerName || details.organizerEmail || 'Unknown'}`,
    'payout.approve': `Approved payout ${details.payoutId || ''}`.trim(),
    'payout.decline': `Declined payout ${details.payoutId || ''}`.trim(),
    'payout.mark_paid': `Marked payout paid ${details.payoutId || ''}`.trim(),
    'payout.prefunding.update': `Updated payout prefunding settings`,
    'payout.receipt.upload': `Uploaded payout receipt ${details.payoutId || ''}`.trim(),
    'payout.receipt.delete': `Deleted payout receipt ${details.payoutId || ''}`.trim(),
    'moncash.prefunded.transfer': `MonCash prefunded transfer ${details.amount || ''}`.trim(),
    'suspicious_activity.review': `Reviewed suspicious activity ${details.activityId || ''}`.trim(),
    'withdrawal.approve': `Approved withdrawal ${details.withdrawalId || ''}`.trim(),
    'withdrawal.reject': `Rejected withdrawal ${details.withdrawalId || ''}`.trim(),
    'withdrawal.complete': `Completed withdrawal ${details.withdrawalId || ''}`.trim(),
    'withdrawal.fail': `Failed withdrawal ${details.withdrawalId || ''}`.trim(),
  }

  return descriptions[action] || action
}

/**
 * Get icon emoji for action type
 */
function getActionIcon(action: string): string {
  const icons: Record<string, string> = {
    'event.publish': '✅',
    'event.unpublish': '⏸️',
    'event.delete': '🗑️',
    'event.restore': '♻️',
    'admin.backfill': '🧹',
    'admin.search_index.rebuild': '🧭',
    'user.verify': '✓',
    'user.unverify': '⛔',
    'user.ban': '🚫',
    'user.unban': '✓',
    'user.disable_posting': '⛔',
    'user.enable_posting': '✓',
    'ticket.refund': '💰',
    'verification.approve': '✅',
    'verification.reject': '❌',
    'verification.needs_info': '📝',
    'bank_verification.approve': '✅',
    'bank_verification.reject': '❌',
    'bank_verification.needs_info': '📝',
    'payout.approve': '✅',
    'payout.decline': '❌',
    'payout.mark_paid': '💸',
    'payout.prefunding.update': '⚙️',
    'payout.receipt.upload': '📎',
    'payout.receipt.delete': '🗑️',
    'moncash.prefunded.transfer': '💸',
    'suspicious_activity.review': '🛡️',
    'withdrawal.approve': '✅',
    'withdrawal.reject': '❌',
    'withdrawal.complete': '💸',
    'withdrawal.fail': '⚠️',
  }

  return icons[action] || '📝'
}
