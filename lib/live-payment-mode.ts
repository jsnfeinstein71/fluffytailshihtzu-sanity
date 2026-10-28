import 'server-only'
import {liveWorkspaceEnabled} from './workspace-mode'

export function requireLivePaymentConfiguration(){
 if(!liveWorkspaceEnabled()||process.env.FLUFFYTAIL_PAYMENT_TEST_WORKSPACE==='1'||! /^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY||'')||!process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'))throw new Error('Live payment configuration is unavailable.')
 const origin=new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://www.fluffytailshihtzu.com')
 if(origin.origin!=='https://www.fluffytailshihtzu.com'||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password)throw new Error('Open live payments on the real FluffyTail website.')
 return origin.origin
}
