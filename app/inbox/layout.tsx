import {headers} from 'next/headers'
import {redirect} from 'next/navigation'
import {adminOrigin,isPasskeyHost,passkeyMode,safeStaffReturn} from '@/lib/passkey-config'
import {requireOperator} from '@/lib/operator-auth'
import {getStaffIdentity} from '@/sanity/lib/staff-auth'
export const dynamic='force-dynamic'
export default async function StaffLayout({children}:{children:React.ReactNode}){
  const h=await headers(),path=h.get('x-fluffytail-staff-path')||'',origin=h.get('x-fluffytail-staff-origin')||''
  // Proxy overwrites these routing hints. They convey no identity: authorization is
  // verified again here and independently in each API, before loading private data.
  if(!path||!origin)redirect(adminOrigin+'/inbox/unlock')
  const req=new Request(origin+path,{headers:h}),host=isPasskeyHost(req)
  if(path==='/inbox/unlock'&&host)return children
  if(path==='/inbox/access'&&passkeyMode()!=='cutover'&&!host)return children
  const allowed=host&&path==='/inbox/security'?!!await getStaffIdentity(req,{recovery:true}):!(await requireOperator(req))
  if(!allowed)redirect((host?origin:adminOrigin)+'/inbox/unlock?return='+encodeURIComponent(safeStaffReturn(path)))
  return children
}
