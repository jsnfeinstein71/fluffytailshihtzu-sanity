import {headers} from 'next/headers'
import {isPasskeyHost,passkeyMode} from '@/lib/passkey-config'
import Security from './Security'
import './access.css'
export const dynamic='force-dynamic'
export const metadata={title:'Staff access & recovery',robots:{index:false,follow:false},referrer:'no-referrer' as const}
export default async function Page(){const h=await headers(),host=h.get('host')||'',protocol=host.startsWith('localhost')?'http':'https',req=new Request(protocol+'://'+host+'/inbox/security');return <main className="staff-access"><section className="staff-access-card staff-access-wide"><img className="staff-access-logo" src="/brand/fluffytail-logo-color.svg" alt="FluffyTail Shih Tzu" width="80" height="80"/><h1>Staff access & recovery</h1><Security bootstrap={passkeyMode()==='transition'&&!isPasskeyHost(req)}/></section></main>}
