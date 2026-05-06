'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Download, RotateCcw, Archive, CheckCircle2, Clock, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { downloadBlob, getFilename, downloadZip, SIZE_PRESETS, type SizePreset } from '@/lib/imageUtils'

export interface ImageItem {
  file: File
  objectUrl: string
  blob?: Blob
}

interface ImgTransform {
  x: number  // 출력 캔버스 기준 left (px)
  y: number  // 출력 캔버스 기준 top (px)
  w: number  // 출력 캔버스 기준 너비 (px)
  h: number  // 출력 캔버스 기준 높이 (px)
}

/** 이미지를 캔버스에 커버(꽉 채우기) 방식으로 배치 */
function coverFit(natW: number, natH: number, canW: number, canH: number): ImgTransform {
  const scale = Math.max(canW / natW, canH / natH)
  const w = natW * scale
  const h = natH * scale
  return { x: (canW - w) / 2, y: (canH - h) / 2, w, h }
}

interface Props {
  images: ImageItem[]
  activeIndex: number
  onChangeIndex: (i: number) => void
  onSaveItem: (index: number, blob: Blob) => void
  onReset: () => void
}

export default function CropEditor({ images, activeIndex, onChangeIndex, onSaveItem, onReset }: Props) {
  const [format, setFormat] = useState<'jpeg' | 'png'>('jpeg')
  const [preset, setPreset] = useState<SizePreset>(SIZE_PRESETS[0])
  const [downloading, setDownloading] = useState(false)
  const [zipping, setZipping] = useState(false)

  const [transform, setTransform] = useState<ImgTransform>({ x: 0, y: 0, w: 0, h: 0 })
  const [isDragging, setIsDragging] = useState(false)

  const dragLast = useRef({ x: 0, y: 0 })
  const naturalSizeRef = useRef({ w: 0, h: 0 })
  const presetRef = useRef(preset)
  const canvasAreaRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const active = images[activeIndex]
  const isBatch = images.length > 1
  const doneCount = images.filter(img => img.blob).length

  useEffect(() => { presetRef.current = preset }, [preset])

  /** 현재 naturalSize + preset 기준으로 커버핏 적용 */
  const applyFit = useCallback(() => {
    const { w, h } = naturalSizeRef.current
    const p = presetRef.current
    if (w > 0) setTransform(coverFit(w, h, p.width, p.height))
  }, [])

  // 이미지 or 프리셋 변경 시 자동 맞춤
  useEffect(() => {
    applyFit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, preset])

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget
    naturalSizeRef.current = { w: naturalWidth, h: naturalHeight }
    applyFit()
  }, [applyFit])

  /** 디스플레이 px → 출력 px 변환 배율 */
  const getScaleFactor = useCallback(() => {
    if (!canvasAreaRef.current) return 1
    const { width } = canvasAreaRef.current.getBoundingClientRect()
    return presetRef.current.width / width
  }, [])

  // ── 드래그 ──────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragLast.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    const sf = getScaleFactor()
    const dx = (e.clientX - dragLast.current.x) * sf
    const dy = (e.clientY - dragLast.current.y) * sf
    dragLast.current = { x: e.clientX, y: e.clientY }
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
  }, [isDragging, getScaleFactor])

  const handleMouseUp = useCallback(() => setIsDragging(false), [])

  // ── 휠 줌 (커서 기준) ────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (!canvasAreaRef.current) return
    const rect = canvasAreaRef.current.getBoundingClientRect()
    const sf = presetRef.current.width / rect.width
    const mx = (e.clientX - rect.left) * sf
    const my = (e.clientY - rect.top) * sf
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    setTransform(prev => ({
      x: mx - (mx - prev.x) * factor,
      y: my - (my - prev.y) * factor,
      w: prev.w * factor,
      h: prev.h * factor,
    }))
  }, [])

  // ── 버튼 줌 (캔버스 중심 기준) ──────────────────────
  const zoomBy = useCallback((factor: number) => {
    const p = presetRef.current
    const cx = p.width / 2
    const cy = p.height / 2
    setTransform(prev => ({
      x: cx - (cx - prev.x) * factor,
      y: cy - (cy - prev.y) * factor,
      w: prev.w * factor,
      h: prev.h * factor,
    }))
  }, [])

  // ── 내보내기 ────────────────────────────────────────
  const exportImage = async (): Promise<Blob> => {
    const img = imgRef.current!
    const canvas = document.createElement('canvas')
    canvas.width = preset.width
    canvas.height = preset.height
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, preset.width, preset.height)
    ctx.drawImage(img, transform.x, transform.y, transform.w, transform.h)
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        b => b ? resolve(b) : reject(new Error('Blob 생성 실패')),
        `image/${format}`,
        format === 'jpeg' ? 0.9 : undefined
      )
    })
  }

  const handleDownload = async () => {
    if (transform.w === 0 || !imgRef.current) return
    setDownloading(true)
    try {
      const blob = await exportImage()
      onSaveItem(activeIndex, blob)
      downloadBlob(blob, getFilename(active.file.name, format, preset))
    } finally {
      setDownloading(false)
    }
  }

  const handleZip = async () => {
    setZipping(true)
    try {
      const items = images
        .filter(img => img.blob)
        .map(img => ({ blob: img.blob!, filename: getFilename(img.file.name, format, preset) }))
      await downloadZip(items)
    } finally {
      setZipping(false)
    }
  }

  /** 출력 좌표 → CSS % */
  const pct = (val: number, total: number) => `${(val / total) * 100}%`

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">

      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-[#1A4F8A] rounded-md shrink-0" />
          <span className="font-semibold text-[#1A4F8A] text-sm">이랜드몰 배너 리사이징 툴</span>
          {isBatch && (
            <>
              <span className="text-gray-300 text-xs">|</span>
              <span className="text-xs text-gray-400 truncate max-w-xs">
                {activeIndex + 1} / {images.length} — {active.file.name}
              </span>
            </>
          )}
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          새로 시작
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">

        {/* 배치 사이드바 */}
        {isBatch && (
          <aside className="w-48 bg-white border-r border-gray-200 flex flex-col shrink-0">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">이미지 목록</p>
              <p className="text-xs text-gray-400 mt-0.5">{doneCount}/{images.length} 완료</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => onChangeIndex(i)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                    i === activeIndex ? 'bg-blue-50 ring-1 ring-[#2563EB]/30' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-11 h-7 bg-gray-100 rounded overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.objectUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate leading-tight">{img.file.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {img.blob
                        ? <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                        : <Clock className="w-3 h-3 text-gray-300 shrink-0" />
                      }
                      <span className={`text-xs ${img.blob ? 'text-green-500' : 'text-gray-400'}`}>
                        {img.blob ? '완료' : '대기'}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* 메인 영역 */}
        <main className="flex-1 flex gap-4 p-4 overflow-auto min-w-0">

          {/* 캔버스 편집 영역 */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 flex flex-col min-w-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 self-start">
              캔버스 편집{' '}
              <span className="font-normal text-gray-300 normal-case">
                · 드래그로 위치 조절&nbsp;&nbsp;·&nbsp;&nbsp;스크롤로 확대/축소
              </span>
            </p>

            <div className="flex-1 flex items-center justify-center">
              <div
                ref={canvasAreaRef}
                className={`relative overflow-hidden rounded-lg shadow-inner select-none ${
                  isDragging ? 'cursor-grabbing' : 'cursor-grab'
                }`}
                style={{
                  aspectRatio: `${preset.width} / ${preset.height}`,
                  maxHeight: 'calc(100vh - 180px)',
                  width: '100%',
                  maxWidth: `calc((100vh - 180px) * ${preset.width / preset.height})`,
                  backgroundColor: '#f3f3f3',
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={active.objectUrl}
                  alt="편집 이미지"
                  onLoad={onImageLoad}
                  draggable={false}
                  style={{
                    position: 'absolute',
                    left: pct(transform.x, preset.width),
                    top: pct(transform.y, preset.height),
                    width: pct(transform.w, preset.width),
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                />
                {/* 출력 영역 테두리 */}
                <div className="absolute inset-0 ring-2 ring-inset ring-[#2563EB]/25 pointer-events-none rounded-lg" />
              </div>
            </div>
          </div>

          {/* 우측 패널 */}
          <div className="w-80 shrink-0 flex flex-col gap-4">

            {/* 이미지 조절 버튼 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">이미지 조절</p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => zoomBy(1.15)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-all"
                >
                  <ZoomIn className="w-3.5 h-3.5" /> 확대
                </button>
                <button
                  onClick={() => zoomBy(1 / 1.15)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-all"
                >
                  <ZoomOut className="w-3.5 h-3.5" /> 축소
                </button>
                <button
                  onClick={applyFit}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-all"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> 맞춤
                </button>
              </div>
            </div>

            {/* 출력 사이즈 + 포맷 + 다운로드 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">

              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">출력 사이즈</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {SIZE_PRESETS.map(p => (
                    <button
                      key={p.label}
                      onClick={() => setPreset(p)}
                      className={`py-2 px-2 text-xs font-medium rounded-lg border transition-all text-center ${
                        preset.label === p.label
                          ? 'bg-[#1A4F8A] border-[#1A4F8A] text-white shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100" />

              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">저장 포맷</p>
                <div className="flex gap-2">
                  {(['jpeg', 'png'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${
                        format === f
                          ? 'bg-[#1A4F8A] border-[#1A4F8A] text-white shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {f === 'jpeg' ? 'JPG' : 'PNG'}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleDownload}
                disabled={transform.w === 0 || downloading}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-[#1A4F8A] hover:bg-[#163f70] active:bg-[#12356e] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                {downloading ? '변환 중...' : `다운로드 (${preset.width}×${preset.height})`}
              </button>

              {isBatch && (
                <button
                  onClick={handleZip}
                  disabled={doneCount === 0 || zipping}
                  className="w-full py-2.5 rounded-xl font-medium text-sm text-[#1A4F8A] border border-[#1A4F8A] hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  <Archive className="w-4 h-4" />
                  {zipping ? 'ZIP 생성 중...' : `ZIP 전체 다운로드 (${doneCount}/${images.length})`}
                </button>
              )}
            </div>

            {/* 출력 규격 안내 */}
            <div className="bg-blue-50 rounded-xl border border-blue-100 p-3">
              <p className="text-xs font-semibold text-[#1A4F8A] mb-1.5">출력 규격</p>
              <div className="space-y-1">
                {[
                  ['해상도', `${preset.width} × ${preset.height} px`],
                  ['비율', `${(preset.width / preset.height).toFixed(3)} : 1`],
                  ['JPG 품질', '90%'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-blue-400">{label}</span>
                    <span className="text-[#1A4F8A] font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
