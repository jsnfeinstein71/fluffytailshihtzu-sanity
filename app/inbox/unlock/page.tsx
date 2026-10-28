import Unlock from './Unlock'
import '../security/access.css'
export const dynamic='force-dynamic'
export const metadata={title:'Unlock workspace',robots:{index:false,follow:false},referrer:'no-referrer' as const}
export default function Page(){return <main className="staff-access"><section className="staff-access-card"><img className="staff-access-logo" src="/brand/fluffytail-logo-color.svg" alt="FluffyTail Shih Tzu" width="96" height="96"/><p className="staff-eyebrow">PRIVATE · JEANNE & JASON</p><h1>Unlock workspace</h1><p>Use your passkey to open FluffyTail.</p><Unlock/></section></main>}
