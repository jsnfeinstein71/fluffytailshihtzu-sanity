import Link from 'next/link'
import PublicImage from './PublicImage'
import type {ReactNode} from 'react'

type HomeHeroProps = {
  imageUrl?: string | null
  preview?: boolean
  actions?:ReactNode
}

export default function HomeHero({imageUrl, preview = false,actions}: HomeHeroProps) {
  // Replace only the pre-release CMS photograph; future Sanity selections remain editable.
  const legacyHero = 'https://cdn.sanity.io/images/3glz6dkx/production/bd64e3600d604b26c9be93461487adc79922acb2-3787x2580.jpg'
  const original = preview || !imageUrl || imageUrl === legacyHero
  const source = original ? '/design-preview/IMG_6731.JPEG' : imageUrl

  return <section className="home-hero home-hero-proposal" aria-labelledby="home-title">
    {source ? <PublicImage
      src={source}
      sizes="100vw"
      alt={original ? 'Two cream-colored FluffyTail Shih Tzu puppies sitting together outdoors' : 'A home-raised FluffyTail Shih Tzu puppy'}
      width={original ? 2048 : undefined}
      height={original ? 1536 : undefined}
      loading="eager"
      fetchPriority="high"
    /> : null}
    <div className="hero-content">
      <h1 id="home-title">FluffyTail<span>Shih Tzu</span></h1>
      <p className="hero-tagline">Tiny Paws, Big Love</p>
      <div className="hero-actions">
        {actions||<><Link href="/available-puppies" className="brand-button">Meet our puppies <span aria-hidden="true">&rarr;</span></Link><Link className="hero-secondary" href="/about">Meet Jeanne</Link></>}
      </div>
    </div>
  </section>
}
