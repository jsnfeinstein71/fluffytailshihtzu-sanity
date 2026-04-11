import '../home.css'

export const metadata = {
  title: 'Terms and Conditions | FluffyTail Shih Tzu',
  description: 'Terms and Conditions for FluffyTail Shih Tzu.',
}

export default function TermsAndConditionsPage() {
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
            Terms and Conditions
          </h1>

          <p className="lead">
            Effective date: {new Date().getFullYear()}
          </p>

          <p className="lead">
            These Terms and Conditions govern use of the FluffyTail Shih Tzu website and related
            communications, including puppy inquiries, waitlist requests, and text messaging.
          </p>

          <div className="divider"></div>

          <section className="section">
            <h2>Website use</h2>
            <p className="lead">
              By using this website, you agree to use it only for lawful purposes and in a manner
              consistent with genuine interest in our puppies, litters, services, and related
              information.
            </p>
          </section>

          <div className="divider"></div>

          <section className="section">
            <h2>Puppy inquiries and availability</h2>
            <p className="lead">
              Information on this website is provided for general informational purposes. Puppy
              availability, status, timing, and placement decisions may change. Submission of an
              inquiry or waitlist request does not guarantee availability, reservation, or sale of
              any puppy.
            </p>
          </section>

          <div className="divider"></div>

          <section className="section">
  <h2>SMS program terms</h2>
  <p className="lead">
    Program name: <strong>FluffyTail Shih Tzu Customer Messaging</strong>
  </p>
  <p className="lead">
    By submitting our puppy inquiry form and selecting Text or Either as your preferred contact
    method, you agree to receive conversational and customer-care text messages from FluffyTail
    Shih Tzu regarding your puppy inquiry, puppy availability, scheduling, and related next steps.
  </p>
  <div className="qa">
    <div>
      <div className="q">Message frequency</div>
      <div className="a">Message frequency varies based on your inquiry and follow-up needs.</div>
    </div>
    <div>
      <div className="q">Message and data rates</div>
      <div className="a">Message and data rates may apply.</div>
    </div>
    <div>
      <div className="q">Opt out</div>
      <div className="a">
        Reply <strong>STOP</strong> to unsubscribe from SMS messages at any time.
      </div>
    </div>
    <div>
      <div className="q">Help</div>
      <div className="a">
        Reply <strong>HELP</strong> for help or use our contact page for support.
      </div>
    </div>
  </div>
</section>

          <div className="divider"></div>

          <section className="section">
            <h2>No guarantee of uninterrupted service</h2>
            <p className="lead">
              We make reasonable efforts to keep the website and communications available, but we do
              not guarantee uninterrupted access, error-free operation, or delivery of every text or
              email message.
            </p>
          </section>

          <div className="divider"></div>

          <section className="section">
            <h2>Third-party services</h2>
            <p className="lead">
              We may use third-party services for website hosting, forms, email notifications,
              messaging, and other operations. Your use of those services may also be subject to
              their terms and policies.
            </p>
          </section>

          <div className="divider"></div>

          <section className="section">
            <h2>Changes to these terms</h2>
            <p className="lead">
              We may update these Terms and Conditions from time to time by posting revised terms on
              this website.
            </p>
          </section>

          <div className="divider"></div>

          <section className="section">
            <h2>Contact</h2>
            <p className="lead" style={{marginBottom: 0}}>
              For questions regarding these Terms and Conditions, please contact FluffyTail Shih Tzu
              through our website contact page.
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
