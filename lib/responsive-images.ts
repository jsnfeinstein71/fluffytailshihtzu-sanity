const imageWidths = [320, 480, 640, 828, 1080, 1280, 1600, 1920, 2048]

// Match the existing card grid and the square portrait stage (75% of a card).
export const puppyCardSizes = '(max-width: 600px) calc(100vw - 42px), (max-width: 980px) calc(50vw - 36px), (max-width: 1160px) calc(33.33vw - 38px), 350px'
export const puppyCutoutSizes = '(max-width: 600px) calc(75vw - 31.5px), (max-width: 980px) calc(37.5vw - 27px), (max-width: 1160px) calc(25vw - 28.5px), 263px'

/** Width-only CDN variants keep the original framing and never add a background. */
export function getSanityImageProps(source: string) {
  let url: URL
  try { url = new URL(source) } catch { return null }
  // Leave external images and existing custom transforms completely unchanged.
  if (url.protocol !== 'https:' || url.hostname !== 'cdn.sanity.io' || url.port || url.search || url.hash) return null
  const match = url.pathname.match(/^\/images\/[a-z0-9]+\/[a-z0-9_-]+\/[a-zA-Z0-9]+-(\d+)x(\d+)\.(?:jpg|jpeg|png|webp|avif)$/)
  if (!match) return null
  const width = Number(match[1])
  const height = Number(match[2])
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) return null
  const widths = imageWidths.filter(candidate => candidate < width)
  widths.push(Math.min(width, imageWidths.at(-1)!))
  const candidates = [...new Set(widths)]
  const atWidth = (value: number) => `${source}?w=${value}&fit=max&auto=format`
  return {
    src: atWidth(Math.min(width, 828)),
    srcSet: candidates.map(candidate => `${atWidth(candidate)} ${candidate}w`).join(', '),
    width,
    height,
  }
}
