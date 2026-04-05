'use client'

import {useState} from 'react'

export default function TestStripePage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function startCheckout() {
    try {
      setLoading(true)
      setError('')

      const res = await fetch('/api/stripe/create-deposit-session', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          puppyName: 'Boy 3',
          puppySlug: 'boy-3',
          litterTitle: 'March 23, 2026 Litter',
          customerName: 'Test Buyer',
          customerEmail: 'test@example.com',
          customerPhone: '+12515551212',
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <main style={{maxWidth: '720px', margin: '0 auto', padding: '40px 16px'}}>
      <h1 style={{fontSize: '40px', marginBottom: '12px'}}>Stripe deposit test</h1>
      <p style={{fontSize: '18px', color: '#5a6472', marginBottom: '20px'}}>
        This creates a test $300 deposit checkout session for Boy 3.
      </p>

      <button
        onClick={startCheckout}
        disabled={loading}
        style={{
          padding: '12px 18px',
          borderRadius: '999px',
          background: '#1f6fff',
          color: '#fff',
          border: 'none',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        {loading ? 'Opening checkout...' : 'Test $300 Deposit'}
      </button>

      {error ? (
        <p style={{marginTop: '16px', color: '#b42318', fontWeight: 600}}>
          {error}
        </p>
      ) : null}
    </main>
  )
}
