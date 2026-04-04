import {NextRequest, NextResponse} from 'next/server'
import {createClient} from '@sanity/client'

export const runtime = 'nodejs'

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2025-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN!,
  useCdn: false,
})

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({error: 'No file uploaded'}, {status: 400})
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
  } catch (error) {
    console.error('Failed to upload image', error)
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
