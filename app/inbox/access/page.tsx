import {notFound} from 'next/navigation'
import {isolatedStaffPreview} from '@/lib/staff-session'
import Access from './Access'
import '../workspace/workspace.css'
export const dynamic='force-dynamic'
export const metadata={title:'Staff Preview access',robots:{index:false,follow:false},referrer:'no-referrer' as const}
export default function Page(){if(!isolatedStaffPreview())notFound();return <main className="ops-workspace ops-payment-preview"><section className="ops-panel ops-payment-detail"><p className="ops-eyebrow">FLUFFYTAIL · STAFF ONLY</p><h1>Open your staff workspace.</h1><p>This private owner link is for the isolated Preview. Customer sending and live payments remain disabled.</p><Access/></section></main>}
