import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import Workspace from './Workspace'
import {paymentTestWorkspaceEnabled} from '@/lib/payment-test-mode'
import {workspaceAllowed} from './model'
import {liveWorkspaceEnabled,syntheticWorkspaceEnabled} from '@/lib/workspace-mode'
import './workspace.css'

export const metadata: Metadata = {
  title:'Staff workspace',
  robots:{index:false, follow:false},
}
export const dynamic = 'force-dynamic'

export default function WorkspacePage() {
  const live=liveWorkspaceEnabled()
  if (!live&&!workspaceAllowed(process.env.VERCEL_ENV, process.env.NODE_ENV)) notFound()
  return <Workspace previewPolling={syntheticWorkspaceEnabled()} live={live} paymentTesting={paymentTestWorkspaceEnabled()}/>
}
