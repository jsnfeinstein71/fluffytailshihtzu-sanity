import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import Workspace from './Workspace'
import {workspaceAllowed} from './model'
import './workspace.css'

export const metadata: Metadata = {
  title:'Staff workspace review',
  robots:{index:false, follow:false},
}
export const dynamic = 'force-dynamic'

export default function WorkspacePage() {
  if (!workspaceAllowed(process.env.VERCEL_ENV, process.env.NODE_ENV)) notFound()
  return <Workspace />
}
