export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  eventId?: string;
  ticketId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export type NotificationType =
  | 'ticket_purchased'
  | 'event_updated'
  | 'event_reminder_24h'
  | 'event_reminder_3h'
  | 'event_reminder_30min'
  | 'event_cancelled'
  | 'ticket_transferred'
  | 'ticket_received'
  | 'new_follower'
  | 'staff_invite';
