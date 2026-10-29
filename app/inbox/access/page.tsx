import {notFound} from 'next/navigation'
import {isolatedStaffPreview,staffWorkspaceAvailable} from '@/lib/staff-session'
import Access from './Access'
import '../workspace/workspace.css'
export const dynamic='force-dynamic'
export const metadata={title:'Staff sign in',robots:{index:false,follow:false},referrer:'no-referrer' as const}
export default function Page(){if(!staffWorkspaceAvailable())notFound();return <main className="ops-workspace ops-payment-preview"><section className="ops-panel ops-payment-detail"><p className="ops-eyebrow">FLUFFYTAIL · STAFF ONLY</p><h1>Open your staff workspace.</h1><p>{isolatedStaffPreview()?'Test workspace: use the Preview-only username and password you set in Vercel. Production passkeys are unchanged.':'Sign in with your existing staff Inbox username and password.'}</p><Access/></section></main>}
