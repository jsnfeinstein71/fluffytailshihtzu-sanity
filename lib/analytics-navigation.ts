type NavigationOptions = {
  isStaticPublicPath: (path: string) => boolean
  stop: () => void
  isTracking: () => boolean
}

export const analyticsNavigationEvent = 'fluffytail:analytics-navigation'

/** Keep a loaded analytics document from observing an excluded destination. */
export function installAnalyticsNavigationBoundary(win: Window, options: NavigationOptions): () => void {
  const history = win.history
  const originalPush = history.pushState
  const originalReplace = history.replaceState
  let active = true
  const notify = () => win.dispatchEvent(new Event(analyticsNavigationEvent))
  const cleanStatic = (url: URL) => options.isStaticPublicPath(url.pathname) && !url.search && !url.hash
  const publicCandidate = (path: string) => options.isStaticPublicPath(path) || path.startsWith('/puppies/')

  const click = (event: MouseEvent) => {
    if (!active || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    // composedPath also handles clicks on text/SVG nested in an anchor.
    const anchor = event.composedPath().find((node): node is HTMLAnchorElement =>
      !!node && typeof (node as Element).tagName === 'string' && (node as Element).tagName.toLowerCase() === 'a')
    if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target.toLowerCase() !== '_self')) return
    const href = anchor.getAttribute('href')
    if (href === null) return
    const current = new URL(win.location.href)
    let destination: URL
    try { destination = new URL(href, current) } catch { return }
    if (destination.origin !== current.origin || !['http:', 'https:'].includes(destination.protocol)) return

    // Native fragment navigation must keep the skip link and section focus working.
    if (href.startsWith('#') || (destination.pathname === current.pathname && destination.search === current.search && destination.hash)) {
      options.stop()
      return
    }
    if (cleanStatic(destination) && (options.isStaticPublicPath(current.pathname) || options.isTracking())) return
    if (!publicCandidate(current.pathname) && !options.isTracking() && !options.isStaticPublicPath(destination.pathname)) return

    event.preventDefault()
    event.stopImmediatePropagation()
    options.stop()
    win.location.assign(destination.href)
  }

  const wrapHistory = (original: History['pushState'], replace: boolean): History['pushState'] => function (this: History, ...args: Parameters<History['pushState']>) {
    if (!active || this !== history || !options.isTracking() || args[2] === undefined || args[2] === null) return Reflect.apply(original, this, args)
    let destination: URL
    const current = new URL(win.location.href)
    try { destination = new URL(String(args[2]), current) } catch { return Reflect.apply(original, this, args) }
    // Preserve native SecurityError behavior for cross-origin or unsupported URLs.
    if (destination.origin !== current.origin || !['http:', 'https:'].includes(destination.protocol)) return Reflect.apply(original, this, args)
    if (!cleanStatic(destination)) {
      options.stop()
      if (replace) win.location.replace(destination.href)
      else win.location.assign(destination.href)
      return
    }
    const changed = destination.href !== current.href
    if (changed) options.stop()
    const result = Reflect.apply(original, this, args)
    if (changed) notify()
    return result
  }

  const push = wrapHistory(originalPush, false)
  const replace = wrapHistory(originalReplace, true)
  history.pushState = push
  history.replaceState = replace
  const pagehide = () => options.stop()
  const hashchange = () => { options.stop(); notify() }
  const popstate = () => {
    const wasTracking = options.isTracking()
    options.stop()
    if (wasTracking && !options.isStaticPublicPath(win.location.pathname)) win.location.reload()
    else notify()
  }
  const pageshow = (event: PageTransitionEvent) => {
    if (event.persisted) { options.stop(); notify() }
  }
  win.addEventListener('click', click, true)
  win.addEventListener('pagehide', pagehide)
  win.addEventListener('popstate', popstate)
  win.addEventListener('hashchange', hashchange)
  win.addEventListener('pageshow', pageshow)

  return () => {
    if (!active) return
    active = false
    options.stop()
    win.removeEventListener('click', click, true)
    win.removeEventListener('pagehide', pagehide)
    win.removeEventListener('popstate', popstate)
    win.removeEventListener('hashchange', hashchange)
    win.removeEventListener('pageshow', pageshow)
    // Next.js or another owner may have installed a newer wrapper in the meantime.
    if (history.pushState === push) history.pushState = originalPush
    if (history.replaceState === replace) history.replaceState = originalReplace
  }
}
