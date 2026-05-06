'use client'

import { useState, useCallback } from 'react'
import UploadZone from '@/components/UploadZone'
import CropEditor, { type ImageItem } from '@/components/CropEditor'
export default function Page() {
  const [images, setImages] = useState<ImageItem[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

  const handleFiles = useCallback((files: File[]) => {
    const items: ImageItem[] = files.map(file => ({
      file,
      objectUrl: URL.createObjectURL(file),
    }))
    setImages(items)
    setActiveIndex(0)
  }, [])

  const handleSaveItem = useCallback((index: number, blob: Blob) => {
    setImages(prev =>
      prev.map((item, i) => i === index ? { ...item, blob } : item)
    )
  }, [])

  const handleReset = useCallback(() => {
    setImages(prev => {
      prev.forEach(img => URL.revokeObjectURL(img.objectUrl))
      return []
    })
    setActiveIndex(0)
  }, [])

  if (images.length === 0) {
    return <UploadZone onFiles={handleFiles} />
  }

  return (
    <CropEditor
      images={images}
      activeIndex={activeIndex}
      onChangeIndex={setActiveIndex}
      onSaveItem={handleSaveItem}
      onReset={handleReset}
    />
  )
}
