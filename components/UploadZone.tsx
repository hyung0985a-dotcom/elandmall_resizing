'use client'

import { useCallback, useState } from 'react'
import { Upload, ImageIcon } from 'lucide-react'

interface Props {
  onFiles: (files: File[]) => void
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function UploadZone({ onFiles }: Props) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  const process = useCallback((fileList: FileList | null) => {
    if (!fileList) return
    const valid = Array.from(fileList).filter(f => ACCEPTED_TYPES.includes(f.type))
    const invalid = fileList.length - valid.length
    if (valid.length === 0) {
      setError('JPG, PNG, WEBP 파일만 업로드 가능합니다.')
      return
    }
    if (invalid > 0) setError(`${invalid}개 파일은 지원되지 않는 형식이라 제외됐습니다.`)
    else setError('')
    onFiles(valid)
  }, [onFiles])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    process(e.dataTransfer.files)
  }, [process])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl">

        {/* Logo + Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#1A4F8A] rounded-2xl mb-5 shadow-md">
            <ImageIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            배너 이미지 리사이징 툴
          </h1>
          <p className="text-sm text-gray-500">
            이미지를 업로드하면 <span className="font-semibold text-[#1A4F8A]">1080 × 640px</span> 배너로 변환합니다
          </p>
          <p className="text-xs text-gray-400 mt-1">이랜드 온라인본부 내부 도구</p>
        </div>

        {/* Drop Zone */}
        <label
          className={`
            relative flex flex-col items-center justify-center gap-3
            w-full h-56 rounded-2xl border-2 border-dashed cursor-pointer
            transition-all duration-150 select-none
            ${dragging
              ? 'border-[#2563EB] bg-blue-50/80 scale-[1.01]'
              : 'border-gray-300 bg-white hover:border-[#2563EB] hover:bg-blue-50/20'
            }
          `}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(e) => process(e.target.files)}
          />
          <Upload className={`w-9 h-9 transition-colors ${dragging ? 'text-[#2563EB]' : 'text-gray-400'}`} />
          <div className="text-center">
            <p className={`text-base font-medium transition-colors ${dragging ? 'text-[#2563EB]' : 'text-gray-700'}`}>
              {dragging ? '여기에 놓으세요' : '파일을 드래그하거나 클릭해서 선택'}
            </p>
            <p className="text-sm text-gray-400 mt-0.5">JPG · PNG · WEBP · 다중 파일 지원</p>
          </div>
        </label>

        {error && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
            {error}
          </p>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">
          모든 처리는 브라우저 내에서만 이루어지며 서버로 전송되지 않습니다
        </p>
      </div>
    </div>
  )
}
