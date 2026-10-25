import {createClient} from 'next-sanity'
import {apiVersion, dataset, projectId} from '../env'

export function getOperatorClient() {
  if (!process.env.SANITY_API_WRITE_TOKEN) throw new Error('Server Sanity credentials are not configured.')
  if (process.env.VERCEL_ENV === 'preview' && dataset === 'production') {
    throw new Error('Preview operations require an isolated Sanity dataset.')
  }
  return createClient({projectId, dataset, apiVersion, token: process.env.SANITY_API_WRITE_TOKEN, useCdn: false, perspective: 'published'})
}
