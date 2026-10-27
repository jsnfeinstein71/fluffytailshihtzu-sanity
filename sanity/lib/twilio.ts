import {testCustomerContacts} from '@/lib/test-customer'
import twilio from 'twilio'

export function getTwilio() {
  if (process.env.VERCEL_ENV === 'preview') throw new Error('Messaging is disabled in preview.')
  const {TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER} = process.env
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) throw new Error('Messaging is not configured.')
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
}

// Separate activation and credentials; the ordinary Preview adapter stays off.
export function getTestCustomerTwilio(){
 if(!testCustomerContacts()||process.env.FLUFFYTAIL_TEST_SMS_ENABLED!=='1')throw new Error('Approved test messaging is disabled.')
 const sid=process.env.FLUFFYTAIL_TEST_TWILIO_ACCOUNT_SID,token=process.env.FLUFFYTAIL_TEST_TWILIO_AUTH_TOKEN,from=process.env.FLUFFYTAIL_TEST_TWILIO_FROM_NUMBER
 if(!sid||!token||!from)throw new Error('Approved test messaging is not configured.')
 return twilio(sid,token)
}
