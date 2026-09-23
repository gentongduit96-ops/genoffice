import React, { useEffect, useRef, useState } from 'react'
import type { IdmlDocument, IdmlPageItem, IdmlSpread } from '@genoffice/idml-engine'
import type { IdmlTool } from '../workspace/Toolbox'
import { HorizontalRuler, VerticalRuler } from './Rulers'

interface SpreadCanvasProps {
  doc: IdmlDocument
  spread: IdmlSpread
  zoomLevel: number
  activeTool: IdmlTool
  selectedItemId?: string
  onSelectItem: (item?: IdmlPageItem) => void
  onStoryTextChange: (storyId: string, newText: string) => void
  onZoomChange: (zoom: number | ((prev: number) => number)) => void
  onOpenAiFitModal?: (storyId: string, frameId: string) => void
}

export const SpreadCanvas: React.FC<SpreadCanvasProps> = ({
  doc,
  spread,
  zoomLevel,
  activeTool,
  selectedItemId,
  onSelectItem,
  onStoryTextChange,
  onZoomChange,
  onOpenAiFitModal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null)

  const [mouseMm, setMouseMm] = useState<{ xMm: number; yMm: number } | undefined>()
  const [dragItemState, setDragItemState] = useState<{
    itemId: string
    handle?: string
    startMouseX: number
    startMouseY: number
    startBounds: { top: number; left: number; bottom: number; right: number }
  } | null>(null)

  const scale = zoomLevel / 100
  const widthMm = doc.preferences.pageWidth * (doc.preferences.facingPages ? 2 : 1)
  const heightMm = doc.preferences.pageHeight

  const widthPx = widthMm * 3.78
  const heightPx = heightMm * 3.78

  // Keyboard spacebar override
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        setIsSpacePressed(true)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // Wheel listener for Ctrl+Wheel zoom & touchpad scrolling
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const zoomDelta = e.deltaY < 0 ? 10 : -10
        onZoomChange((prev) => Math.min(400, Math.max(25, prev + zoomDelta)))
      }
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [onZoomChange])

  const isPanMode = activeTool === 'hand' || isSpacePressed

  const getCursorStyle = () => {
    if (isDraggingCanvas) return 'grabbing'
    if (isPanMode) return 'grab'
    if (activeTool === 'zoom') return 'zoom-in'
    return 'default'
  }

  const handlePointerDownContainer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button === 1 || isPanMode) {
      e.currentTarget.setPointerCapture(e.pointerId)
      setIsDraggingCanvas(true)
      const container = containerRef.current
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: container ? container.scrollLeft : 0,
        scrollTop: container ? container.scrollTop : 0,
      }
      return
    }

    if (activeTool === 'zoom') {
      if (e.altKey) {
        onZoomChange((prev) => Math.max(25, prev - 25))
      } else {
        onZoomChange((prev) => Math.min(400, prev + 25))
      }
      return
    }

    if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('idml-spread-wrapper')) {
      onSelectItem(undefined)
    }
  }

  const handlePointerMoveContainer = (e: React.PointerEvent<HTMLDivElement>) => {
    // Track cursor mm position for Rulers
    const spreadElem = containerRef.current?.querySelector('.idml-spread-wrapper')
    if (spreadElem) {
      const rect = spreadElem.getBoundingClientRect()
      const xMm = (e.clientX - rect.left) / (3.78 * scale)
      const yMm = (e.clientY - rect.top) / (3.78 * scale)
      setMouseMm({ xMm: Math.max(0, Math.round(xMm)), yMm: Math.max(0, Math.round(yMm)) })
    }

    // Canvas panning
    if (isDraggingCanvas && dragStartRef.current && containerRef.current) {
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      containerRef.current.scrollLeft = dragStartRef.current.scrollLeft - dx
      containerRef.current.scrollTop = dragStartRef.current.scrollTop - dy
      return
    }

    // Object moving & resizing
    if (dragItemState) {
      const dxPx = e.clientX - dragItemState.startMouseX
      const dyPx = e.clientY - dragItemState.startMouseY
      const dxMm = dxPx / (3.78 * scale)
      const dyMm = dyPx / (3.78 * scale)

      const targetItem = spread.pageItems.find((i) => i.id === dragItemState.itemId)
      if (!targetItem) return

      const sb = dragItemState.startBounds

      if (!dragItemState.handle) {
        // Move object
        targetItem.geometricBounds = {
          top: sb.top + dyMm,
          left: sb.left + dxMm,
          bottom: sb.bottom + dyMm,
          right: sb.right + dxMm,
        }
      } else {
        // Resize handle
        let newTop = sb.top
        let newLeft = sb.left
        let newBottom = sb.bottom
        let newRight = sb.right

        if (dragItemState.handle.includes('top')) newTop = Math.min(sb.bottom - 5, sb.top + dyMm)
        if (dragItemState.handle.includes('bottom')) newBottom = Math.max(sb.top + 5, sb.bottom + dyMm)
        if (dragItemState.handle.includes('left')) newLeft = Math.min(sb.right - 5, sb.left + dxMm)
        if (dragItemState.handle.includes('right')) newRight = Math.max(sb.left + 5, sb.right + dxMm)

        targetItem.geometricBounds = { top: newTop, left: newLeft, bottom: newBottom, right: newRight }
      }
    }
  }

  const handlePointerUpContainer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingCanvas) {
      setIsDraggingCanvas(false)
      dragStartRef.current = null
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // ignore
      }
    }

    if (dragItemState) {
      setDragItemState(null)
    }
  }

  const handleStartItemDrag = (e: React.PointerEvent, item: IdmlPageItem, handleName?: string) => {
    if (isPanMode || activeTool === 'zoom') return
    e.stopPropagation()
    onSelectItem(item)

    if (activeTool === 'selection') {
      setDragItemState({
        itemId: item.id,
        handle: handleName,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startBounds: { ...item.geometricBounds },
      })
    }
  }

  const renderHandles = (item: IdmlPageItem) => {
    const handleStyle: React.CSSProperties = {
      position: 'absolute',
      width: '7px',
      height: '7px',
      backgroundColor: '#ffffff',
      border: '1px solid var(--accent)',
      boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
      zIndex: 10,
      cursor: 'pointer',
    }

    return (
      <>
        <div
          style={{ ...handleStyle, top: '-4px', left: '-4px', cursor: 'nwse-resize' }}
          onPointerDown={(e) => handleStartItemDrag(e, item, 'top-left')}
        />
        <div
          style={{ ...handleStyle, top: '-4px', left: 'calc(50% - 3.5px)', cursor: 'ns-resize' }}
          onPointerDown={(e) => handleStartItemDrag(e, item, 'top-center')}
        />
        <div
          style={{ ...handleStyle, top: '-4px', right: '-4px', cursor: 'nesw-resize' }}
          onPointerDown={(e) => handleStartItemDrag(e, item, 'top-right')}
        />
        <div
          style={{ ...handleStyle, top: 'calc(50% - 3.5px)', left: '-4px', cursor: 'ew-resize' }}
          onPointerDown={(e) => handleStartItemDrag(e, item, 'middle-left')}
        />
        <div
          style={{ ...handleStyle, top: 'calc(50% - 3.5px)', right: '-4px', cursor: 'ew-resize' }}
          onPointerDown={(e) => handleStartItemDrag(e, item, 'middle-right')}
        />
        <div
          style={{ ...handleStyle, bottom: '-4px', left: '-4px', cursor: 'nesw-resize' }}
          onPointerDown={(e) => handleStartItemDrag(e, item, 'bottom-left')}
        />
        <div
          style={{ ...handleStyle, bottom: '-4px', left: 'calc(50% - 3.5px)', cursor: 'ns-resize' }}
          onPointerDown={(e) => handleStartItemDrag(e, item, 'bottom-center')}
        />
        <div
          style={{ ...handleStyle, bottom: '-4px', right: '-4px', cursor: 'nwse-resize' }}
          onPointerDown={(e) => handleStartItemDrag(e, item, 'bottom-right')}
        />
      </>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {/* Top Horizontal Ruler */}
      <div style={{ display: 'flex' }}>
        <div style={{ width: '20px', height: '20px', backgroundColor: 'var(--colorNeutralBackground1)', borderRight: '1px solid var(--colorNeutralStroke2)', borderBottom: '1px solid var(--colorNeutralStroke2)' }} />
        <HorizontalRuler widthMm={widthMm} zoomLevel={zoomLevel} mouseXmm={mouseMm?.xMm} />
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Vertical Ruler */}
        <VerticalRuler heightMm={heightMm} zoomLevel={zoomLevel} mouseYmm={mouseMm?.yMm} />

        {/* Canvas Container */}
        <div
          className="idml-canvas-container"
          ref={containerRef}
          style={{ cursor: getCursorStyle(), flex: 1 }}
          onPointerDown={handlePointerDownContainer}
          onPointerMove={handlePointerMoveContainer}
          onPointerUp={handlePointerUpContainer}
          onPointerCancel={handlePointerUpContainer}
        >
          <div
            className="idml-spread-wrapper"
            style={{
              width: `${widthPx}px`,
              height: `${heightPx}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
            }}
          >
            {/* Margin Guide Lines */}
            <div
              style={{
                position: 'absolute',
                top: `${doc.preferences.margin.top * 3.78}px`,
                bottom: `${doc.preferences.margin.bottom * 3.78}px`,
                left: `${doc.preferences.margin.left * 3.78}px`,
                right: `${doc.preferences.margin.right * 3.78}px`,
                border: '1px dashed var(--idml-guide-margin)',
                pointerEvents: 'none',
              }}
            />

            {/* Page Items */}
            {spread.pageItems.map((item: IdmlPageItem) => {
              const isSelected = item.id === selectedItemId
              const left = item.geometricBounds.left * 3.78
              const top = item.geometricBounds.top * 3.78
              const width = Math.max(20, Math.abs(item.geometricBounds.right - item.geometricBounds.left) * 3.78)
              const height = Math.max(20, Math.abs(item.geometricBounds.bottom - item.geometricBounds.top) * 3.78)

              if (item.itemType === 'TextFrame') {
                const story = doc.stories[item.parentStoryId]
                const textContent = story ? story.rawText : ''

                return (
                  <div
                    key={item.id}
                    className={`idml-page-item text-frame ${isSelected ? 'selected' : ''}`}
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                    }}
                    onPointerDown={(e) => handleStartItemDrag(e, item)}
                  >
                    {isSelected && renderHandles(item)}

                    <div
                      contentEditable={activeTool === 'type' || activeTool === 'selection'}
                      suppressContentEditableWarning
                      style={{
                        width: '100%',
                        height: '100%',
                        padding: '6px',
                        outline: 'none',
                        fontSize: '13px',
                        fontFamily: 'Segoe UI, sans-serif',
                        userSelect: 'text',
                        wordBreak: 'break-word',
                        lineHeight: '1.4',
                      }}
                      onBlur={(e) => {
                        if (story) {
                          onStoryTextChange(story.id, e.currentTarget.innerText || '')
                        }
                      }}
                    >
                      {textContent || 'Type your text frame content...'}
                    </div>

                    {item.isOverset && (
                      <div
                        className="idml-overset-badge"
                        title="Overset Text! Click to auto-fit with AI Copilot"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenAiFitModal?.(item.parentStoryId, item.id)
                        }}
                      >
                        +
                      </div>
                    )}
                  </div>
                )
              }

              if (item.itemType === 'GraphicFrame') {
                return (
                  <div
                    key={item.id}
                    className={`idml-page-item graphic-frame ${isSelected ? 'selected' : ''}`}
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                      position: 'absolute',
                    }}
                    onPointerDown={(e) => handleStartItemDrag(e, item)}
                  >
                    {isSelected && renderHandles(item)}

                    {/* Diagonal Cross-Hatch Lines */}
                    <svg
                      width="100%"
                      height="100%"
                      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
                    >
                      <line x1="0" y1="0" x2="100%" y2="100%" stroke="#d2d2d2" strokeWidth="1" />
                      <line x1="100%" y1="0" x2="0" y2="100%" stroke="#d2d2d2" strokeWidth="1" />
                    </svg>

                    <div
                      style={{
                        zIndex: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        padding: '3px 8px',
                        borderRadius: '3px',
                        border: '1px solid #e0e0e0',
                        fontSize: '11px',
                        color: '#555',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      }}
                    >
                      <span>📷</span>
                      <span>{item.imageFileName || 'Graphic Frame'}</span>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={item.id}
                  className={`idml-page-item ${isSelected ? 'selected' : ''}`}
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    backgroundColor: item.fillColor || 'transparent',
                    border: `${item.strokeWeight || 1}px solid ${item.strokeColor || '#ccc'}`,
                  }}
                  onPointerDown={(e) => handleStartItemDrag(e, item)}
                >
                  {isSelected && renderHandles(item)}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
