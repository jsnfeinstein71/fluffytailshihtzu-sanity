import Link from 'next/link'
import '../../workspace.css'
export default function UnavailableTestPayment(){return <main className="ops-workspace ops-payment-preview"><section className="ops-panel ops-payment-detail"><h1>Test request unavailable</h1><p>This request may have expired or its payment context may have changed. Return to the staff workspace and review the current details before preparing a new one.</p><Link href="/inbox/workspace" className="ops-button secondary">Return to staff workspace</Link></section></main>}
