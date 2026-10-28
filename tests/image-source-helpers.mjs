export function imageSources(html) {
  return [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map(([, attribute]) => {
    const source = attribute.replaceAll('&amp;', '&')
    const url = new URL(source, 'https://www.fluffytailshihtzu.com')
    return url.pathname === '/_next/image' ? url.searchParams.get('url') : source
  })
}
