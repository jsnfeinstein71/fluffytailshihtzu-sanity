import 'server-only'
import {dataset, projectId} from '../env'
import {getOperationalClient} from './operational-client'

export function getOperatorClient() {
  if (!process.env.SANITY_API_WRITE_TOKEN) throw new Error('Server Sanity credentials are not configured.')
  if (process.env.VERCEL_ENV === 'preview' && (dataset === 'production' || projectId === '3glz6dkx')) {
    throw new Error('Preview operations require an isolated Sanity dataset.')
  }
  return getOperationalClient()
}
