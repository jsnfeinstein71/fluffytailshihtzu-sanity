import twilio from 'twilio'

export function getTwilio() {
  if (process.env.VERCEL_ENV === 'preview') throw new Error('Messaging is disabled in preview.')
  const {TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER} = process.env
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) throw new Error('Messaging is not configured.')
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
}
