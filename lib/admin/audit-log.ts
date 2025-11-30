import { adminDb } from '@/lib/firebase/admin'

export type AuditAction = 
  | 'event.publish'
  | 'event.unpublish'
  | 'event.delete'
  | 'user.verify'
  | 'user.ban'
  | 'user.unban'
  | 'ticket.refund'
  | 'verification.approve'
  | 'verification.reject'

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
    await adminDb.collection('admin_audit_log').add({
      action,
      adminId,
      adminEmail,
      resourceId: resourceId || null,
      resourceType: resourceType || null,
      details,
      timestamp: new Date(),
      createdAt: new Date()
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

    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        action: getActionDescription(data.action, data.details),
        user: data.adminEmail || 'Unknown Admin',
        timestamp: data.timestamp?.toDate() || new Date(),
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
    'user.verify': `Verified user ${details.userName || details.userEmail || 'Unknown'}`,
    'user.ban': `Banned user ${details.userName || details.userEmail || 'Unknown'}`,
    'user.unban': `Unbanned user ${details.userName || details.userEmail || 'Unknown'}`,
    'ticket.refund': `Refunded ticket #${details.ticketId || 'Unknown'}`,
    'verification.approve': `Approved verification for ${details.userName || 'Unknown'}`,
    'verification.reject': `Rejected verification for ${details.userName || 'Unknown'}`
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
    'user.verify': '✓',
    'user.ban': '🚫',
    'user.unban': '✓',
    'ticket.refund': '💰',
    'verification.approve': '✅',
    'verification.reject': '❌'
  }

  return icons[action] || '📝'
}
