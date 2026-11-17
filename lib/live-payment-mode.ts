import 'server-only'
import {liveWorkspaceEnabled} from './workspace-mode'
import {configuredStripeAccountId,stripeServerSecretKey,stripeWebhookSigningSecret} from './stripe-account'

export function requireLivePaymentConfiguration(){
 configuredStripeAccountId()
 if(!liveWorkspaceEnabled()||process.env.FLUFFYTAIL_PAYMENT_TEST_WORKSPACE==='1'||! /^(sk|rk)_live_/.test(stripeServerSecretKey()||'')||!stripeWebhookSigningSecret()?.startsWith('whsec_'))throw new Error('Live payment configuration is unavailable.')
 const origin=new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://www.fluffytailshihtzu.com')
 if(origin.origin!=='https://www.fluffytailshihtzu.com'||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password)throw new Error('Open live payments on the real FluffyTail website.')
 return origin.origin
}
