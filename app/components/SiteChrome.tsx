'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'
import type {ReactNode} from 'react'

const navigation = [
  {href: '/available-puppies', label: 'Our puppies'},
  {href: '/upcoming-litters', label: 'Upcoming litters'},
  {href: '/pricing', label: 'Pricing & process'},
  {href: '/about', label: 'Meet Jeanne'},
]

export default function SiteChrome({children}: {children: ReactNode}) {
  const pathname = usePathname()
  const activeHref = pathname.startsWith('/puppies/') ? '/available-puppies' : pathname
  // The customer redesign must not restyle operator or Studio tools.
  if (['/inbox', '/studio', '/pay'].some(path => pathname === path || pathname.startsWith(path + '/'))) return children

  return <div className="brand-site">
    <a className="skip-link" href="#site-content">Skip to content</a>
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="site-brand" href="/" aria-label="FluffyTail Shih Tzu home">
          <img src="/brand/fluffytail-logo-color.svg" width={80} height={80} alt="" className="site-logo" />
          <span className="site-wordmark"><strong>FluffyTail</strong><span>Shih Tzu</span></span>
        </Link>
        <nav className="site-desktop-nav" aria-label="Main navigation">
          {navigation.map(link => <Link key={link.href} href={link.href} aria-current={activeHref === link.href ? 'page' : undefined}>{link.label}</Link>)}
          <Link className="brand-button" href="/contact" aria-current={pathname === '/contact' ? 'page' : undefined}>Ask Jeanne</Link>
        </nav>
        <details className="site-mobile-menu" key={pathname} onKeyDown={event => {
          if (event.key === 'Escape') {
            event.currentTarget.open = false
            event.currentTarget.querySelector('summary')?.focus()
          }
        }}>
          <summary title="Navigation menu">Menu</summary>
          <nav aria-label="Mobile navigation">
            {navigation.map(link => <Link key={link.href} href={link.href} aria-current={activeHref === link.href ? 'page' : undefined} onClick={event => event.currentTarget.closest('details')?.removeAttribute('open')}>{link.label}</Link>)}
            <Link href="/contact" onClick={event => event.currentTarget.closest('details')?.removeAttribute('open')}>Ask Jeanne</Link>
          </nav>
        </details>
      </div>
    </header>
    <div id="site-content" tabIndex={-1}>{children}</div>
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <img src="/brand/fluffytail-logo-white.svg" width={96} height={96} alt="FluffyTail Shih Tzu" />
          <div><p className="footer-tagline">Tiny Paws, Big Love</p><p>Raised in our home in the Mobile, Alabama area.</p></div>
        </div>
        <nav aria-label="Explore FluffyTail">
          <Link href="/available-puppies">Our puppies</Link>
          <Link href="/the-breed">About the breed</Link>
          <Link href="/puppy-resources">Getting ready for home</Link>
          <Link href="/contact">Contact Jeanne</Link>
        </nav>
        <div className="site-footer-bottom"><span>&copy; {new Date().getFullYear()} FluffyTail Shih Tzu</span><div><Link href="/privacy-policy">Privacy Policy</Link><Link href="/terms-and-conditions">Terms & Conditions</Link></div></div>
      </div>
    </footer>
  </div>
}
