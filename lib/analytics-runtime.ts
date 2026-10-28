import {analyticsOrigin, cleanAnalyticsDocument, consentKey, consentLifetime, consentRecord, measurementId, readAnalyticsChoice, safeAnalyticsReferrer, type AnalyticsChoice, type AnalyticsPage} from './analytics-policy'
import {installAnalyticsNavigationBoundary} from './analytics-navigation'
import {staticAnalyticsPage} from './analytics-policy'

type Event = {type: 'pageview' | 'event'; url: string}
type VercelAdapter = {
  inject: (options: {disableAutoTrack: boolean; debug: boolean; beforeSend: (event: Event) => Event | null}) => void
  pageview: (options: {path: string; route: string}) => void
}
type AnalyticsWindow = Window & {dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; [key: `ga-disable-${string}`]: boolean}
const denied = {analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'}
const privacy = {
  send_page_view: false,
  allow_google_signals: false,
  allow_ad_personalization_signals: false,
  ads_data_redaction: true,
  url_passthrough: false,
  cookie_domain: 'none',
  cookie_flags: 'SameSite=Lax;Secure',
  cookie_expires: consentLifetime / 1000,
  cookie_update: false,
  campaign_id: '', campaign_source: '', campaign_medium: '', campaign_name: '', campaign_term: '', campaign_content: '',
}

/** One controller per document. Providers are never mounted by excluded pages. */
export function createPublicAnalyticsRuntime(win: Window, options: {
  production: boolean
  vercel: VercelAdapter
  onChoice: (choice: AnalyticsChoice | null) => void
}) {
  const browser = win as AnalyticsWindow
  let choice: AnalyticsChoice | null = null
  let page: AnalyticsPage | null = null
  let active = false
  let loaded = false
  let vercelLoaded = false
  let lastPath: string | null = null
  let googleScript: HTMLScriptElement | null = null
  let stoppedDocument = false
  let expiryTimer: number | undefined
  const documentAllowed = cleanAnalyticsDocument(win.location.href, options.production)
    && safeAnalyticsReferrer(win.document.referrer) !== null

  function storedChoice() {
    try { return readAnalyticsChoice(win.localStorage.getItem(consentKey)) } catch { return null }
  }
  function stop() {
    active = false
    browser[`ga-disable-${measurementId}`] = true
  }
  stop()

  function eligible() {
    return !stoppedDocument && documentAllowed && choice === 'accepted' && storedChoice() === 'accepted'
      && !!page && page.path === win.location.pathname && cleanAnalyticsDocument(win.location.href, options.production)
  }

  function safeVercelDocument() {
    try {
      return safeAnalyticsReferrer(win.document.referrer) !== null
        && win.localStorage.getItem('__va_attribution') === null
        && !win.document.querySelector('[data-flag-values]')
    } catch { return false }
  }

  function beforeSend(event: Event): Event | null {
    if (!active || !eligible() || !safeVercelDocument() || event.type !== 'pageview' || !page) return null
    try {
      const url = new URL(event.url)
      if (url.origin !== analyticsOrigin || url.pathname !== page.path) return null
      return {type: 'pageview', url: `${analyticsOrigin}${page.path}`}
    } catch { return null }
  }

  function context(current: AnalyticsPage) {
    return {page_location: `${analyticsOrigin}${current.path}`, page_title: current.title,
      // Attribution is intentionally limited. No incoming private/referral URL is forwarded to Google.
      page_referrer: ''}
  }

  function sendPage() {
    if (!eligible() || !page) { stop(); return }
    active = true
    browser[`ga-disable-${measurementId}`] = false
    if (!loaded) {
      loaded = true
      browser.dataLayer = browser.dataLayer || []
      // Google requires an arguments object in the data layer, not an array.
      // eslint-disable-next-line prefer-rest-params
      browser.gtag = function () { browser.dataLayer!.push(arguments) }
      browser.gtag('consent', 'default', denied)
      browser.gtag('set', {...privacy, ...context(page)})
      browser.gtag('consent', 'update', {...denied, analytics_storage: 'granted'})
      browser.gtag('js', new Date())
      browser.gtag('config', measurementId, {...privacy, ...context(page)})
      googleScript = win.document.createElement('script')
      googleScript.async = true
      googleScript.referrerPolicy = 'no-referrer'
      googleScript.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
      googleScript.dataset.fluffytailAnalytics = 'google'
      win.document.head.appendChild(googleScript)
    } else {
      browser.gtag?.('set', {...privacy, ...context(page)})
      browser.gtag?.('config', measurementId, {...privacy, ...context(page)})
    }
    if (!vercelLoaded && safeVercelDocument()) {
      vercelLoaded = true
      options.vercel.inject({disableAutoTrack: true, debug: false, beforeSend})
    }
    if (lastPath === page.path) return
    lastPath = page.path
    browser.gtag?.('event', 'page_view', {...context(page), send_to: measurementId})
    if (vercelLoaded) options.vercel.pageview({path: page.path, route: page.path})
  }

  function clearAnalyticsCookies() {
    const names = ['_ga', `_ga_${measurementId.slice(2)}`]
    for (const name of names) {
      for (const domain of ['', '; Domain=www.fluffytailshihtzu.com', '; Domain=.www.fluffytailshihtzu.com', '; Domain=fluffytailshihtzu.com', '; Domain=.fluffytailshihtzu.com']) {
        win.document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure${domain}`
      }
    }
  }

  function withdraw() {
    stop()
    stoppedDocument = true
    googleScript?.remove()
    clearAnalyticsCookies()
    if (loaded || vercelLoaded) win.location.reload()
  }

  function scheduleExpiry() {
    if (expiryTimer !== undefined) win.clearTimeout(expiryTimer)
    if (choice !== 'accepted') return
    try {
      const record = JSON.parse(win.localStorage.getItem(consentKey) || 'null')
      const remaining = record.at + consentLifetime - Date.now()
      if (storedChoice() !== 'accepted' || remaining <= 0) {
        choice = null
        options.onChoice(null)
        withdraw()
        return
      }
      expiryTimer = win.setTimeout(scheduleExpiry, Math.min(remaining, 2147483647))
    } catch { withdraw() }
  }

  function choose(next: AnalyticsChoice) {
    if (next !== 'accepted' && next !== 'declined') return
    stop()
    try { win.localStorage.setItem(consentKey, consentRecord(next)) } catch {
      // No persistence means no analytics; still honor a decline for this document.
      choice = next === 'declined' ? 'declined' : null
      options.onChoice(choice)
      if (loaded) withdraw()
      return
    }
    choice = next
    options.onChoice(choice)
    scheduleExpiry()
    if (next === 'declined') {
      if (loaded || vercelLoaded) withdraw()
      else clearAnalyticsCookies()
    } else sendPage()
  }

  const removeBoundary = installAnalyticsNavigationBoundary(win, {
    isStaticPublicPath: path => !!staticAnalyticsPage(path),
    stop,
    isTracking: () => active && (loaded || vercelLoaded),
  })
  const storage = (event: StorageEvent) => {
    if (event.key !== consentKey && event.key !== null) return
    const next = storedChoice()
    choice = next
    options.onChoice(next)
    scheduleExpiry()
    // A choice in another tab never silently opts this tab in.
    if (next !== 'accepted') withdraw()
  }
  const pageShow = (event: PageTransitionEvent) => {
    choice = storedChoice()
    options.onChoice(choice)
    if (event.persisted && (loaded || vercelLoaded)) {
      // History traversal can dispatch popstate after pageshow. Keep this old
      // document disabled until the requested fresh document takes over.
      stoppedDocument = true
      stop()
      win.location.reload()
      return
    }
    sendPage()
  }
  const dirtyLocation = () => {
    if (win.location.search || win.location.hash) { stoppedDocument = true; stop() }
  }
  const popState = () => {
    dirtyLocation()
    // A same-path back/forward entry does not change React's pathname. Revalidate
    // it here; a changed path stays disabled until its committed page registers.
    sendPage()
  }
  win.addEventListener('storage', storage)
  win.addEventListener('pageshow', pageShow)
  win.addEventListener('hashchange', dirtyLocation)
  win.addEventListener('popstate', popState)
  choice = storedChoice()
  options.onChoice(choice)
  scheduleExpiry()

  return {
    choose,
    setPage(next: AnalyticsPage | null) {
      stop()
      page = next && next.path === win.location.pathname ? next : null
      sendPage()
    },
    stop,
    beforeSend,
    dispose() {
      stop()
      googleScript?.remove()
      if (expiryTimer !== undefined) win.clearTimeout(expiryTimer)
      removeBoundary()
      win.removeEventListener('storage', storage)
      win.removeEventListener('pageshow', pageShow)
      win.removeEventListener('hashchange', dirtyLocation)
      win.removeEventListener('popstate', popState)
    },
  }
}
