import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { BRAND } from '@/config/brand'
import { ToastProvider } from '@/components/ui/Toast'
import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt'
import EnableNotificationsButton from '@/components/pwa/EnableNotificationsButton'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: BRAND.name,
  description: `Discover and buy tickets for events in Haiti - ${BRAND.name}`,
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icon-192.svg', type: 'image/svg+xml' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: BRAND.name,
  },
}

export const viewport: Viewport = {
  themeColor: '#0F766E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          {children}
        </ToastProvider>
        <PWAInstallPrompt />
        <EnableNotificationsButton />
      </body>
    </html>
  )
}
