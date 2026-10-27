import {syntheticWorkspaceEnabled} from './workspace-mode'

export function paymentTestWorkspaceEnabled(){return syntheticWorkspaceEnabled()&&process.env.FLUFFYTAIL_PAYMENT_TEST_WORKSPACE==='1'}
export function requirePaymentTestConfiguration(){
 if(!paymentTestWorkspaceEnabled()||process.env.FLUFFYTAIL_STRIPE_TEST_ENABLED!=='1'||!/^(sk|rk|rkcs)_test_/.test(process.env.FLUFFYTAIL_STRIPE_TEST_SECRET_KEY||'')||!process.env.FLUFFYTAIL_STRIPE_TEST_WEBHOOK_SECRET?.startsWith('whsec_'))throw new Error('The isolated Stripe test configuration is incomplete. Payments are disabled; no live configuration is used.')
 const origin=new URL(process.env.FLUFFYTAIL_PAYMENT_TEST_ORIGIN||'')
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('The payment test entry address is invalid.')
 return origin.origin
}
