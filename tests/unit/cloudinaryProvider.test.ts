// @vitest-environment node
import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({
  config: vi.fn(),
  api_sign_request: vi.fn((params: Record<string, unknown>, secret: string) => {
    const base = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&')
    return createHash('sha1').update(base + secret).digest('hex')
  }),
  url: vi.fn((id: string, o: { resource_type: string }) => `https://res.cloudinary.com/demo/${o.resource_type}/upload/${id}`),
  upload: vi.fn(async (_src: string, o: { public_id: string }) => ({
    bytes: 5,
    secure_url: `https://res.cloudinary.com/demo/image/upload/v1/${o.public_id}`,
  })),
  destroy: vi.fn(async () => ({ result: 'ok' })),
  delete_resources_by_prefix: vi.fn(async () => ({})),
  usage: vi.fn(async () => ({ credits: { usage: 4.2, limit: 25 } })),
}))

vi.mock('cloudinary', () => ({
  v2: {
    config: sdk.config,
    utils: { api_sign_request: sdk.api_sign_request },
    url: sdk.url,
    uploader: { upload: sdk.upload, destroy: sdk.destroy },
    api: { delete_resources_by_prefix: sdk.delete_resources_by_prefix, usage: sdk.usage },
  },
}))

const { CloudinaryProvider } = await import('../../server/media/cloudinary')
const { UploadVerificationError } = await import('../../server/media/provider')

const SECRET = 'rahasia-api'
const provider = new CloudinaryProvider({
  CLOUDINARY_CLOUD_NAME: 'demo',
  CLOUDINARY_API_KEY: 'key123',
  CLOUDINARY_API_SECRET: SECRET,
})
const KEY = 'wedding/prod/c1/m1'

const sign = (publicId: string, version: number | string) =>
  createHash('sha1').update(`public_id=${publicId}&version=${version}${SECRET}`).digest('hex')

beforeEach(() => vi.clearAllMocks())

describe('CloudinaryProvider', () => {
  it('signs upload tickets for images and audio', () => {
    const img = provider.createUploadTicket(KEY, 'image')
    expect(img.url).toBe('https://api.cloudinary.com/v1_1/demo/image/upload')
    expect(img.fields).toMatchObject({ api_key: 'key123', public_id: KEY, overwrite: 'false' })
    expect(sdk.api_sign_request).toHaveBeenCalledWith(
      { public_id: KEY, timestamp: Number(img.fields.timestamp), overwrite: 'false' },
      SECRET,
    )
    expect(img.fields.signature).toMatch(/^[0-9a-f]{40}$/)
    expect(img.fileField).toBe('file')
    expect(provider.createUploadTicket(KEY, 'audio').url).toBe('https://api.cloudinary.com/v1_1/demo/video/upload')
  })

  it('accepts a genuinely signed upload response', async () => {
    const result = {
      public_id: KEY,
      version: 1712345678,
      signature: sign(KEY, 1712345678),
      bytes: 1234,
      secure_url: 'https://res.cloudinary.com/demo/image/upload/v1712345678/wedding/prod/c1/m1.webp',
      width: 800,
      height: 600,
    }
    await expect(provider.verifyUpload(KEY, result)).resolves.toEqual({
      bytes: 1234,
      url: result.secure_url,
      width: 800,
      height: 600,
    })
  })

  it('rejects wrong signatures, other files and malformed results', async () => {
    const good = { public_id: KEY, version: 1, signature: sign(KEY, 1), bytes: 1, secure_url: 'https://x' }
    for (const bad of [
      { ...good, signature: sign(KEY, 2) },
      { ...good, public_id: 'wedding/prod/c1/other', signature: sign('wedding/prod/c1/other', 1) },
      { ...good, bytes: 'many' },
      null,
    ]) {
      await expect(provider.verifyUpload(KEY, bad)).rejects.toBeInstanceOf(UploadVerificationError)
    }
  })

  it('deletes single files with the right resource type and folders for both types', async () => {
    await provider.remove(KEY, 'audio')
    expect(sdk.destroy).toHaveBeenCalledWith(KEY, { resource_type: 'video', invalidate: true })
    await provider.removePrefix('wedding/prod/c1/')
    expect(sdk.delete_resources_by_prefix).toHaveBeenCalledWith('wedding/prod/c1/', { resource_type: 'image' })
    expect(sdk.delete_resources_by_prefix).toHaveBeenCalledWith('wedding/prod/c1/', { resource_type: 'video' })
  })

  it('copies by uploading from the source URL, and reports credits', async () => {
    await provider.copy(KEY, 'wedding/prod/c2/m9', 'image')
    expect(sdk.upload).toHaveBeenCalledWith('https://res.cloudinary.com/demo/image/upload/wedding/prod/c1/m1', {
      public_id: 'wedding/prod/c2/m9',
      resource_type: 'image',
      overwrite: false,
    })
    await expect(provider.usage()).resolves.toEqual({ used: 4.2, limit: 25, unit: 'credits' })
  })
})
