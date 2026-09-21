import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { Editor } from '@tiptap/core'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import {
  capturePdfPageAsDataUrl,
  transcribePageImage,
  getVisionConfig,
  saveVisionConfig,
  type VisionProviderConfig,
} from './vision-service'
import { insertTranscribedPageToEditor, scrollToWordPage } from './editor-page-sync'
import {
  IconSidebarCollapse,
  IconDocumentPdf,
  IconManuscript,
  IconFlash,
  IconFolderOpen,
  IconDocumentBulletList,
  IconSettings,
  IconChevronLeft,
  IconChevronRight,
  IconSparkle,
  IconLightbulb,
  IconFitPage,
  IconClose,
  IconCheck,
  IconSave,
} from '../components/icons'
import {
  isManusProjectFile,
  unpackManusProject,
  type ManusProjectMetadata,
} from './project-io'
import './manuscriber.css'

// Configure PDF.js worker
GlobalWorkerOptions.workerSrc = workerUrl
const ASSET_BASE = new URL('pdfjs/', document.baseURI).href
const DOC_OPTS = {
  cMapUrl: `${ASSET_BASE}cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `${ASSET_BASE}standard_fonts/`,
  wasmUrl: `${ASSET_BASE}wasm/`,
}

export type PageStatus = 'idle' | 'transcribing' | 'done' | 'error'

interface PdfThumbnailItemProps {
  pdfDoc: PDFDocumentProxy
  pageNo: number
  isActive: boolean
  status: PageStatus
  onClick: () => void
}

function PdfThumbnailItem({ pdfDoc, pageNo, isActive, status, onClick }: PdfThumbnailItemProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rendered, setRendered] = useState<boolean>(false)
  const [aspectRatio, setAspectRatio] = useState<number>(1.414)

  useEffect(() => {
    let active = true
    let renderTask: RenderTask | null = null

    const renderThumb = async () => {
      if (!canvasRef.current || rendered) return
      try {
        const page = await pdfDoc.getPage(pageNo)
        if (!active) return

        const unscaledViewport = page.getViewport({ scale: 1.0 })
        const targetWidth = 84
        const targetScale = targetWidth / unscaledViewport.width
        const viewport = page.getViewport({ scale: targetScale })

        setAspectRatio(viewport.height / viewport.width)

        const canvas = canvasRef.current
        if (!canvas) return
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)

        const ctx = canvas.getContext('2d', { alpha: false })
        if (!ctx) return
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        renderTask = page.render({
          canvas,
          canvasContext: ctx,
          viewport,
        })
        await renderTask.promise
        if (active) setRendered(true)
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'RenderingCancelledException') return
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void renderThumb()
          observer.disconnect()
        }
      },
      { rootMargin: '120px' }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      active = false
      observer.disconnect()
      renderTask?.cancel()
    }
  }, [pdfDoc, pageNo, rendered])

  useEffect(() => {
    if (isActive && containerRef.current) {
      containerRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [isActive])

  return (
    <div
      ref={containerRef}
      className={`manuscriber-thumb-card ${isActive ? 'active' : ''}`}
      onClick={onClick}
      title={`Halaman ${pageNo}: ${
        status === 'done'
          ? 'Selesai'
          : status === 'transcribing'
            ? 'Sedang AI...'
            : status === 'error'
              ? 'Gagal'
              : 'Belum Ditranskripsi'
      }`}
    >
      <div className="manuscriber-thumb-canvas-wrap" style={{ minHeight: Math.round(84 * aspectRatio) }}>
        <canvas ref={canvasRef} className="manuscriber-thumb-canvas" />

        {status === 'done' && (
          <span className="manuscriber-thumb-badge done" title="Selesai Ditranskripsi">
            <IconCheck size={10} />
          </span>
        )}
        {status === 'transcribing' && (
          <span className="manuscriber-thumb-badge transcribing" title="Sedang Ditranskripsi">
            <span className="spinner-mini" />
          </span>
        )}
        {status === 'error' && (
          <span className="manuscriber-thumb-badge error" title="Gagal Ditranskripsi">
            !
          </span>
        )}
      </div>

      <div className="manuscriber-thumb-footer">
        <span className="manuscriber-thumb-page-label">{pageNo}</span>
      </div>
    </div>
  )
}

interface PdfPageCardProps {
  pdfDoc: PDFDocumentProxy
  pageNo: number
  scale: number
  status: PageStatus
  onTranscribe: (pageNo: number) => void
  onVisible: (pageNo: number) => void
}

function PdfPageCard({ pdfDoc, pageNo, scale, status, onTranscribe, onVisible }: PdfPageCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rendered, setRendered] = useState<boolean>(false)
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: 595, height: 842 })
  const renderTaskRef = useRef<RenderTask | null>(null)

  useEffect(() => {
    let active = true
    pdfDoc.getPage(pageNo).then((page) => {
      if (!active) return
      const vp = page.getViewport({ scale: 1.0 })
      setPageSize({ width: vp.width, height: vp.height })
    }).catch(() => {})
    return () => {
      active = false
    }
  }, [pdfDoc, pageNo])

  useEffect(() => {
    let active = true

    const renderPage = async () => {
      if (!canvasRef.current) return
      try {
        renderTaskRef.current?.cancel()
        const page = await pdfDoc.getPage(pageNo)
        if (!active) return

        const viewport = page.getViewport({ scale })
        const canvas = canvasRef.current
        if (!canvas) return

        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`

        const ctx = canvas.getContext('2d', { alpha: false })
        if (!ctx) return
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        const task = page.render({
          canvas,
          canvasContext: ctx,
          viewport,
        })
        renderTaskRef.current = task
        await task.promise
        if (active) setRendered(true)
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'RenderingCancelledException') return
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void renderPage()
        }
      },
      { rootMargin: '400px' }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      active = false
      observer.disconnect()
      renderTaskRef.current?.cancel()
    }
  }, [pdfDoc, pageNo, scale])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && entries[0].intersectionRatio >= 0.4) {
          onVisible(pageNo)
        }
      },
      { threshold: [0.4] }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [pageNo, onVisible])

  const scaledWidth = Math.floor(pageSize.width * scale)
  const scaledHeight = Math.floor(pageSize.height * scale)

  return (
    <div
      id={`pdf-page-card-${pageNo}`}
      ref={containerRef}
      className="pdf-page-card"
      style={{
        width: scaledWidth,
        minHeight: scaledHeight,
      }}
    >
      <div className="pdf-page-card-header">
        <span className="pdf-page-card-num">Hal {pageNo}</span>
        <div className="pdf-page-card-actions">
          {status === 'done' ? (
            <>
              <span className="pdf-page-done-tag">
                <IconCheck size={11} /> Selesai
              </span>
              <button
                className="pdf-page-quick-transcribe-btn secondary"
                onClick={() => onTranscribe(pageNo)}
                title={`Transkripsi Ulang Halaman ${pageNo} ke Word`}
              >
                <IconSparkle size={11} /> Ulang
              </button>
            </>
          ) : status === 'transcribing' ? (
            <span className="pdf-page-transcribing-tag">
              <span className="spinner-mini" /> Memproses AI...
            </span>
          ) : status === 'error' ? (
            <>
              <span className="pdf-page-error-tag">
                ! Gagal
              </span>
              <button
                className="pdf-page-quick-transcribe-btn"
                onClick={() => onTranscribe(pageNo)}
                title={`Coba Lagi Transkripsi Halaman ${pageNo}`}
              >
                <IconSparkle size={11} /> Coba Lagi
              </button>
            </>
          ) : (
            <button
              className="pdf-page-quick-transcribe-btn"
              onClick={() => onTranscribe(pageNo)}
              title={`Transkripsikan Halaman ${pageNo} ke Word`}
            >
              <IconSparkle size={12} /> Transkripsi
            </button>
          )}
        </div>
      </div>

      <div className="pdf-page-canvas-wrapper" style={{ width: scaledWidth, height: scaledHeight }}>
        <canvas ref={canvasRef} className="pdf-page-canvas" />
        {!rendered && (
          <div className="pdf-page-card-skeleton" style={{ width: scaledWidth, height: scaledHeight }}>
            <span className="spinner-mini" />
            <span>Memuat Halaman {pageNo}...</span>
          </div>
        )}
      </div>
    </div>
  )
}

function clampPanelWidth(width: number): number {
  const min = 320
  const max = Math.max(min, Math.floor(window.innerWidth * 0.75))
  return Math.min(max, Math.max(min, width))
}

export interface ManuscriberPdfExportState {
  pdfBuffer: ArrayBuffer
  fileName: string
  totalPages: number
  lastActivePage: number
  lastZoom: number
  pageStatuses: Record<number, PageStatus>
  pageErrors: Record<number, string>
}

export interface ManuscriberBridge {
  getPdfExportState: () => ManuscriberPdfExportState | null
  loadPdfFromBuffer: (
    pdfData: ArrayBuffer,
    fileName: string,
    initialMeta?: ManusProjectMetadata['pdf'],
  ) => Promise<void>
}

export interface PdfViewerPanelProps {
  editor: Editor | null
  isOpen?: boolean
  onToggleOpen?: (open: boolean) => void
  bridgeRef?: React.MutableRefObject<ManuscriberBridge | null>
  initialPdf?: {
    buffer: ArrayBuffer
    name: string
    meta?: ManusProjectMetadata['pdf']
  } | null
  onSaveProject?: () => void
  onSaveProjectAs?: () => void
  onOpenProjectFile?: (data: ArrayBuffer, name: string) => Promise<void>
  isProjectActive?: boolean
}

export function PdfViewerPanel({
  editor,
  isOpen: externalIsOpen,
  onToggleOpen,
  bridgeRef,
  initialPdf,
  onSaveProject,
  onSaveProjectAs,
  onOpenProjectFile,
  isProjectActive,
}: PdfViewerPanelProps) {
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(true)
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const setIsOpen = (v: boolean) => {
    setInternalIsOpen(v)
    onToggleOpen?.(v)
  }

  const preferredWidthRef = useRef<number>(520)
  const [panelWidth, setPanelWidth] = useState<number>(() => clampPanelWidth(preferredWidthRef.current))
  const [resizing, setResizing] = useState<boolean>(false)

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageInputVal, setPageInputVal] = useState<string>('1')
  const [scale, setScale] = useState<number>(1.0)
  const [pageStatuses, setPageStatuses] = useState<Record<number, PageStatus>>({})
  const [pageErrors, setPageErrors] = useState<Record<number, string>>({})
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false)
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null)
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false)
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false)
  const [showRangeModal, setShowRangeModal] = useState<boolean>(false)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false)

  const rawPdfBufferRef = useRef<ArrayBuffer | null>(null)
  const cancelBatchRef = useRef<boolean>(false)
  const asideRef = useRef<HTMLElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const currentRenderTaskRef = useRef<RenderTask | null>(null)

  // Pan & Drag state
  const [isPanning, setIsPanning] = useState<boolean>(false)
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  })

  // Wheel Zoom (Ctrl + Wheel or Trackpad Pinch)
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY < 0 ? 0.08 : -0.08
        setScale((prev) => Math.min(3.0, Math.max(0.3, Number((prev + delta).toFixed(2)))))
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [pdfDoc])

  // Global mouse up for pan release
  useEffect(() => {
    const onGlobalMouseUp = () => setIsPanning(false)
    window.addEventListener('mouseup', onGlobalMouseUp)
    return () => window.removeEventListener('mouseup', onGlobalMouseUp)
  }, [])

  // Pan event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    if (!viewportRef.current) return
    setIsPanning(true)
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: viewportRef.current.scrollLeft,
      scrollTop: viewportRef.current.scrollTop,
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning || !viewportRef.current) return
    e.preventDefault()
    const dx = e.clientX - panStartRef.current.x
    const dy = e.clientY - panStartRef.current.y
    viewportRef.current.scrollLeft = panStartRef.current.scrollLeft - dx
    viewportRef.current.scrollTop = panStartRef.current.scrollTop - dy
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  // Resizing logic matching .ai-dock
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    setResizing(true)
    const startX = e.clientX
    const startWidth = panelWidth
    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX
      const next = clampPanelWidth(startWidth + delta)
      preferredWidthRef.current = next
      setPanelWidth(next)
    }
    const onUp = () => {
      setResizing(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  // Load PDF from ArrayBuffer with optional project metadata restoration
  const loadPdfData = useCallback(
    async (data: ArrayBuffer, name: string, initialMeta?: ManusProjectMetadata['pdf']) => {
      try {
        setLoadingPdf(true)
        currentRenderTaskRef.current?.cancel()

        // Keep a detached-safe copy because PDF.js transfers the buffer to its web worker
        const safeBufferCopy = data.slice(0)
        const workerData = data.slice(0)

        const doc = await getDocument({
          data: new Uint8Array(workerData),
          ...DOC_OPTS,
        }).promise

        rawPdfBufferRef.current = safeBufferCopy
        setPdfDoc(doc)
        setFileName(name)
        setNumPages(doc.numPages)
        const targetPage =
          initialMeta?.lastActivePage && initialMeta.lastActivePage <= doc.numPages
            ? initialMeta.lastActivePage
            : 1
        setCurrentPage(targetPage)
        setPageInputVal(String(targetPage))
        if (initialMeta?.lastZoom) {
          setScale(initialMeta.lastZoom)
        }
        setPageStatuses(initialMeta?.pageStatuses || {})
        setPageErrors(initialMeta?.pageErrors || {})
      } catch (err) {
        console.error('Failed to load PDF:', err)
        alert(`Gagal memuat file PDF: ${String(err)}`)
      } finally {
        setLoadingPdf(false)
      }
    },
    [],
  )

  // Sync bridge ref for external save/load coordination
  useEffect(() => {
    if (bridgeRef) {
      bridgeRef.current = {
        getPdfExportState: () => {
          if (!pdfDoc || !rawPdfBufferRef.current || rawPdfBufferRef.current.byteLength === 0) return null
          return {
            pdfBuffer: rawPdfBufferRef.current.slice(0),
            fileName,
            totalPages: numPages,
            lastActivePage: currentPage,
            lastZoom: scale,
            pageStatuses,
            pageErrors,
          }
        },
        loadPdfFromBuffer: (
          pdfData: ArrayBuffer,
          name: string,
          meta?: ManusProjectMetadata['pdf'],
        ) => {
          return loadPdfData(pdfData, name, meta)
        },
      }
    }
  }, [
    bridgeRef,
    pdfDoc,
    fileName,
    numPages,
    currentPage,
    scale,
    pageStatuses,
    pageErrors,
    loadPdfData,
  ])

  // Sync page input value when page changes
  useEffect(() => {
    setPageInputVal(String(currentPage))
  }, [currentPage])

  // Automatically load initial PDF if passed from parent (e.g. project open)
  useEffect(() => {
    if (initialPdf && initialPdf.buffer && initialPdf.buffer.byteLength > 0) {
      void loadPdfData(initialPdf.buffer, initialPdf.name, initialPdf.meta)
    }
  }, [initialPdf, loadPdfData])

  // Automatically consume pending PDF if opened directly via Manuscriber
  useEffect(() => {
    let mounted = true
    window.desktop?.consumePendingPdf?.().then((res) => {
      if (!mounted || !res || !res.ok || !res.fileData || !res.name) return
      void loadPdfData(res.fileData, res.name)
    }).catch(() => {})
    return () => {
      mounted = false
    }
  }, [loadPdfData])

  // Native file picker (supports .pdf and .manus projects)
  const handlePickPdf = async () => {
    try {
      const res = await window.desktop.pickPdf()
      if (!res.canceled && res.fileData && res.name) {
        if (isManusProjectFile(res.name) && onOpenProjectFile) {
          await onOpenProjectFile(res.fileData, res.name)
        } else {
          await loadPdfData(res.fileData, res.name)
        }
      }
    } catch {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.pdf,.manus,.manuscriber,.mnsproj'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          const buf = await file.arrayBuffer()
          if (isManusProjectFile(file.name) && onOpenProjectFile) {
            await onOpenProjectFile(buf, file.name)
          } else {
            await loadPdfData(buf, file.name)
          }
        }
      }
      input.click()
    }
  }

  // Drag & drop directly into the panel
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      const isProject = isManusProjectFile(file.name)
      if (isProject && onOpenProjectFile) {
        const buf = await file.arrayBuffer()
        await onOpenProjectFile(buf, file.name)
      } else if (isPdf) {
        const buf = await file.arrayBuffer()
        await loadPdfData(buf, file.name)
      }
    }
  }

  // Jump to specific page
  const scrollToPage = useCallback((pageNo: number) => {
    const el = document.getElementById(`pdf-page-card-${pageNo}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const handleSelectPage = useCallback((pageNo: number) => {
    setCurrentPage(pageNo)
    scrollToPage(pageNo)
  }, [scrollToPage])

  const handlePageInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const page = parseInt(pageInputVal, 10)
      if (!isNaN(page) && page >= 1 && page <= numPages) {
        handleSelectPage(page)
      } else {
        setPageInputVal(String(currentPage))
      }
    }
  }

  const handlePageInputBlur = () => {
    const page = parseInt(pageInputVal, 10)
    if (!isNaN(page) && page >= 1 && page <= numPages) {
      handleSelectPage(page)
    } else {
      setPageInputVal(String(currentPage))
    }
  }

  // Fit width calculation
  const handleFitWidth = async () => {
    if (!pdfDoc || !viewportRef.current) return
    try {
      const page = await pdfDoc.getPage(currentPage || 1)
      const unscaledViewport = page.getViewport({ scale: 1.0 })
      const availableWidth = viewportRef.current.clientWidth - 48
      if (availableWidth > 100 && unscaledViewport.width > 0) {
        const targetScale = Math.min(3.0, Math.max(0.3, Number((availableWidth / unscaledViewport.width).toFixed(2))))
        setScale(targetScale)
      }
    } catch (err) {
      console.warn('Fit width error:', err)
    }
  }

  // Transcribe single page
  const handleTranscribePage = async (pageNo: number) => {
    if (!pdfDoc || !editor) return
    setPageStatuses((prev) => ({ ...prev, [pageNo]: 'transcribing' }))
    setPageErrors((prev) => ({ ...prev, [pageNo]: '' }))

    try {
      const dataUrl = await capturePdfPageAsDataUrl(pdfDoc, pageNo, 2.0)
      const result = await transcribePageImage(dataUrl)

      if (!result.ok) {
        setPageStatuses((prev) => ({ ...prev, [pageNo]: 'error' }))
        setPageErrors((prev) => ({ ...prev, [pageNo]: result.error || 'Gagal mentranskripsi.' }))
        return
      }

      insertTranscribedPageToEditor(editor, pageNo, result.html, result.isRtl)
      setPageStatuses((prev) => ({ ...prev, [pageNo]: 'done' }))
    } catch (err) {
      setPageStatuses((prev) => ({ ...prev, [pageNo]: 'error' }))
      setPageErrors((prev) => ({ ...prev, [pageNo]: String(err) }))
    }
  }

  // Batch transcribe by range
  const handleStartRangeTranscribe = async (pages: number[]) => {
    if (!pdfDoc || !editor || pages.length === 0 || isBatchRunning) return
    setIsBatchRunning(true)
    cancelBatchRef.current = false
    setShowRangeModal(false)

    for (let i = 0; i < pages.length; i++) {
      if (cancelBatchRef.current) break
      const page = pages[i]
      setCurrentPage(page)
      setBatchProgress({ current: i + 1, total: pages.length })
      await handleTranscribePage(page)
    }

    setIsBatchRunning(false)
    setBatchProgress(null)
  }

  // Batch transcribe all pages
  const handleBatchTranscribe = async () => {
    if (!pdfDoc || !editor || numPages === 0 || isBatchRunning) return
    setIsBatchRunning(true)
    cancelBatchRef.current = false

    for (let page = 1; page <= numPages; page++) {
      if (cancelBatchRef.current) break
      setCurrentPage(page)
      setBatchProgress({ current: page, total: numPages })
      await handleTranscribePage(page)
    }

    setIsBatchRunning(false)
    setBatchProgress(null)
  }

  const handleCancelBatch = () => {
    cancelBatchRef.current = true
    setIsBatchRunning(false)
    setBatchProgress(null)
  }

  const currentStatus = pageStatuses[currentPage] || 'idle'
  const currentError = pageErrors[currentPage]

  // If collapsed, render 34px vertical rail matching Genspark AI .ai-dock .ai-rail
  if (!isOpen) {
    return (
      <div className="ai-dock collapsed">
        <button
          className="ai-rail"
          data-tip="Buka Panel Manuscriber PDF"
          aria-label="Buka Panel Manuscriber PDF"
          onClick={() => setIsOpen(true)}
          title="Buka Panel Manuscriber PDF"
        >
          <IconManuscript size={18} />
        </button>
      </div>
    )
  }

  return (
    <div
      className="ai-dock"
      style={{ '--ai-panel-width': `${panelWidth}px`, width: `${panelWidth}px` } as CSSProperties}
    >
      <aside
        ref={asideRef}
        className={`ai-panel ${resizing ? 'ai-panel-resizing' : ''}`}
        style={{ width: '100%' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag Resizer on right edge */}
        <div
          className="ai-panel-resizer"
          onPointerDown={startResize}
          role="separator"
          aria-orientation="vertical"
          title="Tarik untuk mengatur lebar panel PDF"
        />

        {/* Top Header Toolbar - Identical to .ai-panel-header */}
        <div className="ai-panel-header">
          <span className="ai-panel-title">
            <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--colorBrandForeground1)' }}>
              <IconManuscript size={16} />
            </span>
            <span>Manuscriber</span>
            {pdfDoc && (
              <span className="manuscriber-filename" title={fileName}>
                {fileName}
              </span>
            )}
          </span>

          <div className="ai-panel-header-actions">
            {pdfDoc && (
              <>
                {/* Range Transcribe Button (Icon only with clean tooltip) */}
                <button
                  className={`manuscriber-btn-icon-highlight ${isBatchRunning ? 'running' : ''}`}
                  onClick={isBatchRunning ? handleCancelBatch : () => setShowRangeModal(true)}
                  title={
                    isBatchRunning
                      ? `Batalkan Transkripsi Rentang Halaman (${batchProgress?.current}/${batchProgress?.total})`
                      : 'Transkripsi Berdasarkan Rentang Halaman (Range Transcribe)'
                  }
                  aria-label="Transkripsi Rentang Halaman"
                >
                  {isBatchRunning ? (
                    <>
                      <span className="spinner-mini" />
                      <span className="badge-count">{batchProgress?.current}/{batchProgress?.total}</span>
                    </>
                  ) : (
                    <IconFlash size={14} />
                  )}
                </button>

                {/* Open / Change PDF */}
                <button
                  className="ai-header-btn"
                  onClick={handlePickPdf}
                  title="Pilih / Buka File PDF atau Proyek .manus"
                  aria-label="Pilih File PDF"
                >
                  <IconFolderOpen size={15} />
                </button>

                {/* Toggle Thumbnails */}
                <button
                  className={`ai-header-btn ${showThumbnails ? 'active' : ''}`}
                  onClick={() => setShowThumbnails(!showThumbnails)}
                  title="Tampilkan / Sembunyikan Navigasi Halaman"
                  aria-label="Navigasi Halaman"
                >
                  <IconDocumentBulletList size={15} />
                </button>
              </>
            )}

            {/* AI Vision Settings */}
            <button
              className="ai-header-btn"
              onClick={() => setShowSettingsModal(true)}
              title="Pengaturan Vision AI & Model Endpoint"
              aria-label="Pengaturan Vision AI"
            >
              <IconSettings size={15} />
            </button>

            {/* Collapse panel button */}
            <button
              className="ai-header-btn"
              onClick={() => setIsOpen(false)}
              title="Ciutkan Panel Manuscriber"
              aria-label="Ciutkan Panel Manuscriber"
            >
              <IconSidebarCollapse size={15} />
            </button>
          </div>
        </div>

        {/* Main Workspace Body */}
        <div className="manuscriber-body">
          {!pdfDoc ? (
            /* Dropzone / Upload State */
            <div
              className={`manuscriber-dropzone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="manuscriber-drop-card">
                <div className="manuscriber-drop-icon" style={{ color: 'var(--colorBrandForeground1)' }}>
                  <IconManuscript size={44} />
                </div>
                <h3>Mulai Proyek Manuscriber</h3>
                <p>
                  Buka file PDF naskah untuk memulai transkripsi baru, atau buka file proyek <strong>.manus</strong> yang sudah pernah Anda simpan.
                </p>
                <div className="manuscriber-drop-actions">
                  <button
                    className="manuscriber-upload-btn primary"
                    onClick={handlePickPdf}
                    disabled={loadingPdf}
                  >
                    {loadingPdf ? (
                      <>
                        <span className="spinner-mini" /> Memuat File...
                      </>
                    ) : (
                      <>
                        <IconFolderOpen size={15} /> Buka PDF (Mulai Proyek Baru)
                      </>
                    )}
                  </button>
                  <button
                    className="manuscriber-upload-btn secondary"
                    onClick={handlePickPdf}
                    disabled={loadingPdf}
                  >
                    <IconSave size={15} /> Buka Proyek (.manus)
                  </button>
                </div>
                <div className="manuscriber-guide-box">
                  <strong>💡 Cara Kerja Proyek Manuscriber:</strong>
                  <ol>
                    <li>Buka PDF naskah yang ingin ditranskripsikan.</li>
                    <li>Transkripsikan halaman per halaman dengan tombol AI.</li>
                    <li>Klik <strong>Simpan Proyek</strong> di toolbar atas untuk menyimpan PDF dan dokumen Word sekaligus ke dalam satu file <strong>.manus</strong>.</li>
                  </ol>
                </div>
              </div>
            </div>
          ) : (
            /* Active PDF Paginated View */
            <div className="manuscriber-layout">
              {/* Visual Thumbnail Sidebar */}
              {showThumbnails && (
                <div className="manuscriber-sidebar">
                  <div className="manuscriber-sidebar-title">Daftar Hal ({numPages})</div>
                  <div className="manuscriber-thumbnails">
                    {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
                      <PdfThumbnailItem
                        key={p}
                        pdfDoc={pdfDoc}
                        pageNo={p}
                        isActive={currentPage === p}
                        status={pageStatuses[p] || 'idle'}
                        onClick={() => handleSelectPage(p)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Main Continuous Canvas Area */}
              <div className="manuscriber-preview-container">
                {/* Dismissible Clean Error Toast Banner */}
                {currentError && (
                  <div className="pdf-page-error-banner">
                    <span className="error-icon">⚠️</span>
                    <span className="error-text">
                      {currentError.length > 200
                        ? `${currentError.slice(0, 200)}...`
                        : currentError}
                    </span>
                    <button
                      className="error-dismiss-btn"
                      onClick={() => setPageErrors((prev) => ({ ...prev, [currentPage]: '' }))}
                      title="Tutup Pesan Error"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Continuous Multi-Page Scroll Viewport with Interactive Pan & Zoom */}
                <div
                  ref={viewportRef}
                  className={`manuscriber-viewport ${isPanning ? 'panning' : ''}`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <div className="pdf-pages-scroll-container">
                    {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
                      <PdfPageCard
                        key={p}
                        pdfDoc={pdfDoc}
                        pageNo={p}
                        scale={scale}
                        status={pageStatuses[p] || 'idle'}
                        onTranscribe={handleTranscribePage}
                        onVisible={(visiblePage) => {
                          setCurrentPage(visiblePage)
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Bottom Status Bar (Matching Word Editor Bottom Bar) */}
                <footer className="manuscriber-statusbar">
                  <div className="manuscriber-statusbar-left">
                    <button
                      className="manuscriber-statusbar-nav-btn"
                      disabled={currentPage <= 1}
                      onClick={() => handleSelectPage(Math.max(1, currentPage - 1))}
                      title="Halaman Sebelumnya"
                      aria-label="Sebelumnya"
                    >
                      <IconChevronLeft size={12} />
                    </button>
                    <div className="manuscriber-statusbar-page-counter">
                      <span>Hal</span>
                      <input
                        type="text"
                        className="manuscriber-statusbar-page-input"
                        value={pageInputVal}
                        onChange={(e) => setPageInputVal(e.target.value)}
                        onKeyDown={handlePageInputSubmit}
                        onBlur={handlePageInputBlur}
                        title="Ketik nomor halaman dan tekan Enter untuk melompat"
                      />
                      <span>dari {numPages}</span>
                    </div>
                    <button
                      className="manuscriber-statusbar-nav-btn"
                      disabled={currentPage >= numPages}
                      onClick={() => handleSelectPage(Math.min(numPages, currentPage + 1))}
                      title="Halaman Berikutnya"
                      aria-label="Berikutnya"
                    >
                      <IconChevronRight size={12} />
                    </button>
                  </div>
                  <div className="manuscriber-statusbar-right">
                    <button
                      className="zoom-btn"
                      onClick={() => setScale((s) => Math.max(0.3, Number((s - 0.1).toFixed(2))))}
                      title="Perkecil (Zoom Out)"
                      aria-label="Perkecil"
                    >
                      −
                    </button>
                    <input
                      type="range"
                      className="zoom-slider"
                      min={30}
                      max={300}
                      step={5}
                      value={Math.round(scale * 100)}
                      onChange={(e) => setScale(Number((Number(e.target.value) / 100).toFixed(2)))}
                      title={`Zoom: ${Math.round(scale * 100)}%`}
                      aria-label="Zoom slider"
                    />
                    <button
                      className="zoom-btn"
                      onClick={() => setScale((s) => Math.min(3.0, Number((s + 0.1).toFixed(2))))}
                      title="Perbesar (Zoom In)"
                      aria-label="Perbesar"
                    >
                      +
                    </button>
                    <button
                      className="zoom-val-btn"
                      onClick={() => setScale(1.0)}
                      title="Klik untuk reset zoom ke 100%"
                      aria-label="Reset zoom"
                    >
                      {Math.round(scale * 100)}%
                    </button>
                    <button
                      className="fit-btn"
                      onClick={handleFitWidth}
                      title="Sesuaikan Lebar Halaman (Fit Width)"
                      aria-label="Fit Width"
                    >
                      <IconFitPage size={13} />
                    </button>
                  </div>
                </footer>
              </div>
            </div>
          )}
        </div>

        {/* Batch Processing Modal */}
        {isBatchRunning && batchProgress && (
          <div className="manuscriber-batch-overlay">
            <div className="manuscriber-batch-modal">
              <div className="batch-spinner" />
              <h4>Mentranskripsikan Halaman {batchProgress.current} dari {batchProgress.total}</h4>
              <p>Vision AI sedang membaca naskah dan memasukkan teks langsung ke Word...</p>
              <div className="batch-progress-bar">
                <div
                  className="batch-progress-fill"
                  style={{
                    width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                  }}
                />
              </div>
              <button className="batch-cancel-btn" onClick={handleCancelBatch}>
                Batalkan
              </button>
            </div>
          </div>
        )}

        {/* Vision AI Settings Modal */}
        {showSettingsModal && (
          <VisionSettingsModal onClose={() => setShowSettingsModal(false)} />
        )}

        {/* Range Transcribe Modal */}
        {showRangeModal && (
          <RangeTranscribeModal
            numPages={numPages}
            currentPage={currentPage}
            onClose={() => setShowRangeModal(false)}
            onStart={handleStartRangeTranscribe}
          />
        )}
      </aside>
    </div>
  )
}

function parsePageRange(start: number, end: number, maxPages: number): number[] {
  const s = Math.max(1, Math.min(start, maxPages))
  const e = Math.max(1, Math.min(end, maxPages))
  const from = Math.min(s, e)
  const to = Math.max(s, e)
  const pages: number[] = []
  for (let i = from; i <= to; i++) {
    pages.push(i)
  }
  return pages
}

interface RangeTranscribeModalProps {
  numPages: number
  currentPage: number
  onClose: () => void
  onStart: (pages: number[]) => void
}

function RangeTranscribeModal({
  numPages,
  currentPage,
  onClose,
  onStart,
}: RangeTranscribeModalProps) {
  const [startPage, setStartPage] = useState<number>(currentPage || 1)
  const [endPage, setEndPage] = useState<number>(Math.min(currentPage + 4, numPages || 1))

  const pages = useMemo(() => {
    return parsePageRange(startPage, endPage, numPages)
  }, [startPage, endPage, numPages])

  const setPreset = (start: number, end: number) => {
    setStartPage(Math.max(1, Math.min(start, numPages)))
    setEndPage(Math.max(1, Math.min(end, numPages)))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pages.length > 0) {
      onStart(pages)
    }
  }

  return (
    <div className="manuscriber-batch-overlay" onClick={onClose}>
      <div className="manuscriber-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--colorBrandForeground1)' }}>
            <IconFlash size={15} />
            <h4 style={{ color: 'var(--text, var(--colorNeutralForeground1))' }}>Transkripsi Berdasarkan Rentang Halaman</h4>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Tutup">
            <IconClose size={12} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="range-inputs-row">
              <label>
                <span>Dari Halaman:</span>
                <input
                  type="number"
                  min={1}
                  max={numPages}
                  value={startPage}
                  onChange={(e) => setStartPage(Number(e.target.value) || 1)}
                  required
                />
              </label>
              <label>
                <span>Sampai Halaman:</span>
                <input
                  type="number"
                  min={1}
                  max={numPages}
                  value={endPage}
                  onChange={(e) => setEndPage(Number(e.target.value) || 1)}
                  required
                />
              </label>
            </div>

            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                Pilihan Cepat (Presets):
              </span>
              <div className="range-quick-presets">
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => setPreset(currentPage, currentPage)}
                >
                  Halaman Aktif ({currentPage})
                </button>
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => setPreset(currentPage, Math.min(currentPage + 4, numPages))}
                >
                  5 Hal ke Depan ({currentPage} - {Math.min(currentPage + 4, numPages)})
                </button>
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => setPreset(currentPage, Math.min(currentPage + 9, numPages))}
                >
                  10 Hal ke Depan ({currentPage} - {Math.min(currentPage + 9, numPages)})
                </button>
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => setPreset(1, numPages)}
                >
                  Semua Halaman (1 - {numPages})
                </button>
              </div>
            </div>

            <div className="range-summary">
              <IconDocumentPdf size={16} />
              <span>
                Akan mentranskripsikan <strong>{pages.length} halaman</strong> (Hal {Math.min(startPage, endPage)} s.d {Math.max(startPage, endPage)}) ke dokumen Word.
              </span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn-save" disabled={pages.length === 0}>
              Mulai Transkripsi ({pages.length} Hal)
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function VisionSettingsModal({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<VisionProviderConfig>(getVisionConfig)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    saveVisionConfig(config)
    setSaved(true)
    setTimeout(() => {
      onClose()
    }, 600)
  }

  return (
    <div className="manuscriber-batch-overlay" onClick={onClose}>
      <div className="manuscriber-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--colorBrandForeground1)' }}>
            <IconSettings size={15} />
            <h4 style={{ color: 'var(--text, var(--colorNeutralForeground1))' }}>Pengaturan Vision AI Manuscriber</h4>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Tutup">
            <IconClose size={12} />
          </button>
        </div>
        <div className="modal-body">
          <label>
            <span>Endpoint Base URL:</span>
            <input
              type="text"
              value={config.baseUrl}
              placeholder="https://ai.sumopod.com/v1"
              onChange={(e) => setConfig((c) => ({ ...c, baseUrl: e.target.value }))}
            />
          </label>
          <label>
            <span>API Key:</span>
            <input
              type="password"
              value={config.apiKey}
              placeholder="sk-..."
              onChange={(e) => setConfig((c) => ({ ...c, apiKey: e.target.value }))}
            />
          </label>
          <label>
            <span>Model Vision:</span>
            <input
              type="text"
              value={config.model}
              placeholder="seed-2-0-mini"
              onChange={(e) => setConfig((c) => ({ ...c, model: e.target.value }))}
            />
          </label>
        </div>
        <div className="modal-footer">
          {saved && <span className="save-success">✓ Tersimpan!</span>}
          <button className="btn-cancel" onClick={onClose}>
            Batal
          </button>
          <button className="btn-save" onClick={handleSave}>
            Simpan Konfigurasi
          </button>
        </div>
      </div>
    </div>
  )
}
