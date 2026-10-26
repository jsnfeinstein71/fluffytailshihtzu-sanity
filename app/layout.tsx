import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import './brand.css'
import SiteChrome from './components/SiteChrome'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.fluffytailshihtzu.com'),
  title: {
    default: 'FluffyTail Shih Tzu | Home-Raised Shih Tzu Puppies in Alabama',
    template: '%s | FluffyTail Shih Tzu',
  },
  description:
    'FluffyTail Shih Tzu is a small, home-based Shih Tzu breeder in Alabama. Our dogs live with us as family pets, and we work with families across the Southeast and beyond.',
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
      className="h-full antialiased"
    >
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/mun1gwi.css" />
      </head>
      <body className="min-h-full flex flex-col">
        <SiteChrome>{children}</SiteChrome>
        <Analytics />
      </body>
    </html>
  )
}

