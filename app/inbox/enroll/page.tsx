import Enrollment from './Enrollment'
import '../security/access.css'
export const dynamic='force-dynamic'
export const metadata={title:'Create your staff passkey',robots:{index:false,follow:false},referrer:'no-referrer' as const}
export default function Page(){return <main className="staff-access"><section className="staff-access-card"><img className="staff-access-logo" src="/brand/fluffytail-logo-color.svg" alt="FluffyTail Shih Tzu" width="96" height="96"/><p className="staff-eyebrow">PRIVATE OWNER ENROLLMENT</p><h1>Create my passkey</h1><p>This creates a new passkey on your own device. It does not sign in with someone else’s passkey.</p><Enrollment/></section></main>}
