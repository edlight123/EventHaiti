# EventHaiti - Event Ticketing Platform

A production-quality web application for discovering events and buying tickets in Haiti. Built with Next.js, TypeScript, Tailwind CSS, and Supabase.

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
- **Image Upload**: Upload event banners directly to Supabase Storage
- **Dashboard**: Track ticket sales, revenue, and event statistics
- **Attendee Management**: View list of ticket holders with check-in status
- **Ticket Validation**: Check-in attendees with real-time stats
- **Analytics**: View sales trends and event performance
- **Promo Codes**: Create discount codes for events (coming soon)
- **Payment Settings**: Configure Stripe and MonCash accounts (coming soon)

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
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
- **Supabase Storage**: Direct upload to cloud storage
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
- A Supabase account ([supabase.com](https://supabase.com))
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
   Fill in your credentials in `.env.local` (see SETUP.md for detailed guide)

4. **Set up Supabase**
   
   Follow the instructions in `/supabase/README.md`:
4. **Set up Supabase**
   
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Run the SQL schema from `/supabase/schema.sql`
   - Run migrations in order:
     - `/supabase/migrations/001_add_favorites_table.sql`
     - `/supabase/migrations/002_add_organizer_settings_table.sql`
     - `/supabase/migrations/003_add_promo_codes_table.sql`
     - `/supabase/storage-setup.sql`
   - Get your project URL and anon key

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Detailed Setup Guide

See [SETUP.md](./SETUP.md) for comprehensive setup instructions including:
- Stripe payment configuration
- Resend email setup
- Twilio WhatsApp integration
- Supabase Storage configuration
- Environment variables reference
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
│   ├── my-tickets/           # User ticket management
│   ├── favorites/            # Favorite events
│   ├── organizer/            # Organizer dashboard
│   │   ├── events/           # Event management
│   │   ├── analytics/        # Sales analytics
│   │   ├── settings/         # Payment settings
│   │   └── promo-codes/      # Discount codes
│   └── profile/              # User profile
├── components/               # Reusable React components
│   ├── ImageUpload.tsx       # Image upload widget
│   └── Navbar.tsx            # Navigation
├── lib/                      # Utility libraries
│   ├── supabase/             # Supabase client
│   ├── email.ts              # Email service (Resend)
│   ├── whatsapp.ts           # WhatsApp service (Twilio)
│   ├── qrcode.ts             # QR code generation
│   └── demo.ts               # Demo mode utilities
├── supabase/                 # Database & storage
│   ├── schema.sql            # Database schema
│   ├── migrations/           # Database migrations
│   └── storage-setup.sql     # Storage bucket setup
├── .env.example              # Environment variables template
├── SETUP.md                  # Detailed setup guide
└── README.md                 # This file
```

## 🔒 Environment Variables

Required variables (see `.env.example`):
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

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
- See [SETUP.md](./SETUP.md) for detailed guides
- Check [GitHub Issues](../../issues)
- Review Supabase/Stripe/Resend documentation

## 🎉 Acknowledgments

Built with:
- [Next.js](https://nextjs.org)
- [Supabase](https://supabase.com)
- [Stripe](https://stripe.com)
- [Resend](https://resend.com)
- [Twilio](https://twilio.com)
- [Tailwind CSS](https://tailwindcss.com)

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