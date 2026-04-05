export default function PaymentSuccessPage() {
  return (
    <main style={{maxWidth: '720px', margin: '0 auto', padding: '40px 16px'}}>
      <h1 style={{fontSize: '40px', marginBottom: '12px'}}>Deposit received</h1>
      <p style={{fontSize: '18px', color: '#5a6472', marginBottom: '20px'}}>
        Thank you. Your deposit was submitted successfully.
      </p>
      <a
        href="/available-puppies"
        style={{
          display: 'inline-block',
          padding: '12px 18px',
          borderRadius: '999px',
          background: '#1f6fff',
          color: '#fff',
          textDecoration: 'none',
          fontWeight: 700,
        }}
      >
        Back to Available Puppies
      </a>
    </main>
  )
}
