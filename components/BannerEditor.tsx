'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Download, ZoomIn, ZoomOut, Maximize2, Upload } from 'lucide-react'

// ── 사이즈 프리셋 ─────────────────────────────────────
const SIZE_PRESETS = [
  { label: '1080 × 640', w: 1080, h: 640 },
  { label: '1152 × 720', w: 1152, h: 720 },
  { label: '1152 × 420', w: 1152, h: 420 },
  { label: '2304 × 260', w: 2304, h: 260 },
  { label: '640 × 362',  w: 640,  h: 362 },
  { label: '640 × 142',  w: 640,  h: 142 },
  { label: '1080 × 142', w: 1080, h: 142 },
  { label: '406 × 406',  w: 406,  h: 406 },
  { label: '353 × 250',  w: 353,  h: 250 },
  { label: '1080 × 1590', w: 1080, h: 1590 },
  { label: '347 × 220',  w: 347,  h: 220 },
]

// ── 컬러 팔레트 ──────────────────────────────────────
const COLOR_PALETTE: { label: string; colors: string[] }[] = [
  { label: '무채색', colors: ['#FFFFFF', '#F5F5F5', '#E0E0E0', '#9E9E9E', '#616161', '#212121', '#000000'] },
  { label: '레드',   colors: ['#FFEBEE', '#EF9A9A', '#EF5350', '#D32F2F'] },
  { label: '핑크',   colors: ['#FCE4EC', '#F48FB1', '#EC407A', '#C2185B'] },
  { label: '퍼플',   colors: ['#F3E5F5', '#CE93D8', '#AB47BC', '#7B1FA2'] },
  { label: '블루',   colors: ['#E3F2FD', '#90CAF9', '#2196F3', '#1565C0'] },
  { label: '청록',   colors: ['#E0F7FA', '#80DEEA', '#00BCD4', '#00838F'] },
  { label: '그린',   colors: ['#E8F5E9', '#A5D6A7', '#4CAF50', '#2E7D32'] },
  { label: '옐로우', colors: ['#FFFDE7', '#FFF176', '#FFEB3B', '#F9A825'] },
  { label: '오렌지', colors: ['#FFF3E0', '#FFCC80', '#FF9800', '#E65100'] },
  { label: '브라운', colors: ['#EFEBE9', '#BCAAA4', '#795548', '#3E2723'] },
]

// ── 타입 ─────────────────────────────────────────────
interface ImgTransform {
  x: number; y: number; w: number; h: number
}

function coverFit(natW: number, natH: number, canW: number, canH: number): ImgTransform {
  const scale = Math.max(canW / natW, canH / natH)
  const w = natW * scale
  const h = natH * scale
  return { x: (canW - w) / 2, y: (canH - h) / 2, w, h }
}

// ── 메인 컴포넌트 ─────────────────────────────────────
export default function BannerEditor() {
  const [preset, setPreset] = useState(SIZE_PRESETS[5]) // 기본: 640×142
  const [bgColor, setBgColor] = useState<string>('#FFFFFF')
  const [isTransparent, setIsTransparent] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [transform, setTransform] = useState<ImgTransform>({ x: 0, y: 0, w: 0, h: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [format, setFormat] = useState<'jpeg' | 'png'>('jpeg')

  const canvasAreaRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const dragLast = useRef({ x: 0, y: 0 })
  const naturalSizeRef = useRef({ w: 0, h: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const presetRef = useRef(preset)
  useEffect(() => { presetRef.current = preset }, [preset])

  const getScaleFactor = useCallback(() => {
    if (!canvasAreaRef.current) return 1
    return presetRef.current.w / canvasAreaRef.current.getBoundingClientRect().width
  }, [])

  const applyFit = useCallback(() => {
    const { w, h } = naturalSizeRef.current
    if (w > 0) setTransform(coverFit(w, h, presetRef.current.w, presetRef.current.h))
  }, [])

  // 프리셋 변경 시 이미지 재배치
  useEffect(() => { applyFit() }, [preset, applyFit])

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget
    naturalSizeRef.current = { w, h }
    setTransform(coverFit(w, h, presetRef.current.w, presetRef.current.h))
  }, [])

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setImageUrl(URL.createObjectURL(file))
    naturalSizeRef.current = { w: 0, h: 0 }
  }, [imageUrl])

  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl) }, [imageUrl])

  // ── 드래그 ────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imageUrl) return
    e.preventDefault()
    setIsDragging(true)
    dragLast.current = { x: e.clientX, y: e.clientY }
  }, [imageUrl])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    const sf = getScaleFactor()
    const dx = (e.clientX - dragLast.current.x) * sf
    const dy = (e.clientY - dragLast.current.y) * sf
    dragLast.current = { x: e.clientX, y: e.clientY }
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
  }, [isDragging, getScaleFactor])

  const handleMouseUp = useCallback(() => setIsDragging(false), [])

  // ── 휠 줌 ─────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!imageUrl) return
    e.preventDefault()
    const rect = canvasAreaRef.current!.getBoundingClientRect()
    const sf = presetRef.current.w / rect.width
    const mx = (e.clientX - rect.left) * sf
    const my = (e.clientY - rect.top) * sf
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    setTransform(prev => ({
      x: mx - (mx - prev.x) * factor,
      y: my - (my - prev.y) * factor,
      w: prev.w * factor,
      h: prev.h * factor,
    }))
  }, [imageUrl])

  const zoomBy = useCallback((factor: number) => {
    const cx = presetRef.current.w / 2
    const cy = presetRef.current.h / 2
    setTransform(prev => ({
      x: cx - (cx - prev.x) * factor,
      y: cy - (cy - prev.y) * factor,
      w: prev.w * factor,
      h: prev.h * factor,
    }))
  }, [])

  // ── 파일 드롭 ─────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }, [loadFile])

  // ── 내보내기 ──────────────────────────────────────
  const handleDownload = useCallback(() => {
    const { w, h } = presetRef.current
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!

    if (!isTransparent) {
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, w, h)
    }

    if (imgRef.current && transform.w > 0) {
      ctx.drawImage(imgRef.current, transform.x, transform.y, transform.w, transform.h)
    }

    canvas.toBlob(blob => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `banner_${w}x${h}.${format === 'jpeg' ? 'jpg' : 'png'}`
      a.click()
      URL.revokeObjectURL(url)
    }, `image/${format}`, format === 'jpeg' ? 0.95 : undefined)
  }, [bgColor, isTransparent, transform, format])

  const pct = (val: number, total: number) => `${(val / total) * 100}%`

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">

      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 shrink-0">
        <div className="w-6 h-6 bg-[#1A4F8A] rounded-md" />
        <span className="font-bold text-[#1A4F8A] text-sm">이랜드몰 배너 제작 툴</span>
        <span className="text-xs text-gray-400 ml-1">{preset.w} × {preset.h}px</span>
      </header>

      <div className="flex-1 flex overflow-hidden">

        {/* 캔버스 영역 */}
        <main className="flex-1 flex items-center justify-center p-6 overflow-hidden">
          <div className="w-full flex flex-col items-center gap-4">
            <p className="text-xs text-gray-400 font-medium">
              드래그로 위치 조절 &nbsp;·&nbsp; 스크롤로 확대/축소
            </p>

            {/* 배너 캔버스 */}
            <div
              ref={canvasAreaRef}
              className={`relative overflow-hidden rounded-lg shadow-lg select-none border border-gray-200 ${
                imageUrl && isDragging ? 'cursor-grabbing' : imageUrl ? 'cursor-grab' : 'cursor-default'
              }`}
              style={{
                aspectRatio: `${preset.w} / ${preset.h}`,
                width: '100%',
                maxWidth: `min(860px, calc((100vh - 200px) * ${preset.w / preset.h}))`,
                backgroundImage: isTransparent
                  ? 'linear-gradient(45deg,#e5e5e5 25%,transparent 25%),linear-gradient(-45deg,#e5e5e5 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e5e5 75%),linear-gradient(-45deg,transparent 75%,#e5e5e5 75%)'
                  : undefined,
                backgroundSize: isTransparent ? '16px 16px' : undefined,
                backgroundPosition: isTransparent ? '0 0,0 8px,8px -8px,-8px 0' : undefined,
                backgroundColor: isTransparent ? '#f3f3f3' : bgColor,
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
            >
              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="배너 이미지"
                  onLoad={onImageLoad}
                  draggable={false}
                  style={{
                    position: 'absolute',
                    left: pct(transform.x, preset.w),
                    top: pct(transform.y, preset.h),
                    width: pct(transform.w, preset.w),
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                />
              )}

              {!imageUrl && (
                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center gap-2 transition-colors ${isDragOver ? 'bg-blue-50/80' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer' }}
                >
                  <Upload className={`w-8 h-8 ${isDragOver ? 'text-blue-500' : 'text-gray-300'}`} />
                  <span className={`text-sm font-medium ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`}>
                    {isDragOver ? '여기에 놓으세요!' : '이미지를 드래그하거나 클릭해서 업로드'}
                  </span>
                </div>
              )}

              {imageUrl && isDragOver && (
                <div className="absolute inset-0 bg-blue-500/20 border-2 border-blue-400 border-dashed rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">이미지 교체</span>
                </div>
              )}

              <div className="absolute inset-0 ring-1 ring-inset ring-black/10 pointer-events-none rounded-lg" />
            </div>

            <p className="text-xs text-gray-300">출력 해상도: {preset.w} × {preset.h} px</p>
          </div>
        </main>

        {/* 우측 패널 */}
        <aside className="w-72 bg-white border-l border-gray-200 flex flex-col overflow-y-auto shrink-0">

          {/* 출력 사이즈 */}
          <div className="p-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-2">출력 사이즈</p>
            <div className="grid grid-cols-2 gap-1.5">
              {SIZE_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => setPreset(p)}
                  className={`py-2 px-2 text-xs font-medium rounded-lg border transition-all text-center leading-tight ${
                    preset.label === p.label
                      ? 'bg-[#1A4F8A] border-[#1A4F8A] text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-[#1A4F8A]/40 hover:bg-blue-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 배경색 */}
          <div className="p-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-3">배경색</p>

            <div className="flex items-center gap-2 mb-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <div
                  className="w-8 h-8 rounded-lg border-2 border-gray-200 overflow-hidden relative"
                  style={{ backgroundColor: isTransparent ? 'transparent' : bgColor }}
                >
                  {isTransparent && (
                    <div className="absolute inset-0" style={{
                      backgroundImage: 'linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%)',
                      backgroundSize: '8px 8px',
                      backgroundPosition: '0 0,0 4px,4px -4px,-4px 0',
                    }} />
                  )}
                  <input
                    type="color"
                    value={bgColor}
                    onChange={e => { setBgColor(e.target.value); setIsTransparent(false) }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
                <span className="text-xs text-gray-500">직접 선택</span>
              </label>

              <button
                onClick={() => setIsTransparent(prev => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  isTransparent
                    ? 'bg-[#1A4F8A] border-[#1A4F8A] text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                투명
              </button>
            </div>

            <div className="space-y-2">
              {COLOR_PALETTE.map(group => (
                <div key={group.label}>
                  <p className="text-[10px] text-gray-400 mb-1">{group.label}</p>
                  <div className="flex flex-wrap gap-1">
                    {group.colors.map(color => (
                      <button
                        key={color}
                        onClick={() => { setBgColor(color); setIsTransparent(false) }}
                        title={color}
                        className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
                        style={{
                          backgroundColor: color,
                          borderColor: !isTransparent && bgColor === color ? '#1A4F8A' : color === '#FFFFFF' ? '#E0E0E0' : 'transparent',
                          boxShadow: !isTransparent && bgColor === color ? '0 0 0 2px #1A4F8A' : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 이미지 */}
          <div className="p-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-2">이미지</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = '' }}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-500 hover:border-[#1A4F8A] hover:text-[#1A4F8A] transition-colors flex items-center justify-center gap-1.5 mb-3"
            >
              <Upload className="w-3.5 h-3.5" />
              {imageUrl ? '이미지 교체' : '이미지 업로드'}
            </button>

            {imageUrl && (
              <div className="flex gap-1.5">
                <button onClick={() => zoomBy(1.15)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                  <ZoomIn className="w-3.5 h-3.5" /> 확대
                </button>
                <button onClick={() => zoomBy(1 / 1.15)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                  <ZoomOut className="w-3.5 h-3.5" /> 축소
                </button>
                <button onClick={applyFit} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                  <Maximize2 className="w-3.5 h-3.5" /> 맞춤
                </button>
              </div>
            )}
          </div>

          {/* 저장 */}
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">저장 포맷</p>
            <div className="flex gap-2 mb-3">
              {(['jpeg', 'png'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${
                    format === f
                      ? 'bg-[#1A4F8A] border-[#1A4F8A] text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f === 'jpeg' ? 'JPG' : 'PNG'}
                </button>
              ))}
            </div>

            <button
              onClick={handleDownload}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-[#1A4F8A] hover:bg-[#163f70] active:bg-[#12356e] transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              다운로드 ({preset.w}×{preset.h})
            </button>

            <div className="mt-3 bg-blue-50 rounded-xl border border-blue-100 p-3 space-y-1">
              {[
                ['해상도', `${preset.w} × ${preset.h} px`],
                ['비율', `${(preset.w / preset.h).toFixed(2)} : 1`],
                ['JPG 품질', '95%'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-blue-400">{label}</span>
                  <span className="text-[#1A4F8A] font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

        </aside>
      </div>
    </div>
  )
}
