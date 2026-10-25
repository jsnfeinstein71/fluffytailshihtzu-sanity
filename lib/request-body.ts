import {InquiryError} from './inquiry'

export async function readRequestText(req: Request, limit: number) {
  if (Number(req.headers.get('content-length')) > limit) throw new InquiryError('Request is too large.', 413)
  const reader = req.body?.getReader()
  if (!reader) throw new InquiryError('Request body is required.')
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const {done, value} = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) {
        await reader.cancel()
        throw new InquiryError('Request is too large.', 413)
      }
      chunks.push(value)
    }
    try { return new TextDecoder('utf-8', {fatal: true}).decode(Buffer.concat(chunks)) }
    catch { throw new InquiryError('Invalid request body.') }
  } finally {
    reader.releaseLock()
  }
}
