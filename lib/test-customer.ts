import {createHash} from 'node:crypto'
import {paymentTestWorkspaceEnabled,requirePaymentTestConfiguration} from './payment-test-mode'

// Bind activation to the one owner-approved contact pair without publishing it.
export function testCustomerContacts(){
 if(!paymentTestWorkspaceEnabled()||process.env.FLUFFYTAIL_TEST_CUSTOMER_COMMUNICATIONS!=='1')return null
 requirePaymentTestConfiguration()
 const email=(process.env.FLUFFYTAIL_TEST_CUSTOMER_EMAIL||'').trim().toLowerCase(),phone=process.env.FLUFFYTAIL_TEST_CUSTOMER_PHONE||''
 if(createHash('sha256').update(email+'|'+phone).digest('hex')!=='9f02d2acb5c79a37931d8ce787cf65ed95f9a99aeac29b63ef34f4f243483860')throw new Error('The approved test contact configuration is incomplete. Sending is disabled.')
 return {email,phone}
}
export function approvedTestCustomer(profile:{email?:string;phone?:string;paymentTestScenario?:string}){
 const contacts=testCustomerContacts()
 return !!contacts&&profile.paymentTestScenario==='customer-20261027'&&profile.email?.toLowerCase()===contacts.email&&profile.phone===contacts.phone
}
export {testSmsConsentText} from './test-customer-copy'
