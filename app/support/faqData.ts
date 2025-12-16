export type UserRole = 'attendee' | 'organizer'

export interface FAQItem {
  question: string
  answer: string
}

export interface FAQCategory {
  id: string
  title: string
  icon: string
  description: string
  faqs: FAQItem[]
}

export const attendeeFAQs: FAQCategory[] = [
  {
    id: 'tickets-orders',
    title: 'Tickets & Orders',
    icon: '🎫',
    description: 'Purchase tickets, view orders, and manage your bookings',
    faqs: [
      {
        question: 'How do I purchase tickets?',
        answer: 'Browse events on the homepage or Discover page, click on an event you\'re interested in, select your ticket type and quantity, then click "Get Tickets". You\'ll be guided through a secure checkout process where you can pay with credit card, debit card, or MonCash.'
      },
      {
        question: 'Where can I find my tickets?',
        answer: 'After purchase, your tickets are available in the Tickets section of your account. You can access them by clicking on your profile icon and selecting "My Tickets". Each ticket includes a unique QR code for event entry.'
      },
      {
        question: 'Can I transfer my ticket to someone else?',
        answer: 'Yes! Go to your ticket details and click "Transfer Ticket". Enter the recipient\'s email address, and they\'ll receive an email with instructions to claim the ticket. The transfer must be accepted before the event starts.'
      },
      {
        question: 'What happens if I lose my ticket?',
        answer: 'Don\'t worry! Your tickets are safely stored in your EventHaiti account. Simply log in and navigate to "My Tickets" to view and download them again. You can also check your email for the original ticket confirmation.'
      },
      {
        question: 'Can I buy tickets without creating an account?',
        answer: 'You need an EventHaiti account to purchase tickets. This ensures your tickets are secure and allows you to easily manage, transfer, or get support for your orders. Creating an account only takes a minute!'
      }
    ]
  },
  {
    id: 'event-access',
    title: 'Event Access',
    icon: '🚪',
    description: 'Check-in, entry requirements, and event attendance',
    faqs: [
      {
        question: 'How do I get into an event?',
        answer: 'Present your ticket QR code at the event entrance. The organizer will scan it with the EventHaiti mobile app or scanner. Make sure your phone is charged and you can easily access your ticket in the app or email.'
      },
      {
        question: 'Can I enter with a screenshot of my ticket?',
        answer: 'While screenshots may work, we recommend using the original ticket from your account or email for the best experience. Some organizers may require the animated QR code from the app for security purposes.'
      },
      {
        question: 'What if my QR code won\'t scan?',
        answer: 'Increase your screen brightness, ensure the QR code isn\'t blurry, and try holding your phone steady. If it still doesn\'t work, show the ticket confirmation email or ticket ID to the event staff who can manually verify your entry.'
      },
      {
        question: 'Can I arrive late to an event?',
        answer: 'Entry policies vary by event. Check the event details page or contact the organizer directly. Most events allow late entry, but some performances or experiences may have strict start times.'
      },
      {
        question: 'Do I need to bring ID to the event?',
        answer: 'ID requirements depend on the event type. Age-restricted events (18+, 21+) typically require government-issued photo ID. Check the event details page for specific requirements.'
      }
    ]
  },
  {
    id: 'payments-refunds',
    title: 'Payments & Refunds',
    icon: '💳',
    description: 'Payment methods, pricing, and refund policies',
    faqs: [
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept Visa, Mastercard, American Express, and MonCash (for users in Haiti). All transactions are processed securely through our payment partners Stripe and MonCash.'
      },
      {
        question: 'Why was I charged a service fee?',
        answer: 'Service fees help us maintain the platform, provide customer support, and ensure secure payment processing. The fee is clearly displayed during checkout before you complete your purchase.'
      },
      {
        question: 'How do I get a refund?',
        answer: 'Refund policies are set by individual event organizers. To request a refund, go to your ticket details and click "Request Refund". You can also contact the organizer directly through the event page. Approved refunds typically process within 5-10 business days.'
      },
      {
        question: 'Can I get a refund if the event is cancelled?',
        answer: 'Yes! If an organizer cancels an event, you\'re automatically eligible for a full refund including service fees. Refunds for cancelled events are processed within 5-10 business days to your original payment method.'
      },
      {
        question: 'What currency are prices shown in?',
        answer: 'Prices are displayed in the currency selected by the event organizer, typically Haitian Gourdes (HTG) or US Dollars (USD). The currency is clearly shown on the event page and during checkout.'
      }
    ]
  },
  {
    id: 'account-profile',
    title: 'Account & Profile',
    icon: '👤',
    description: 'Manage your account settings and preferences',
    faqs: [
      {
        question: 'How do I create an account?',
        answer: 'Click "Sign Up" in the top navigation, enter your email address, create a password, and verify your email. You can also sign up with Google for faster access.'
      },
      {
        question: 'I forgot my password, what should I do?',
        answer: 'Click "Login" and then "Forgot Password". Enter your email address and we\'ll send you a link to reset your password. Make sure to check your spam folder if you don\'t see the email.'
      },
      {
        question: 'How do I update my profile information?',
        answer: 'Click on your profile icon, select "Profile", and then edit your information. You can update your name, email, phone number, photo, and location preferences.'
      },
      {
        question: 'Can I delete my account?',
        answer: 'Yes. Go to Settings > Privacy & Security > Delete Account. Please note this action is permanent and will remove all your data, tickets, and order history. Make sure to download any tickets for upcoming events first.'
      },
      {
        question: 'How do I change my notification preferences?',
        answer: 'Go to Settings > Notifications. You can customize which emails and push notifications you receive, including event reminders, ticket confirmations, and updates from organizers you follow.'
      }
    ]
  }
]

export const organizerFAQs: FAQCategory[] = [
  {
    id: 'create-manage-events',
    title: 'Create & Manage Events',
    icon: '📅',
    description: 'Create events, manage listings, and publish to attendees',
    faqs: [
      {
        question: 'How do I create an event?',
        answer: 'Click "Create Event" in your organizer dashboard. Fill in event details including title, description, date/time, location, and upload a banner image. Set up your ticket types and pricing, then preview and publish your event.'
      },
      {
        question: 'Can I edit my event after publishing?',
        answer: 'Yes! You can edit most event details at any time from your organizer dashboard. Changes are immediately reflected on the event page. However, changing ticket prices or cancelling an event may affect existing ticket holders.'
      },
      {
        question: 'How do I make my event private or invite-only?',
        answer: 'When creating or editing your event, look for the "Visibility" settings. You can set the event to "Unlisted" (only accessible via direct link) or use promo codes to restrict ticket sales to specific people.'
      },
      {
        question: 'What image sizes work best for event banners?',
        answer: 'We recommend 1920x1080 pixels (16:9 aspect ratio) for the best display across all devices. Images should be under 5MB in size. JPG and PNG formats are supported.'
      },
      {
        question: 'Can I create recurring events?',
        answer: 'Yes! When creating an event, select "Recurring Event" and choose your schedule (daily, weekly, monthly). Each occurrence will be automatically created with the same details, which you can edit individually if needed.'
      },
      {
        question: 'How do I cancel or postpone an event?',
        answer: 'Go to your event dashboard, select the event, and click "Cancel Event" or "Edit Event" to change the date. All ticket holders will be automatically notified. For cancellations, you\'ll need to process refunds for attendees.'
      }
    ]
  },
  {
    id: 'payments-payouts',
    title: 'Payments & Payouts',
    icon: '💰',
    description: 'Understand fees, receive payouts, and manage finances',
    faqs: [
      {
        question: 'How do I get paid for ticket sales?',
        answer: 'Payments are deposited directly to your verified bank account. After your event ends, you can request a payout from your organizer dashboard. Payouts typically process within 3-5 business days after approval.'
      },
      {
        question: 'What fees does EventHaiti charge?',
        answer: 'EventHaiti charges a platform fee of 2.5% + payment processing fees (typically 2.9% + HTG 15 per transaction). You can choose to pass these fees to attendees or absorb them yourself. All fees are transparent in your dashboard.'
      },
      {
        question: 'When can I request a payout?',
        answer: 'You can request a payout after your event has ended and a 7-day holding period has passed. This holding period protects against fraud and allows time for any refund requests.'
      },
      {
        question: 'How do I verify my bank account for payouts?',
        answer: 'Go to Settings > Payouts and add your bank account details. You\'ll need to provide your bank name, account number, and business documentation. Our team will verify your information within 1-2 business days.'
      },
      {
        question: 'What happens to fees if I issue a refund?',
        answer: 'When you issue a refund, the platform fees are refunded to you, but payment processing fees are non-refundable. This is because the processing fees were already paid to our payment partners.'
      },
      {
        question: 'Can I see a breakdown of my earnings?',
        answer: 'Yes! Your organizer dashboard includes detailed analytics showing ticket sales, fees, net revenue, and pending payouts. You can also export reports for accounting purposes.'
      }
    ]
  },
  {
    id: 'tickets-checkin',
    title: 'Tickets & Check-in',
    icon: '✅',
    description: 'Ticket types, pricing, and managing event entry',
    faqs: [
      {
        question: 'How do I scan tickets at my event?',
        answer: 'Download the EventHaiti Organizer mobile app (iOS/Android) and navigate to your event. Select "Check-in" or "Scan" mode. Point your camera at attendee QR codes to validate and check them in. The app works offline!'
      },
      {
        question: 'Can I have multiple ticket types?',
        answer: 'Yes! Create different ticket tiers with unique pricing, perks, and quantities. Examples: General Admission, VIP, Early Bird, Group Packages. Each ticket type can have its own price, description, and sales period.'
      },
      {
        question: 'How do I create free tickets?',
        answer: 'When setting up tickets, set the price to 0. Free tickets still generate valid QR codes and allow you to track attendance. You can also use promo codes to make paid tickets free for specific people.'
      },
      {
        question: 'What happens if someone tries to use a ticket twice?',
        answer: 'The check-in system prevents duplicate entries. Once a ticket is scanned and checked in, attempting to scan it again will show an "Already Used" warning. The scanner displays the original check-in time and location.'
      },
      {
        question: 'Can I export my attendee list?',
        answer: 'Yes! Go to your event dashboard, click "Attendees", and select "Export to CSV". This includes names, emails, ticket types, check-in status, and purchase dates. Great for mailing lists or follow-ups!'
      },
      {
        question: 'How do group discounts work?',
        answer: 'Create a group discount when setting up tickets. Specify the minimum quantity (e.g., 5+ tickets) and the discount percentage. The discount automatically applies at checkout when attendees purchase the required quantity.'
      }
    ]
  },
  {
    id: 'organizer-account',
    title: 'Organizer Account & Team',
    icon: '🏢',
    description: 'Account verification, team management, and settings',
    faqs: [
      {
        question: 'How do I become a verified organizer?',
        answer: 'Go to Settings > Verification and submit your identity documents (national ID or passport) and a selfie. Verified organizers get a blue checkmark badge, increased visibility, and can create unlimited events. Verification typically takes 1-2 business days.'
      },
      {
        question: 'Can I add team members to help manage my events?',
        answer: 'Yes! Go to Settings > Team and invite team members by email. You can assign different roles: Admin (full access), Manager (create/edit events), or Scanner (check-in only). Team members don\'t need to be verified organizers.'
      },
      {
        question: 'How do I add my organization\'s logo and branding?',
        answer: 'Go to Settings > Organization and upload your logo, set your organization name, and add your bio. This branding appears on all your event pages and helps build trust with attendees.'
      },
      {
        question: 'What are the requirements to start selling tickets?',
        answer: 'You need to create an organizer account, verify your identity, and add your payout information. Free events don\'t require verification or payout setup, but it\'s recommended for building credibility.'
      },
      {
        question: 'How do I contact attendees?',
        answer: 'From your event dashboard, click "Email Attendees" to send updates. You can message all ticket holders or filter by ticket type. Use this for important updates like schedule changes, parking info, or special announcements.'
      },
      {
        question: 'Can I see analytics for my events?',
        answer: 'Absolutely! Your dashboard includes detailed analytics: total sales, revenue trends, ticket type breakdown, traffic sources, and more. Use these insights to optimize future events and understand your audience better.'
      }
    ]
  }
]
