export type UserRole = 'attendee' | 'organizer'

export type TicketStatus = 'active' | 'used' | 'cancelled'

export type ScanResult = 'valid' | 'already_used' | 'invalid'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          full_name: string
          email: string
          phone_number: string | null
          role: UserRole
          is_verified: boolean
          verification_status: 'none' | 'pending' | 'approved' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          phone_number?: string | null
          role?: UserRole
          is_verified?: boolean
          verification_status?: 'none' | 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          phone_number?: string | null
          role?: UserRole
          is_verified?: boolean
          verification_status?: 'none' | 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      verification_requests: {
        Row: {
          id: string
          user_id: string
          id_front_url: string
          id_back_url: string
          face_photo_url: string
          status: 'pending' | 'approved' | 'rejected'
          reviewed_by: string | null
          reviewed_at: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          id_front_url: string
          id_back_url: string
          face_photo_url: string
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          id_front_url?: string
          id_back_url?: string
          face_photo_url?: string
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          organizer_id: string
          title: string
          description: string
          category: string
          venue_name: string
          city: string
          commune: string
          address: string
          start_datetime: string
          end_datetime: string
          banner_image_url: string | null
          ticket_price: number
          currency: string
          total_tickets: number
          tickets_sold: number
          is_published: boolean
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organizer_id: string
          title: string
          description: string
          category: string
          venue_name: string
          city: string
          commune: string
          address: string
          start_datetime: string
          end_datetime: string
          banner_image_url?: string | null
          ticket_price: number
          currency?: string
          total_tickets: number
          tickets_sold?: number
          is_published?: boolean
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organizer_id?: string
          title?: string
          description?: string
          category?: string
          venue_name?: string
          city?: string
          commune?: string
          address?: string
          start_datetime?: string
          end_datetime?: string
          banner_image_url?: string | null
          ticket_price?: number
          currency?: string
          total_tickets?: number
          tickets_sold?: number
          is_published?: boolean
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      tickets: {
        Row: {
          id: string
          event_id: string
          attendee_id: string
          qr_code_data: string
          status: TicketStatus
          price_paid: number
          purchased_at: string
        }
        Insert: {
          id?: string
          event_id: string
          attendee_id: string
          qr_code_data: string
          status?: TicketStatus
          price_paid: number
          purchased_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          attendee_id?: string
          qr_code_data?: string
          status?: TicketStatus
          price_paid?: number
          purchased_at?: string
        }
      }
      ticket_scans: {
        Row: {
          id: string
          ticket_id: string
          event_id: string
          scanned_by: string
          scanned_at: string
          result: ScanResult
        }
        Insert: {
          id?: string
          ticket_id: string
          event_id: string
          scanned_by: string
          scanned_at?: string
          result: ScanResult
        }
        Update: {
          id?: string
          ticket_id?: string
          event_id?: string
          scanned_by?: string
          scanned_at?: string
          result?: ScanResult
        }
      }
      event_favorites: {
        Row: {
          id: string
          user_id: string
          event_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_id?: string
          created_at?: string
        }
      }
      organizer_follows: {
        Row: {
          id: string
          follower_id: string
          organizer_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          organizer_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          organizer_id?: string
          created_at?: string
        }
      }
      event_reviews: {
        Row: {
          id: string
          event_id: string
          user_id: string
          rating: number
          review_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          rating: number
          review_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          rating?: number
          review_text?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      event_photos: {
        Row: {
          id: string
          event_id: string
          uploaded_by: string
          photo_url: string
          caption: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          uploaded_by: string
          photo_url: string
          caption?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          uploaded_by?: string
          photo_url?: string
          caption?: string | null
          created_at?: string
        }
      }
    }
  }
}
