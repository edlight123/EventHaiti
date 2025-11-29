# EventHaiti - Premium Event Ticketing Platform ✨

A **production-quality, premium web application** for discovering events and buying tickets in Haiti. Built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, and **Firebase**, featuring an **Eventbrite/Posh-like premium experience** with advanced animations, modern UI components, and comprehensive features.

## 🎯 Premium Features

### 🎨 Premium UI/UX Design
- **Custom Design System**: 10-shade color palettes with brand colors (Teal & Orange)
- **Premium Components**: 15+ reusable UI components with modern styling
- **Gradient Backgrounds**: Beautiful gradient overlays and glass-morphism effects
- **Micro-interactions**: Smooth animations, hover effects, and transitions
- **Loading States**: Premium skeleton screens for better perceived performance
- **Success Celebrations**: Confetti animations and celebration modals
- **Premium Badges**: VIP, Trending, New, and status badges with icons
- **Empty States**: Beautiful empty state designs throughout the app

### For Attendees
- **🏠 Premium Home Page**: Featured carousel with auto-rotation and trending events
- **🔍 Advanced Search**: Expandable filters (Category, Location, Price, Date)
- **📊 Attendee Dashboard**: Personal dashboard with stats and upcoming events
- **🎟️ Browse Events**: Discover concerts, parties, conferences, festivals with premium cards
- **💳 Buy Tickets**: Real payment processing via Stripe (+ MonCash coming soon)
- **📱 QR Code Tickets**: Digital tickets with QR codes for easy venue entry
- **📧 Email Confirmations**: Professional ticket confirmations with embedded QR codes
- **💬 WhatsApp Notifications**: Instant ticket delivery via WhatsApp (optional)
- **❤️ Favorites**: Save events to your favorites list with premium UI
- **🎫 My Tickets**: View and manage all purchased tickets
- **👤 Profile Management**: Update your account information

### For Organizers
- **📊 Organizer Dashboard**: Premium dashboard with stats cards and quick actions
- **📅 Event Management**: Create, edit, and publish events with multi-step form
- **🖼️ Image Upload**: Upload event banners directly to Firebase Storage
- **📈 Analytics**: Sales charts and category distribution (Recharts integration)
- **✅ QR Scanner**: Premium check-in interface for attendee validation
- **📋 Attendee Management**: View ticket holders with check-in status
- **🎨 Event Cards**: Gallery view with filters, search, and status badges
- **🎟️ Promo Codes**: Create discount codes for events
- **💰 Payment Settings**: Configure Stripe and MonCash accounts

## 🛠 Tech Stack

- **Frontend**: Next.js 14.2.33 (App Router), React, TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Icons**: Lucide React (600+ premium icons)
- **Charts**: Recharts for data visualization
- **Backend**: **Firebase (Firestore + Firebase Auth + Firebase Storage)**
- **Payments**: Stripe + MonCash (Haiti local payment)
- **Email**: Resend API with HTML templates
- **WhatsApp**: Twilio WhatsApp API
- **QR Codes**: qrcode + qrcode.react
- **Deployment**: Vercel

## ✨ Premium Components Library

### UI Components
1. **Badge** - Premium badges with 9 variants (brand, trending, new, vip, success, error, warning, neutral, ghost)
2. **Button** - Modern buttons with multiple variants and sizes
3. **Card** - Flexible card component with premium styling
4. **Input** - Form inputs with validation states
5. **Select** - Custom select dropdown with premium styling
6. **Textarea** - Multi-line text input with character counter
7. **FileUpload** - Drag-and-drop file upload with preview
8. **Modal** - Premium modal dialogs with animations
9. **Toast** - Notification toasts with success/error/info states
10. **Tabs** - Tab navigation with smooth transitions

### Feature Components
11. **EventCard** - Premium event card with hover effects and badges
12. **EventCardSkeleton** - Loading skeleton for event cards
13. **FeaturedCarousel** - Auto-rotating carousel with indicators
14. **AdvancedSearch** - Comprehensive search with expandable filters
15. **EmptyState** - Beautiful empty state designs
16. **Confetti** - Celebration confetti animation
17. **SuccessCelebration** - Premium success modal with confetti
18. **FavoriteButton** - Animated favorite toggle
19. **FollowButton** - Organizer follow functionality
20. **Charts** - Sales and category distribution charts

## 📦 Project Structure

```
EventHaiti/
├── app/                          # Next.js App Router
│   ├── page.tsx                 # Premium home page with carousel
│   ├── loading.tsx              # App-wide loading skeleton
│   ├── dashboard/               # Attendee dashboard
│   ├── discover/                # Discover page with advanced search
│   ├── events/[id]/            # Event detail pages
│   ├── favorites/               # Favorites page with empty state
│   ├── tickets/                 # My tickets page
│   ├── organizer/               # Organizer features
│   │   ├── page.tsx            # Organizer dashboard
│   │   ├── events/             # Event management
│   │   ├── analytics/          # Analytics with charts
│   │   └── scan/               # QR code scanner
│   ├── auth/                    # Authentication pages
│   └── api/                     # API routes
├── components/                   # React components
│   ├── ui/                      # Base UI components (10)
│   ├── charts/                  # Chart components
│   ├── EventCard.tsx           # Premium event card
│   ├── AdvancedSearch.tsx      # Advanced search component
│   ├── EmptyState.tsx          # Empty state component
│   ├── Confetti.tsx            # Confetti animation
│   └── SuccessCelebration.tsx  # Success modal
├── lib/                         # Utilities and helpers
├── types/                       # TypeScript types
├── public/                      # Static assets
└── tailwind.config.ts          # Premium design system
```

## 🎨 Premium Transformation Phases

### Phase 1-3: Foundation & Core Pages
- ✅ Custom design system with 10-shade color palettes
- ✅ 10 reusable UI components (Badge, Button, Card, Input, etc.)
- ✅ Premium home page with featured carousel
- ✅ Event detail page redesign with gradient backgrounds
- ✅ Auto-rotating carousel with smooth transitions

### Phase 4: Advanced Features
- ✅ Premium discover page with category sections
- ✅ Analytics dashboard with Recharts (Sales & Category charts)
- ✅ Multi-step event creation form
- ✅ Toast notification system integration
- ✅ TypeScript improvements and fixes

### Phase 5: Dashboards & Enhanced UX
- ✅ **5A**: Organizer Dashboard with stats cards and quick actions
- ✅ **5B**: Advanced search with comprehensive filters
- ✅ **5C**: Enhanced scan/check-in page with premium styling
- ✅ **5D**: Attendee Dashboard with personalized stats

### Phase 6: Polish & Loading States
- ✅ AdvancedSearch integration on discover page
- ✅ App-wide loading skeleton (`loading.tsx`)
- ✅ EventCardSkeleton component for better UX

### Phase 7: Animations & Empty States
- ✅ Confetti celebration animation component
- ✅ SuccessCelebration modal for achievements
- ✅ EmptyState component for consistent empty views
- ✅ Premium empty states on Favorites, Tickets, Organizer Events

## 📊 Design System

### Color Palette
- **Brand (Teal)**: Primary color with 10 shades (50-900)
- **Accent (Orange)**: Secondary color with 10 shades (50-900)
- **Success (Green)**: For positive actions and confirmations
- **Error (Red)**: For errors and destructive actions
- **Warning (Yellow)**: For warnings and alerts
- **Info (Blue)**: For informational messages

### Typography
- **Headings**: Bold, modern font weights (600-800)
- **Body**: Clean, readable text (400-500)
- **Special**: Gradient text for premium feel

### Shadows
- **Soft**: Subtle elevation for cards
- **Medium**: Standard component elevation
- **Hard**: Strong elevation for modals
- **Glow**: Premium glow effect for highlights

### Animations
- **Transitions**: Smooth 200-300ms transitions
- **Hover Effects**: Scale, translate, and color changes
- **Loading**: Pulse and shimmer animations
- **Celebrations**: Confetti and bounce effects

## 🎯 Key Premium Features

### 1. 💳 Real Payment Integration
- **Stripe Checkout**: Secure hosted payment pages
- **Webhook Handling**: Automatic ticket creation after successful payment
- **Payment Tracking**: Store payment IDs and amounts
- **Test Mode**: Use Stripe test cards for development

### 2. 📧 Email Notifications
- **Resend API**: Professional email delivery service
- **HTML Templates**: Beautiful branded email designs
- **QR Code Embedding**: QR codes embedded directly in emails
- **Ticket Confirmations**: Instant email after purchase

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Firebase project ([firebase.google.com](https://firebase.google.com))
- Stripe account for payments ([stripe.com](https://stripe.com))
- Resend account for emails ([resend.com](https://resend.com))
- Twilio account for WhatsApp (optional) ([twilio.com](https://twilio.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd EventHaiti
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your credentials in `.env.local` (see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed guide)

4. **Set up Firebase**
   
   Follow the instructions in [FIREBASE_SETUP.md](./FIREBASE_SETUP.md):
   
   - Create a Firebase project at [firebase.google.com](https://firebase.google.com)
   - Enable Firestore Database
   - Enable Firebase Authentication (Email/Password provider)
   - Enable Firebase Storage
   - Download service account key for Firebase Admin SDK
   - Get your Firebase config credentials

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Detailed Setup Guide

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for comprehensive Firebase setup instructions including:
- Firebase project configuration
- Firestore database structure
- Firebase Authentication setup
- Firebase Storage configuration
- Environment variables reference
- Data migration from other platforms

Also see [SETUP.md](./SETUP.md) for:
- Stripe payment configuration
- Resend email setup
- Twilio WhatsApp integration
- Testing instructions
- Troubleshooting tips

## 🗂️ Project Structure

```
EventHaiti/
├── app/                      # Next.js app router pages
│   ├── api/                  # API routes
│   │   ├── create-checkout-session/  # Stripe checkout
│   │   └── webhooks/         # Payment webhooks
│   ├── events/               # Event browsing & details
│   ├── tickets/              # User ticket management
│   ├── favorites/            # Favorite events
│   ├── organizer/            # Organizer dashboard
│   │   ├── events/           # Event management
│   │   ├── analytics/        # Sales analytics
│   │   ├── settings/         # Payment settings
│   │   ├── scan/             # Ticket scanning
│   │   └── promo-codes/      # Discount codes
│   └── profile/              # User profile
├── components/               # Reusable React components
│   ├── ImageUpload.tsx       # Image upload widget
│   └── Navbar.tsx            # Navigation
├── lib/                      # Utility libraries
│   ├── firebase/             # Firebase client utilities
│   ├── firebase-db/          # Firebase Firestore wrapper (Supabase-compatible API)
│   ├── email.ts              # Email service (Resend)
│   ├── whatsapp.ts           # WhatsApp service (Twilio)
│   ├── qrcode.ts             # QR code generation
│   └── demo.ts               # Demo mode utilities
├── .env.example              # Environment variables template
├── FIREBASE_SETUP.md         # Firebase setup guide
├── SETUP.md                  # Integration setup guide
└── README.md                 # This file
```

## 🔒 Environment Variables

Required variables (see `.env.example`):
```bash
# Firebase (Required)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin SDK (Required for server-side)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Stripe (required for payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Resend (required for emails)
RESEND_API_KEY=

# Twilio WhatsApp (optional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=

# MonCash (optional, for Haiti payments)
MONCASH_CLIENT_ID=
MONCASH_SECRET_KEY=
MONCASH_MODE=
```

## 🧪 Testing

### Test Stripe Payments
Use test card numbers:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- Any future expiry and CVC

### Test Emails
- Check terminal logs for email content
- Use a real email to test Resend delivery

### Test WhatsApp
- Join Twilio sandbox first
- Use your phone number in E.164 format
- Check WhatsApp for confirmation

## 📱 Demo Mode

Set `NEXT_PUBLIC_DEMO_MODE=true` to enable demo mode with:
- Simulated payments (no actual charges)
- Mock data for testing
- Console logging instead of API calls

## 🚢 Deployment

### Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
   - Add environment variables
   - Deploy!

3. **Configure Webhooks**
   - Update Stripe webhook URL to production domain
   - Test webhook delivery

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙋 Support

For setup help or questions:
- See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for Firebase configuration
- See [SETUP.md](./SETUP.md) for integration guides
- Check [GitHub Issues](../../issues)
- Review Firebase/Stripe/Resend documentation

## 🎉 Acknowledgments

Built with:
- [Next.js](https://nextjs.org)
- [Firebase](https://firebase.google.com) (Firestore + Auth + Storage)
- [Stripe](https://stripe.com)
- [Resend](https://resend.com)
- [Twilio](https://twilio.com)
- [Tailwind CSS](https://tailwindcss.com)

## 🔧 Technical Note

The platform uses **Firebase (Firestore)** as its primary database with a Supabase-compatible API wrapper for easier migration and development. This means:
- ✅ All data is stored in Firebase Firestore (NoSQL)
- ✅ Firebase Authentication handles user auth
- ✅ Firebase Storage manages file uploads
- ✅ Code uses Supabase-like syntax but runs on Firebase
- ✅ No actual Supabase dependency in production

---

**EventHaiti** - Experience Haiti's Best Events 🇭🇹
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
EventHaiti/
├── app/                          # Next.js App Router pages
│   ├── auth/                     # Authentication pages
│   ├── events/                   # Event pages
│   ├── tickets/                  # Ticket pages
│   ├── organizer/                # Organizer dashboard
│   └── page.tsx                 # Home page
├── components/                   # Reusable React components
├── config/                       # Configuration files
├── lib/                         # Utility functions
├── types/                       # TypeScript type definitions
├── supabase/                    # Supabase configuration
└── public/                      # Static assets
```

## 🎨 Multi-Tenant Architecture

EventHaiti is designed with multi-tenancy in mind for future expansion to HaitiPass and HaitiEvents brands.

## 🚢 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import to Vercel
3. Configure environment variables
4. Deploy!

## 📝 MVP Features

- ✅ Event browsing and discovery
- ✅ User authentication (email/password)
- ✅ Ticket purchasing (simulated payment)
- ✅ QR code ticket generation
- ✅ Ticket validation (manual QR data entry)
- ✅ Organizer dashboard and analytics

---

**Built with ❤️ for Haiti** 🇭🇹

## 🔔 Push Notifications & Preferences (New)

Real-time and segmented notifications are supported via a progressive enhancement layer:
- Service Worker (`public/sw.js`) handles push events, offline caching, and notification action clicks.
- API endpoints: `POST /api/push/subscribe`, `POST /api/push/unsubscribe`, `POST /api/push/send`, `POST /api/push/test`.
- Topic opt-in: Users choose among `reminders`, `promotions`, `updates` for targeted sends.
- User association: Subscriptions may include a `userId` enabling user-specific targeting.
- Automatic pruning: Invalid/expired endpoints removed during send operations.

### Managing Preferences
Navigate to `/settings/notifications` to adjust topics and manage your subscription.
The page renders `components/settings/NotificationPreferences.tsx` providing:
- Enable / disable push subscription
- Topic chips with local persistence (`localStorage` key: `eh_push_topics`)
- Test notification trigger button
- Visibility into current permission state and subscription endpoint

### Environment Requirements
Add VAPID keys to `.env.local`:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
```
Generate with the `web-push` library or existing tooling.

### Sending Notifications
- Topic broadcast: POST `/api/push/send` body:
```json
{ "title": "Promo", "body": "New discount!", "topics": ["promotions"] }
```
Omit `topics` to broadcast to all.

- User-targeted: POST `/api/push/send-user` body:
```json
{ "userId": "uid_abc123", "title": "Reminder", "body": "Event starting soon", "url": "/tickets" }
```
Applies per-user rate limit (default: 20 notifications/hour) and prunes expired endpoints.

- Test broadcast: POST `/api/push/test` (no body) for system validation.

### Dispatch Logging
All send/test/user endpoints append a document to `pushDispatchLogs` with:
```jsonc
{
   "kind": "topic|user|test",
   "topics": ["promotions"], // topic only
   "userId": "uid_abc123",    // user only
   "title": "Promo",
   "body": "New discount!",
   "url": "/tickets",
   "sentCount": 3,
   "successCount": 3,
   "pruned": ["endpoint1"],
   "timestamp": "2025-11-29T02:15:00.000Z"
}
```

Use this collection for future analytics (CTR, failure rates, topic adoption).

### Common Issues / Troubleshooting
| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| Test notification returns 404 "No valid subscriptions" | Existing subscription stored without encryption keys | Disable then re-enable push (updates keys) |
| Notifications not received after enabling | Browser permission still "default" or service worker not active | Refresh page; ensure HTTPS + granted permission |
| Some endpoints pruned immediately | Stale or invalidated subscription | Re-subscribe; keys rotate automatically |
| Rate limit error (429) on user send | Exceeded 20 targeted sends/hour for user | Wait for window reset or lower volume |

If upgrading from earlier implementation (before key extraction fix), users must re-enable notifications to populate `keys.p256dh` and `keys.auth` for web-push encryption.

### User-Targeted Notifications (New)
Endpoint: `POST /api/push/send-user`
Body example:
```json
{ "userId": "uid_abc123", "title": "Ticket Update", "body": "Your ticket was transferred", "url": "/tickets" }
```
Behavior:
- Looks up subscriptions where `userId` matches.
- Rate limits per user (`20/hour`) via `pushRateLimits` collection.
- Prunes expired endpoints (404/410) automatically.
- Logs dispatch analytics in `pushDispatchLogs` with counts & pruned list.

Helper (client/server): `sendUserNotification(userId, title?, body?, url?, data?)` in `lib/push.ts`.

### Dispatch Logging
Each send (topic or user) can be extended to log to `pushDispatchLogs`:
```jsonc
{
   "kind": "user", // or "topic"
   "userId": "uid_abc123", // optional for topic
   "title": "Ticket Update",
   "sentCount": 2,
   "successCount": 2,
   "pruned": [],
   "timestamp": "2025-11-29T03:12:45.000Z"
}
```

### Rate Limiting Notes
- Current simple window: 1 hour rolling (stored `resetAt`).
- Increase robustness later with token bucket or per-role limits (organizer vs system).
- 429 response returns `{ error: 'Rate limit exceeded', limit: 20 }`.