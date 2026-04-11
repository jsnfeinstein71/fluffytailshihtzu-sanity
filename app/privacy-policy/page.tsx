import '../home.css'

export const metadata = {
  title: 'Privacy Policy | FluffyTail Shih Tzu',
  description: 'Privacy Policy for FluffyTail Shih Tzu.',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="wrap">
      <div className="nav" style={{marginBottom: '16px'}}>
        <a className="btn" href="/">Home</a>
        <a className="btn" href="/available-puppies">Available Puppies</a>
        <a className="btn" href="/contact">Contact</a>
      </div>

      <div className="card">
        <div className="pad">
          <h1 className="h1" style={{marginBottom: '12px'}}>
            Privacy Policy
          </h1>

          <p className="lead">
            Effective date: {new Date().getFullYear()}
          </p>

          <p className="lead">
            FluffyTail Shih Tzu respects your privacy. This Privacy Policy explains what
            information we collect, how we use it, and how we handle communications related to
            puppy inquiries, waitlist requests, and customer support.
          </p>

          <div className="divider"></div>

          <section className="section">
            <h2>Information we collect</h2>
            <p className="lead">
              We may collect information you voluntarily provide to us, including:
            </p>
            <div className="qa">
              <div>
                <div className="q">Contact information</div>
                <div className="a">
                  Name, phone number, email address, and preferred contact method.
                </div>
              </div>
              <div>
                <div className="q">Inquiry details</div>
                <div className="a">
                  Information you provide about a puppy inquiry, waitlist request, message, or
                  follow-up communication.
                </div>
              </div>
              <div>
                <div className="q">Website interaction details</div>
                <div className="a">
                  Basic technical information such as page URLs or form context when you submit an
                  inquiry through our website.
                </div>
              </div>
            </div>
          </section>

          <div className="divider"></div>

          <section className="section">
            <h2>How we use your information</h2>
            <p className="lead">We use your information to:</p>
            <div className="qa">
              <div>
                <div className="q">Respond to inquiries</div>
                <div className="a">
                  We use your information to answer questions about puppies, litter availability,
                  timing, and next steps.
                </div>
              </div>
              <div>
                <div className="q">Provide customer support</div>
                <div className="a">
                  We may contact you by email or text regarding a puppy inquiry, waitlist request,
                  or related customer service matter.
                </div>
              </div>
              <div>
                <div className="q">Maintain records</div>
                <div className="a">
                  We may keep records of inquiries and communications for follow-up, organization,
                  and service quality.
                </div>
              </div>
            </div>
          </section>

          <div className="divider"></div>

          <section className="section">
  <h2>SMS communications</h2>
  <p className="lead">
    If you submit our puppy inquiry form and select Text or Either as your preferred contact
    method, you consent to receive conversational and customer-care text messages from FluffyTail
    Shih Tzu related to your inquiry, including puppy availability, follow-up information,
    scheduling, and next steps.
  </p>
  <p className="lead">
    Message frequency varies. Message and data rates may apply. You can reply
    <strong> STOP</strong> to opt out at any time or <strong>HELP</strong> for help.
  </p>
</section>

          <div className="divider"></div>

          <section className="section">
            <h2>Sharing of information</h2>
            <p className="lead">
              We do not sell your personal information. We may use trusted service providers to help
              us operate our website, forms, email notifications, and communications. We do not
              share your personal information with third parties for their own marketing purposes.
            </p>
          </section>

          <div className="divider"></div>

          <section className="section">
  <h2>Sharing of information</h2>
  <p className="lead">
    We do not sell your personal information. We may use trusted service providers to help us
    operate our website, forms, email notifications, and communications.
  </p>
  <p className="lead">
    Mobile information will not be shared with third parties or affiliates for marketing or
    promotional purposes. Text messaging opt-in data and consent will not be shared with any
    third parties, except as necessary to provide messaging services.
  </p>
</section>

          <div className="divider"></div>

          <section className="section">
            <h2>Your choices</h2>
            <div className="qa">
              <div>
                <div className="q">Email</div>
                <div className="a">
                  You may stop email communication by replying and asking us not to contact you.
                </div>
              </div>
              <div>
                <div className="q">Text messages</div>
                <div className="a">
                  Reply <strong>STOP</strong> to opt out of SMS messages. Reply <strong>HELP</strong>{' '}
                  for help.
                </div>
              </div>
            </div>
          </section>

          <div className="divider"></div>

          <section className="section">
            <h2>Contact</h2>
            <p className="lead" style={{marginBottom: 0}}>
              For questions about this Privacy Policy, please contact FluffyTail Shih Tzu through
              our website contact page.
            </p>
          </section>
        </div>
      </div>

      <div className="footer">
        © {new Date().getFullYear()} FluffyTail Shih Tzu • In-home raised as family pets
      </div>
    </main>
  )
}
