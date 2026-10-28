'use client'

import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode} from 'react'
import {usePathname} from 'next/navigation'
import {inject, pageview} from '@vercel/analytics'
import {createPublicAnalyticsRuntime} from '@/lib/analytics-runtime'
import {publishedPuppyAnalyticsPage, staticAnalyticsPage, type AnalyticsChoice, type AnalyticsPage} from '@/lib/analytics-policy'
import AnalyticsPreferences from './AnalyticsPreferences'

const PuppyPageContext = createContext<(slug: string | null) => void>(() => {})

/** The server renders this marker only after getPuppy resolves a published record. */
export function PublishedPuppyAnalytics({slug}: {slug: string}) {
  const register = useContext(PuppyPageContext)
  useEffect(() => {
    register(slug)
    return () => register(null)
  }, [register, slug])
  return null
}

export default function PublicAnalytics({children, production}: {children: ReactNode; production: boolean}) {
  const pathname = usePathname()
  const [choice, setChoice] = useState<AnalyticsChoice | null>(null)
  const [ready, setReady] = useState(false)
  const [puppyPage, setPuppyPage] = useState<AnalyticsPage | null>(null)
  const runtime = useRef<ReturnType<typeof createPublicAnalyticsRuntime> | null>(null)
  const register = useCallback((slug: string | null) => {
    setPuppyPage(slug ? publishedPuppyAnalyticsPage(slug) : null)
  }, [])
  const page = useMemo(() => staticAnalyticsPage(pathname) || (puppyPage?.path === pathname ? puppyPage : null), [pathname, puppyPage])

  useEffect(() => {
    const controller = createPublicAnalyticsRuntime(window, {
      production,
      vercel: {inject, pageview},
      onChoice: next => { setChoice(next); setReady(true) },
    })
    runtime.current = controller
    return () => { controller.dispose(); runtime.current = null }
  }, [production])

  useEffect(() => {
    runtime.current?.setPage(page)
    return () => runtime.current?.stop()
  }, [page])

  const publicPresentation = !!page || pathname === '/contact' || pathname === '/puppy-inquiry'
  return <PuppyPageContext.Provider value={register}>
    {children}
    {ready && publicPresentation ? <AnalyticsPreferences choice={choice} onChoose={next => runtime.current?.choose(next)} showPrompt={!!page} /> : null}
  </PuppyPageContext.Provider>
}
