import Image from 'next/image'
import {getSanityImageProps} from '@/lib/responsive-images'

type PublicImageProps = {
  src: string
  alt: string
  sizes: string
  className?: string
  width?: number
  height?: number
  loading?: 'lazy' | 'eager'
  fetchPriority?: 'high' | 'low' | 'auto'
}

/** Keep approved sources and CSS intact while delivering responsive image bytes. */
export default function PublicImage({src, alt, sizes, className, width, height, loading = 'lazy', fetchPriority}: PublicImageProps) {
  if (src.startsWith('/') && !src.startsWith('//') && width && height) {
    return <Image src={src} alt={alt} className={className} width={width} height={height} sizes={sizes} loading={loading} fetchPriority={fetchPriority} decoding="async" />
  }
  const responsive = getSanityImageProps(src)
  // Sanity's own CDN handles only recognized original asset URLs. Future URLs
  // from other providers keep working without opening a remote optimizer proxy.
  // Preserve each caller's dimension behavior: intrinsic CMS dimensions can
  // override the existing square, CSS-sized detail stage for non-square photos.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={responsive?.src || src} srcSet={responsive?.srcSet} sizes={responsive ? sizes : undefined} width={width} height={height} alt={alt} loading={loading} fetchPriority={fetchPriority} decoding="async" />
}
