# EventHaiti - Event Ticketing Platform

A production-quality web application for discovering events and buying tickets in Haiti. Built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## 🎯 Features

### For Attendees
- **Browse Events**: Discover concerts, parties, conferences, festivals, and more
- **Buy Tickets**: Secure online ticket purchasing (simulated payment for MVP)
- **QR Code Tickets**: Digital tickets with QR codes for easy venue entry
- **Ticket Management**: View and manage purchased tickets

### For Organizers
- **Event Management**: Create, edit, and publish events
- **Dashboard**: Track ticket sales, revenue, and event statistics
- **Attendee Management**: View list of ticket holders
- **Ticket Validation**: Scan and validate tickets at the door

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **QR Codes**: qrcode.react
- **Deployment**: Vercel

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account ([supabase.com](https://supabase.com))

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

3. **Set up Supabase**
   
   Follow the instructions in `/supabase/README.md`:
   - Create a Supabase project
   - Run the SQL schema from `/supabase/schema.sql`
   - Get your project URL and anon key

4. **Configure environment variables**
   
   Create a `.env.local` file in the root directory:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
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