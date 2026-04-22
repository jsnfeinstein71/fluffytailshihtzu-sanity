import '../home.css'
import Link from 'next/link'

export const metadata = {
  title: 'Puppy Inquiry | FluffyTail Shih Tzu',
  description: 'Submit a puppy inquiry to FluffyTail Shih Tzu.',
}

const tallyInquiryEmbedUrl = 'https://tally.so/embed/1Av6Dl?alignLeft=1&hideTitle=1'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function PuppyInquiryPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const iframeUrl = buildTallyEmbedUrl(params)

  return (
    <main className="wrap">
      <div className="nav" style={{marginBottom: '16px'}}>
        <Link className="btn" href="/">Home</Link>
        <Link className="btn" href="/available-puppies">Available Puppies</Link>
        <Link className="btn" href="/contact">Contact</Link>
      </div>

      <div className="topbar">
        <div className="pill">
          <span className="dot"></span>
          Puppy inquiry
        </div>
      </div>

      <h1 className="h1">FluffyTail Shih Tzu Puppy Inquiry</h1>

      <p className="lead">
        Use this form to ask about a FluffyTail Shih Tzu puppy. If you provide a phone number and
        choose to receive text messages, we will use it only to follow up about your puppy inquiry,
        availability, scheduling, and next steps.
      </p>

      <div className="card section" style={{marginTop: '18px'}}>
        <div className="pad">
          <h2 style={{marginTop: 0}}>SMS consent</h2>
          <p className="lead">
            By checking the SMS consent box and submitting this puppy inquiry form, you agree to
            receive conversational and customer-care SMS messages from FluffyTail Shih Tzu at the
            phone number provided about your puppy inquiry, puppy availability, scheduling, and next
            steps. Message frequency varies. Message and data rates may apply. Reply STOP to opt
            out and HELP for help. Consent is not a condition of purchase. See our{' '}
            <Link href="/privacy-policy">Privacy Policy</Link> and{' '}
            <Link href="/terms-and-conditions">Terms and Conditions</Link>.
          </p>

          <div className="divider"></div>

          <iframe
            src={iframeUrl}
            title="FluffyTail Shih Tzu Puppy Inquiry"
            style={{
              width: '100%',
              height: '900px',
              border: '0',
              borderRadius: '14px',
              background: '#fff',
            }}
          />
        </div>
      </div>

      <div className="footer">
        &copy; {new Date().getFullYear()} FluffyTail Shih Tzu - In-home raised as family pets
      </div>
    </main>
  )
}

function buildTallyEmbedUrl(params: Record<string, string | string[] | undefined>) {
  const url = new URL(tallyInquiryEmbedUrl)

  for (const key of ['puppy', 'litter', 'puppyPageUrl', 'message']) {
    const value = params[key]
    const textValue = Array.isArray(value) ? value[0] : value

    if (textValue) {
      url.searchParams.set(key, textValue)
    }
  }

  return url.toString()
}
