'use client'

import {useEffect, useState} from 'react'
import '../home.css'

type WaitlistModalProps = {
  waitlistUrl?: string
  buttonLabel?: string
  className?: string
}

export default function WaitlistModal({
  waitlistUrl,
  buttonLabel = 'Join the Waitlist',
  className = '',
}: WaitlistModalProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('keydown', onKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open])

  if (!waitlistUrl) {
    return null
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
      >
        {buttonLabel}
      </button>

      <div className={`${'modal'} ${open ? 'modalShow' : ''}`} aria-hidden={!open}>
        <div className="backdrop" onClick={() => setOpen(false)}></div>

        <div
          className="sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Join the Waitlist"
        >
          <div className="sheetHead">
            <div>
              <p className="sheetTitle">Join the Waitlist</p>
              <p className="sheetSub">
                We’ll only email when puppies are expected or available.
              </p>
            </div>

            <button
              type="button"
              className="closeBtn"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="sheetBody">
            <iframe
              src={waitlistUrl}
              title="FluffyTail Shih Tzu Waitlist"
            />
          </div>
        </div>
      </div>
    </>
  )
}

