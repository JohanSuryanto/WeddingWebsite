import {
  fitWithin,
  MAX_UPLOAD_BYTES,
  PRESETS,
  validateUpload,
} from '../../src/admin/media/compressImage'

describe('fitWithin', () => {
  it('scales landscape photos to the longest side', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 })
  })

  it('scales portrait photos to the longest side', () => {
    expect(fitWithin(3000, 4000, 800)).toEqual({ width: 600, height: 800 })
  })

  it('never enlarges small photos', () => {
    expect(fitWithin(500, 300, 1600)).toEqual({ width: 500, height: 300 })
  })

  it('handles squares', () => {
    expect(fitWithin(2000, 2000, PRESETS.logo)).toEqual({ width: 400, height: 400 })
  })
})

describe('validateUpload', () => {
  it('accepts images and audio up to exactly 10 MB', () => {
    expect(validateUpload({ type: 'image/jpeg', size: MAX_UPLOAD_BYTES }, 'image')).toBeNull()
    expect(validateUpload({ type: 'audio/mpeg', size: 1000 }, 'audio')).toBeNull()
  })

  it('rejects files over 10 MB', () => {
    expect(validateUpload({ type: 'image/jpeg', size: MAX_UPLOAD_BYTES + 1 }, 'image')).toBe(
      'Ukuran maksimal 10 MB',
    )
  })

  it('rejects the wrong kind of file', () => {
    expect(validateUpload({ type: 'text/plain', size: 10 }, 'image')).toBe(
      'File harus berupa gambar',
    )
    expect(validateUpload({ type: 'image/png', size: 10 }, 'audio')).toBe('File harus berupa audio')
  })
})
