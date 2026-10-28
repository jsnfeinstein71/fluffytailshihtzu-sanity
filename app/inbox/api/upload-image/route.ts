import {NextRequest, NextResponse} from 'next/server'
import {getOperatorClient} from '@/sanity/lib/operator-client'
import {requireOperator} from '@/lib/operator-auth'
import {operationalWriteFreeze} from '@/sanity/lib/write-freeze'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const denied = await requireOperator(req)
  if (denied) return denied
  const frozen = operationalWriteFreeze()
  if (frozen) return frozen
  try {
    const sanity = getOperatorClient()
    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({error: 'No file uploaded'}, {status: 400})
    }

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      return NextResponse.json({error: 'Use a JPEG, PNG, WebP, or GIF image up to 10 MB.'}, {status: 400})
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const asset = await sanity.assets.upload('image', buffer, {
      filename: file.name || `upload-${Date.now()}.jpg`,
      contentType: file.type || 'image/jpeg',
    })

    const url = getSanityImageUrl(asset._id)

    return NextResponse.json({
      ok: true,
      assetId: asset._id,
      url,
    })
  } catch {
    console.error('Failed to upload image')
    return NextResponse.json({error: 'Failed to upload image'}, {status: 500})
  }
}

function getSanityImageUrl(assetId: string) {
  const match = assetId.match(/^image-([a-f0-9]+)-(\d+x\d+)-([a-z0-9]+)$/i)

  if (!match) {
    throw new Error(`Unexpected Sanity image asset id format: ${assetId}`)
  }

  const [, fileId, dimensions, extension] = match

  return `https://cdn.sanity.io/images/${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}/${process.env.NEXT_PUBLIC_SANITY_DATASET}/${fileId}-${dimensions}.${extension}`
}
