import {NextResponse} from 'next/server'

export async function POST() {
  return NextResponse.json({error: 'This webhook is retired. Use the website inquiry form.'},
    {status: 410, headers: {'Cache-Control': 'no-store'}})
}
