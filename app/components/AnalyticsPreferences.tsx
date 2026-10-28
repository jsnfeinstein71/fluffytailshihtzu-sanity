'use client'

import {useEffect, useId, useRef, useState} from 'react'
import '../analytics-consent.css'

type AnalyticsChoice = 'accepted' | 'declined'

type AnalyticsPreferencesProps = {
  choice: AnalyticsChoice | null
  onChoose: (choice: AnalyticsChoice) => void
  showPrompt: boolean
}

export default function AnalyticsPreferences({choice, onChoose, showPrompt}: AnalyticsPreferencesProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmation, setConfirmation] = useState<AnalyticsChoice | null>(null)
  const panelId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const settingsRef = useRef<HTMLButtonElement>(null)
  const visible = settingsOpen || (choice === null && showPrompt)
  const currentChoice = choice === 'accepted' ? 'accepted' : choice === 'declined' ? 'declined' : 'not chosen'

  useEffect(() => {
    // Opening settings is an explicit action; the first prompt never takes focus.
    if (settingsOpen) headingRef.current?.focus()
  }, [settingsOpen])

  function choose(nextChoice: AnalyticsChoice) {
    onChoose(nextChoice)
    setConfirmation(nextChoice)
    setSettingsOpen(false)
    settingsRef.current?.focus()
  }

  function closeSettings() {
    setSettingsOpen(false)
    settingsRef.current?.focus()
  }

  return <div className="analytics-preferences">
    <section
      id={panelId}
      className="analytics-preferences-panel"
      role="region"
      aria-label="Analytics choices"
      hidden={!visible}
      onKeyDown={event => {
        if (event.key === 'Escape' && choice !== null) closeSettings()
      }}
    >
      <div className="analytics-preferences-heading">
        <h2 ref={headingRef} tabIndex={-1}>Your analytics choice</h2>
        {choice !== null ? <button type="button" className="analytics-preferences-close" onClick={closeSettings}>Close</button> : null}
      </div>
      <p>Optional Google Analytics and Vercel Analytics help us understand visits to our public pages. Google uses analytics cookies and basic device and session data.</p>
      <p>We exclude forms, payments and staff pages from analytics. Your choice will not affect inquiries. <a href="/privacy-policy">Read our privacy policy</a>.</p>
      {choice !== null ? <p className="analytics-preferences-current">Current choice: analytics {currentChoice}.{choice === 'accepted' ? ' Declining will reload this page to stop analytics.' : ''}</p> : null}
      <div className="analytics-preferences-actions">
        <button type="button" onClick={() => choose('accepted')}>Accept analytics</button>
        <button type="button" onClick={() => choose('declined')}>Decline analytics</button>
      </div>
    </section>
    <div className="analytics-preferences-footer">
      <button
        ref={settingsRef}
        type="button"
        className="analytics-preferences-settings"
        aria-controls={panelId}
        aria-expanded={visible}
        aria-label={`Analytics settings. Current choice: ${currentChoice}.`}
        onClick={() => {
          setConfirmation(null)
          setSettingsOpen(true)
        }}
      >Analytics settings</button>
      <span className="analytics-preferences-status" role="status" aria-live="polite" aria-atomic="true">
        {confirmation !== null && confirmation === choice && !visible ? `Analytics ${confirmation}. You can change this anytime.` : ''}
      </span>
    </div>
  </div>
}
