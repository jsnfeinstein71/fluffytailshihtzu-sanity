import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://www.fluffytailshihtzu.com'),
  title: {
    default: 'FluffyTail Shih Tzu | Home-Raised Shih Tzu Puppies in Alabama',
    template: '%s | FluffyTail Shih Tzu',
  },
  description:
    'FluffyTail Shih Tzu is a small, home-based Shih Tzu breeder in Alabama. Our dogs live with us as family pets, and we work with families across the Southeast and beyond.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: 'https://www.fluffytailshihtzu.com',
    siteName: 'FluffyTail Shih Tzu',
    title: 'FluffyTail Shih Tzu | Home-Raised Shih Tzu Puppies in Alabama',
    description:
      'Small home-based Shih Tzu breeder in Alabama. Home-raised puppies, family pets, and direct contact with FluffyTail Shih Tzu.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FluffyTail Shih Tzu | Home-Raised Shih Tzu Puppies in Alabama',
    description:
      'Small home-based Shih Tzu breeder in Alabama. Home-raised puppies, family pets, and direct contact with FluffyTail Shih Tzu.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}

