import type { LucideIcon } from 'lucide-react'
import { Ticket, DoorOpen, CreditCard, User, CalendarPlus, Wallet, QrCode, Users } from 'lucide-react'

export type UserRole = 'attendee' | 'organizer'

export interface FAQItem {
  question: string
  answer: string
}

export interface FAQCategory {
  id: string
  title: string
  description: string
  icon: LucideIcon
  faqs: FAQItem[]
}

export interface FAQCategoryMeta {
  id: string
  icon: LucideIcon
}

export const attendeeFAQCategoryMeta: FAQCategoryMeta[] = [
  { id: 'tickets-orders', icon: Ticket },
  { id: 'event-access', icon: DoorOpen },
  { id: 'payments-refunds', icon: CreditCard },
  { id: 'account-profile', icon: User }
]

export const organizerFAQCategoryMeta: FAQCategoryMeta[] = [
  { id: 'create-manage-events', icon: CalendarPlus },
  { id: 'payments-payouts', icon: Wallet },
  { id: 'tickets-checkin', icon: QrCode },
  { id: 'organizer-account', icon: Users }
]
