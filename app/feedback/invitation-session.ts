import type {FeedbackStatus} from '@/lib/feedback'

const storageKey = 'fluffytail.feedback.invitation.v1'
const tokenPattern = /^[a-f0-9]{64}\.[\w-]{43}$/
export type InvitationState = FeedbackStatus['status'] | 'loading' | 'unavailable'
export type InvitationSnapshot = {token: string; revision: number}

export function createInvitationSession(options: {
  browser: Pick<Window, 'location' | 'history' | 'sessionStorage' | 'addEventListener' | 'removeEventListener'>
  fetch: typeof fetch
  onChange: () => void
  onStatus: (status: InvitationState) => void
  onDefaults: (result: FeedbackStatus) => void
}) {
  const {browser} = options
  let token = ''
  let revision = 0
  let disposed = false
  let checking: AbortController | null = null
  const snapshot = (): InvitationSnapshot => ({token, revision})
  const isCurrent = (value: InvitationSnapshot) => !disposed && value.token === token && value.revision === revision

  async function refresh() {
    if (disposed) return
    checking?.abort()
    const controller = new AbortController()
    checking = controller
    const fragment = browser.location.hash.slice(1)
    const invitationFragment = fragment && fragment !== 'site-content' ? fragment : ''
    let nextToken = token
    // Fragments never reach the server/referrer. Remove credentials before the
    // lookup; session storage allows a reload in this tab without another link.
    if (invitationFragment) {
      browser.history.replaceState(browser.history.state, '', browser.location.pathname + browser.location.search)
      nextToken = tokenPattern.test(invitationFragment) ? invitationFragment : ''
    }
    try {
      if (invitationFragment) {
        if (nextToken) browser.sessionStorage.setItem(storageKey, nextToken)
        else browser.sessionStorage.removeItem(storageKey)
      } else if (!nextToken) nextToken = browser.sessionStorage.getItem(storageKey) || ''
    } catch { /* A valid link still works if browser storage is unavailable. */ }
    if (nextToken !== token) {
      token = nextToken
      revision += 1
      options.onChange()
    }
    const request = snapshot()
    options.onStatus(token ? 'loading' : 'invalid')
    if (!token) return
    try {
      const response = await options.fetch('/api/feedback', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, cache: 'no-store',
        body: JSON.stringify({action: 'status', token: request.token}), signal: controller.signal,
      })
      if (!response.ok) throw new Error('invitation-check-failed')
      const result: FeedbackStatus = await response.json()
      if (!['ready', 'used', 'expired', 'revoked', 'invalid'].includes(result.status)) throw new Error('invalid-status')
      if (controller.signal.aborted || !isCurrent(request)) return
      options.onStatus(result.status)
      if (result.status === 'ready') options.onDefaults(result)
    } catch {
      if (!controller.signal.aborted && isCurrent(request)) options.onStatus('unavailable')
    }
  }

  const onHashChange = () => {
    if (browser.location.hash && browser.location.hash !== '#site-content') void refresh()
  }
  browser.addEventListener('hashchange', onHashChange)
  return {
    refresh, snapshot, isCurrent,
    dispose() {
      disposed = true
      checking?.abort()
      browser.removeEventListener('hashchange', onHashChange)
    },
  }
}
