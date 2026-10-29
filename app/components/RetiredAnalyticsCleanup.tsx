'use client'

import {useEffect} from 'react'
import {clearRetiredAnalytics} from '@/lib/retired-analytics'

/** Remove obsolete optional storage without loading a provider or showing controls. */
export default function RetiredAnalyticsCleanup() {
  useEffect(() => { clearRetiredAnalytics(window) }, [])
  return null
}
