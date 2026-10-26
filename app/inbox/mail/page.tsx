import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import LocalMailbox from './LocalMailbox'
import '../workspace/workspace.css'

export const dynamic='force-dynamic'
export const metadata:Metadata={title:'Jeanne’s private email',robots:{index:false,follow:false}}
export default function LocalMailboxPage(){
  // Only the loopback companion sets this flag. No hosted mailbox endpoint exists.
  if(process.env.VERCEL||process.env.FLUFFYTAIL_LOCAL_MAIL_UI!=='1')notFound()
  return <LocalMailbox/>
}
