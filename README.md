# EventHaiti - Event Ticketing Platform

A production-quality web application for discovering events and buying tickets in Haiti. Built with Next.js, TypeScript, Tailwind CSS, and **Firebase (Firestore + Firebase Auth + Firebase Storage)**.

## 🎯 Features

### For Attendees
- **Browse Events**: Discover concerts, parties, conferences, festivals, and more
- **Buy Tickets**: Real payment processing via Stripe (+ MonCash coming soon)
- **QR Code Tickets**: Digital tickets with QR codes for easy venue entry
- **Email Confirmations**: Professional ticket confirmations with embedded QR codes
- **WhatsApp Notifications**: Instant ticket delivery via WhatsApp (optional)
- **Favorites**: Save events to your favorites list
- **My Tickets**: View and manage all purchased tickets
- **Profile Management**: Update your account information

### For Organizers
- **Event Management**: Create, edit, and publish events with banner images
- **Image Upload**: Upload event banners directly to Firebase Storage
- **Dashboard**: Track ticket sales, revenue, and event statistics
- **Attendee Management**: View list of ticket holders with check-in status
- **Ticket Validation**: Check-in attendees with real-time stats
- **Analytics**: View sales trends and event performance
- **Promo Codes**: Create discount codes for events
- **Payment Settings**: Configure Stripe and MonCash accounts

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: **Firebase (Firestore + Firebase Auth + Firebase Storage)**
- **Payments**: Stripe + MonCash (Haiti local payment)
- **Email**: Resend API with HTML templates
- **WhatsApp**: Twilio WhatsApp API
- **QR Codes**: qrcode + qrcode.react
- **Deployment**: Vercel

## ✨ New Features Implemented

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
- **Event Notifications**: Organizers notified of new events

### 3. 🎫 QR Code Generation
- **Server-Side**: Generate QR codes in API routes
- **Client-Side**: Display QR codes in tickets
- **High Quality**: Error correction level H, 300x300px
- **Unique Codes**: Each ticket has unique QR code

### 4. 🖼️ Image Upload
- **Firebase Storage**: Direct upload to cloud storage
- **Drag & Drop**: Easy image selection
- **Preview**: See image before saving
- **Size Validation**: Max 5MB, PNG/JPG only
- **Public URLs**: Automatic public URL generation

### 5. 📱 WhatsApp Notifications
- **Twilio Integration**: Send messages via WhatsApp
- **Ticket Confirmations**: Instant WhatsApp delivery
- **Event Reminders**: Automated reminder messages
- **Format Support**: Rich text with emojis

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