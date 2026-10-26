import Link from 'next/link'

type HomeHeroProps = {
  imageUrl?: string | null
  preview?: boolean
}

export default function HomeHero({imageUrl, preview = false}: HomeHeroProps) {
  const source = preview ? '/design-preview/IMG_6731.JPEG' : imageUrl

  return <section className={`home-hero${preview ? ' home-hero-proposal' : ''}`} aria-labelledby="home-title">
    {source ? <img
      src={source}
      alt={preview ? 'Two cream-colored FluffyTail Shih Tzu puppies sitting together outdoors' : 'A home-raised FluffyTail Shih Tzu puppy'}
      width={preview ? 2048 : undefined}
      height={preview ? 1536 : undefined}
      loading="eager"
      fetchPriority="high"
      decoding="async"
    /> : null}
    <div className="hero-content">
      <h1 id="home-title">FluffyTail<span>Shih Tzu</span></h1>
      <p className="hero-tagline">Tiny Paws, Big Love</p>
      <div className="hero-actions">
        <Link href="/available-puppies" className={`brand-button${preview ? '' : ' brand-button-light'}`}>Meet our puppies <span aria-hidden="true">&rarr;</span></Link>
        <Link className="hero-secondary" href="/about">Meet Jeanne</Link>
      </div>
    </div>
  </section>
}
