import {NextRequest, NextResponse} from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const formData = await req.formData()

  const payload = {
    messageSid: String(formData.get('MessageSid') || ''),
    from: String(formData.get('From') || ''),
    to: String(formData.get('To') || ''),
    body: String(formData.get('Body') || ''),
    accountSid: String(formData.get('AccountSid') || ''),
    numMedia: String(formData.get('NumMedia') || '0'),
    receivedAt: new Date().toISOString(),
  }

  console.log('FluffyTail inbound SMS:', payload)

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Thanks for contacting FluffyTail Shih Tzu. We received your message and will reply as soon as we can. Reply STOP to opt out.</Message>
</Response>`

  return new NextResponse(twiml, {
    status: 200,
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
