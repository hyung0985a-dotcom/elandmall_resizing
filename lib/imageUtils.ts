import { type PixelCrop } from 'react-image-crop'

export interface SizePreset {
  label: string
  width: number
  height: number
}

export const SIZE_PRESETS: SizePreset[] = [
  { label: '1080 × 640', width: 1080, height: 640 },
  { label: '640 × 362',  width: 640,  height: 362 },
  { label: '353 × 250',  width: 353,  height: 250 },
  { label: '406 × 406',  width: 406,  height: 406 },
  { label: '640 × 142',  width: 640,  height: 142 },
]

export async function cropImage(
  image: HTMLImageElement,
  crop: PixelCrop,
  format: 'jpeg' | 'png' = 'jpeg',
  quality = 0.9,
  outWidth = 1080,
  outHeight = 640
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = outWidth
  canvas.height = outHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2d context unavailable')

  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0, 0,
    outWidth, outHeight
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Blob 생성 실패')),
      `image/${format}`,
      format === 'jpeg' ? quality : undefined
    )
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function getFilename(
  originalName: string,
  format: 'jpeg' | 'png',
  preset: SizePreset
) {
  const date = new Date()
  const d = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const ext = format === 'jpeg' ? 'jpg' : 'png'
  const base = originalName.replace(/\.[^/.]+$/, '')
  const size = `${preset.width}x${preset.height}`
  return `banner_${size}_${d}_${base}.${ext}`
}

export async function downloadZip(items: { blob: Blob; filename: string }[]) {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  items.forEach(({ blob, filename }) => zip.file(filename, blob))
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const date = new Date()
  const d = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  downloadBlob(zipBlob, `banners_${d}.zip`)
}
