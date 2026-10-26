import 'server-only'
import {createClient} from '@sanity/client'
import {apiVersion, dataset, projectId} from '../env'

export function getOperationalClient() {
  const token = process.env.SANITY_API_WRITE_TOKEN
  if (!token) throw new Error('Server Sanity credentials are not configured.')
  return createClient({projectId, dataset, apiVersion, token, useCdn: false, perspective: 'published'})
}
