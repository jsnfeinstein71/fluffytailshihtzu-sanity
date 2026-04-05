import {redirect, notFound} from 'next/navigation'
import {client} from '@/sanity/lib/client'

export const revalidate = 0

type DepositLink = {
  stripeCheckoutUrl?: string
  active?: boolean
}

const depositLinkQuery = `*[_type == "depositLink" && token == $token][0]{
  stripeCheckoutUrl,
  active
}`

export default async function DepositRedirectPage({
  params,
}: {
  params: Promise<{token: string}>
}) {
  const {token} = await params

  const link = await client.fetch<DepositLink | null>(
    depositLinkQuery as string,
    {token} as Record<string, string>
  )

  if (!link || !link.active || !link.stripeCheckoutUrl) {
    notFound()
  }

  redirect(link.stripeCheckoutUrl)
}
