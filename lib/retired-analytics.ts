export function clearRetiredAnalytics(browser: Pick<Window, 'document' | 'localStorage' | 'location'>) {
  try { browser.localStorage.removeItem('fluffytail.analytics-consent.v1') } catch { /* Storage may be blocked. */ }
  const host = browser.location.hostname
  const domains = ['', `; Domain=${host}`, ...(host.endsWith('.fluffytailshihtzu.com') ? ['; Domain=fluffytailshihtzu.com'] : [])]
  try {
    for (const cookie of browser.document.cookie.split(';')) {
      const name = cookie.split('=')[0].trim()
      if (name !== '_ga' && !name.startsWith('_ga_')) continue
      for (const domain of domains) browser.document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure${domain}`
    }
  } catch { /* Essential cookies and storage are never cleared. */ }
}
