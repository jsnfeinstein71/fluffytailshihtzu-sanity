import '../tests/register-typescript.mjs'
import {readFile} from 'node:fs/promises'
import {createServer} from 'node:http'
import {renderToStaticMarkup} from 'react-dom/server'
import * as queries from '../sanity/lib/inventory-queries.ts'

// Offline QA only: accepts public, projected query results, never credentials or live writes.
const snapshot = JSON.parse(await readFile(process.argv[2], 'utf8'))
globalThis.fixtureSanityFetch = async (query, params = {}) => {
  if (query === queries.littersQuery) return snapshot.litters
  if (query === queries.puppiesQuery) return snapshot.puppies
  if (query === queries.puppyQuery) return snapshot.puppies.find(p => p.slug === params.slug) || null
  if (query.includes('siteSettings')) return snapshot.settings
  throw Error('Unexpected preview query')
}

const pages = {}
for (const [route, file] of [['/', 'page'], ['/available-puppies', 'available-puppies/page'], ['/upcoming-litters', 'upcoming-litters/page']]) {
  pages[route] = (await import(`../app/${file}.tsx`)).default
}
const css = await readFile(new URL('../app/home.css', import.meta.url), 'utf8')
const server = createServer(async (req, res) => {
  try {
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-src 'self'")
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    if (req.method !== 'GET') {res.writeHead(405); res.end(); return}
    if (req.url === '/style.css') {res.setHeader('Content-Type', 'text/css'); res.end(css); return}
    if (req.url === '/mobile') {
      res.end('<html><body style="margin:0;background:#ddd">' + ['/', '/available-puppies', '/upcoming-litters'].map(route => `<iframe title="Mobile ${route}" style="width:390px;height:844px;border:0" src="${route}"></iframe>`).join('') + '</body></html>')
      return
    }
    const Page = pages[req.url]
    if (!Page) {res.writeHead(404); res.end(); return}
    let html = renderToStaticMarkup(await Page())
    // Keep image geometry while avoiding external requests in this restricted environment.
    html = html.replace(/src="https:[^"]*"/g, 'src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1EAAAAASUVORK5CYII="')
    res.end('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body>' + html + '</body></html>')
  } catch (error) {res.writeHead(500); res.end(String(error))}
})
server.listen(4175, '127.0.0.1', () => console.log('Offline snapshot layout preview: http://127.0.0.1:4175/mobile'))
