import React, { useEffect, useRef, useState } from 'react'
import {
  parseIdml,
  runPreflightCheck,
  serializeIdml,
  type IdmlDocument,
  type IdmlGraphicFrameItem,
  type IdmlPageItem,
} from '@genoffice/idml-engine'
import { SpreadCanvas } from './components/canvas/SpreadCanvas'
import { ControlBar } from './components/workspace/ControlBar'
import { StatusBar } from './components/workspace/StatusBar'
import { Toolbox, type IdmlTool } from './components/workspace/Toolbox'

import { AiDesignPanel } from './components/ai/AiDesignPanel'
import { LayersPanel } from './components/panels/LayersPanel'
import { LinksPanel } from './components/panels/LinksPanel'
import { PagesPanel } from './components/panels/PagesPanel'
import { StylesPanel } from './components/panels/StylesPanel'
import { SwatchesPanel } from './components/panels/SwatchesPanel'

import type { IdmlApi } from '../shared/ipc'

declare global {
  interface Window {
    idmlApi?: IdmlApi
  }
}

export const App: React.FC = () => {
  const [doc, setDoc] = useState<IdmlDocument | null>(null)
  const [filePath, setFilePath] = useState<string | undefined>()
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | undefined>()
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(1)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [activeTool, setActiveTool] = useState<IdmlTool>('selection')
  const [selectedItem, setSelectedItem] = useState<IdmlPageItem | undefined>()
  const [activeDockTab, setActiveDockTab] = useState<'pages' | 'layers' | 'styles' | 'swatches' | 'links' | 'ai'>('pages')
  const [fontFamily, setFontFamily] = useState('Segoe UI')
  const [fontSize, setFontSize] = useState(12)
  const [isDirty, setIsDirty] = useState(false)
  const [relinkingTargetItem, setRelinkingTargetItem] = useState<IdmlPageItem | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load document on mount
  useEffect(() => {
    const api = window.idmlApi
    if (!api) {
      loadSampleDocument()
      return
    }

    api.consumePendingPath().then((path) => {
      if (path) {
        setFilePath(path)
        api.readFile(path).then((buffer) => {
          setOriginalBuffer(buffer)
          parseIdml(buffer, path).then(setDoc).catch(console.error)
        })
      } else {
        loadSampleDocument()
      }
    })

    // Subscribe to IPC save request
    const unsubSave = api.onSaveRequested(async () => {
      await saveDocument()
    })

    return () => {
      unsubSave()
    }
  }, [doc, filePath, originalBuffer])

  // Global Keyboard Shortcuts (Ctrl+S, Ctrl+O, Ctrl+0, Zoom, etc)
  useEffect(() => {
    const onKeyDown = async (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey

      if (isCtrlOrCmd && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (e.shiftKey) {
          await saveAsDocument()
        } else {
          await saveDocument()
        }
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        await handleOpenDocument()
      } else if (isCtrlOrCmd && e.key === '0') {
        e.preventDefault()
        setZoomLevel(100)
      } else if (isCtrlOrCmd && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        setZoomLevel((prev) => Math.min(400, prev + 25))
      } else if (isCtrlOrCmd && e.key === '-') {
        e.preventDefault()
        setZoomLevel((prev) => Math.max(25, prev - 25))
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [doc, filePath, originalBuffer])

  const loadSampleDocument = () => {
    const sampleDoc: IdmlDocument = {
      manifest: { spreadCount: 2, storyCount: 2 },
      preferences: {
        pageHeight: 297,
        pageWidth: 210,
        facingPages: true,
        margin: { top: 20, bottom: 20, left: 20, right: 20 },
        bleed: 3,
        slug: 0,
        measurementUnit: 'Millimeters',
      },
      colors: {
        Black: { id: 'Black', name: 'Black', colorSpace: 'RGB', colorValue: [0, 0, 0], hex: '#000000' },
        Magenta: { id: 'Magenta', name: 'InDesign Magenta', colorSpace: 'RGB', colorValue: [214, 40, 93], hex: '#d6285d' },
      },
      paragraphStyles: {
        Header: { id: 'Header', name: 'Header 1', fontSize: 24, fillColor: 'Magenta' },
        Body: { id: 'Body', name: 'Body Text', fontSize: 12, fillColor: 'Black' },
      },
      characterStyles: {},
      stories: {
        st1: {
          id: 'st1',
          rawText: 'GenOffice InDesign Editor (IDML)',
          paragraphRanges: [],
        },
        st2: {
          id: 'st2',
          rawText:
            'This is an InDesign story layout text frame inside GenOffice. High fidelity visual rendering with AI Design Copilot capability for smart copy fit-to-frame and auto-formatting.',
          paragraphRanges: [],
        },
      },
      spreads: [
        {
          id: 's1',
          pages: [{ id: 'p1', name: '1', bounds: { top: 0, left: 0, bottom: 297, right: 210 } }],
          pageItems: [
            {
              id: 'tf1',
              itemType: 'TextFrame',
              parentStoryId: 'st1',
              transformMatrix: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 },
              geometricBounds: { top: 30, left: 25, bottom: 60, right: 185 },
            },
            {
              id: 'tf2',
              itemType: 'TextFrame',
              parentStoryId: 'st2',
              transformMatrix: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 },
              geometricBounds: { top: 75, left: 25, bottom: 150, right: 185 },
            },
            {
              id: 'gf1',
              itemType: 'GraphicFrame',
              imageFileName: 'cover-design.png',
              transformMatrix: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 },
              geometricBounds: { top: 165, left: 25, bottom: 260, right: 185 },
            },
          ],
        },
        {
          id: 's2',
          pages: [{ id: 'p2', name: '2', bounds: { top: 0, left: 0, bottom: 297, right: 210 } }],
          pageItems: [],
        },
      ],
      masterSpreads: [],
      links: [
        {
          id: 'l1',
          fileName: 'cover-design.png',
          filePath: 'Links/cover-design.png',
          assetMissing: false,
        },
      ],
    }

    runPreflightCheck(sampleDoc)
    setDoc(sampleDoc)
  }

  const handleOpenDocument = async () => {
    const api = window.idmlApi
    if (!api) return
    const res = await api.openFileDialog()
    if (!res) return

    setFilePath(res.filePath)
    setOriginalBuffer(res.arrayBuffer)
    try {
      const parsed = await parseIdml(res.arrayBuffer, res.filePath)
      setDoc(parsed)
      setIsDirty(false)
      api.setDirty(false)
      setSelectedItem(undefined)
      setCurrentSpreadIndex(1)
    } catch (err) {
      alert(`Gagal membuka file IDML: ${(err as Error).message}`)
    }
  }

  const saveDocument = async () => {
    if (!doc) return
    const api = window.idmlApi
    if (!api) return
    try {
      const serializedBuf = await serializeIdml(doc, originalBuffer)
      const result = await api.save({ filePath, arrayBuffer: serializedBuf })
      if (result.success) {
        setIsDirty(false)
        api.setDirty(false)
        if (result.filePath) setFilePath(result.filePath)
      }
      api.sendSaveAck(result)
    } catch (err) {
      api.sendSaveAck({ success: false, error: (err as Error).message })
    }
  }

  const saveAsDocument = async () => {
    if (!doc) return
    const api = window.idmlApi
    if (!api) return
    try {
      const serializedBuf = await serializeIdml(doc, originalBuffer)
      // Pass undefined filePath to trigger Save As Dialog
      const result = await api.save({ filePath: undefined, arrayBuffer: serializedBuf })
      if (result.success) {
        setIsDirty(false)
        api.setDirty(false)
        if (result.filePath) setFilePath(result.filePath)
      }
    } catch (err) {
      alert(`Gagal menyimpan file IDML: ${(err as Error).message}`)
    }
  }

  const handleStoryTextChange = (storyId: string, newText: string) => {
    if (!doc) return
    const updatedStories = { ...doc.stories }
    if (updatedStories[storyId]) {
      updatedStories[storyId] = {
        ...updatedStories[storyId],
        rawText: newText,
        isDirty: true,
      }
      const updatedDoc = { ...doc, stories: updatedStories }
      runPreflightCheck(updatedDoc)
      setDoc(updatedDoc)

      setIsDirty(true)
      window.idmlApi?.setDirty(true)
    }
  }

  const handleStartRelink = (item: IdmlPageItem) => {
    setRelinkingTargetItem(item)
    fileInputRef.current?.click()
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !doc || !relinkingTargetItem) return

    const updatedSpreads = doc.spreads.map((spread) => {
      const updatedItems = spread.pageItems.map((item) => {
        if (item.id === relinkingTargetItem.id && item.itemType === 'GraphicFrame') {
          const graphicItem = item as IdmlGraphicFrameItem
          return {
            ...graphicItem,
            imageFileName: file.name,
            assetMissing: false,
          }
        }
        return item
      })
      return { ...spread, pageItems: updatedItems }
    })

    const updatedDoc = { ...doc, spreads: updatedSpreads }
    runPreflightCheck(updatedDoc)
    setDoc(updatedDoc)
    setIsDirty(true)
    window.idmlApi?.setDirty(true)
    setRelinkingTargetItem(null)

    // Reset file input
    e.target.value = ''
  }

  if (!doc) {
    return <div style={{ padding: '20px' }}>Loading InDesign document...</div>
  }

  const currentSpread = doc.spreads[currentSpreadIndex - 1] || doc.spreads[0]
  const preflightReport = runPreflightCheck(doc)

  return (
    <div className="idml-workspace">
      {/* Hidden File Input for Image Relinking */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      <ControlBar
        selectedItem={selectedItem}
        filePath={filePath}
        isDirty={isDirty}
        fontFamily={fontFamily}
        fontSize={fontSize}
        onOpenDocument={handleOpenDocument}
        onSaveDocument={saveDocument}
        onSaveAsDocument={saveAsDocument}
        onFontFamilyChange={setFontFamily}
        onFontSizeChange={setFontSize}
      />

      <div className="idml-body">
        <Toolbox activeTool={activeTool} onSelectTool={setActiveTool} />

        <SpreadCanvas
          doc={doc}
          spread={currentSpread}
          zoomLevel={zoomLevel}
          activeTool={activeTool}
          selectedItemId={selectedItem?.id}
          onSelectItem={setSelectedItem}
          onStoryTextChange={handleStoryTextChange}
          onZoomChange={setZoomLevel}
          onOpenAiFitModal={() => setActiveDockTab('ai')}
        />

        <div className="idml-dock">
          <div className="idml-dock-header">
            <button
              className={`idml-tab-btn ${activeDockTab === 'pages' ? 'active' : ''}`}
              onClick={() => setActiveDockTab('pages')}
            >
              Pages
            </button>
            <button
              className={`idml-tab-btn ${activeDockTab === 'layers' ? 'active' : ''}`}
              onClick={() => setActiveDockTab('layers')}
            >
              Layers
            </button>
            <button
              className={`idml-tab-btn ${activeDockTab === 'styles' ? 'active' : ''}`}
              onClick={() => setActiveDockTab('styles')}
            >
              Styles
            </button>
            <button
              className={`idml-tab-btn ${activeDockTab === 'swatches' ? 'active' : ''}`}
              onClick={() => setActiveDockTab('swatches')}
            >
              Swatches
            </button>
            <button
              className={`idml-tab-btn ${activeDockTab === 'links' ? 'active' : ''}`}
              onClick={() => setActiveDockTab('links')}
            >
              Links
            </button>
            <button
              className={`idml-tab-btn ${activeDockTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveDockTab('ai')}
            >
              ✨ AI
            </button>
          </div>

          <div className="idml-dock-content">
            {activeDockTab === 'pages' && (
              <PagesPanel
                spreads={doc.spreads}
                currentSpread={currentSpreadIndex}
                onSelectSpread={setCurrentSpreadIndex}
              />
            )}
            {activeDockTab === 'layers' && <LayersPanel doc={doc} />}
            {activeDockTab === 'styles' && (
              <StylesPanel
                paragraphStyles={doc.paragraphStyles}
                characterStyles={doc.characterStyles}
              />
            )}
            {activeDockTab === 'swatches' && <SwatchesPanel colors={doc.colors} />}
            {activeDockTab === 'links' && (
              <LinksPanel doc={doc} onRelinkImage={handleStartRelink} />
            )}
            {activeDockTab === 'ai' && (
              <AiDesignPanel
                doc={doc}
                selectedItem={selectedItem}
                onApplyText={handleStoryTextChange}
              />
            )}
          </div>
        </div>
      </div>

      <StatusBar
        currentSpread={currentSpreadIndex}
        totalSpreads={doc.spreads.length}
        zoomLevel={zoomLevel}
        hasOverset={preflightReport.oversetIssues.length > 0}
        onSpreadChange={setCurrentSpreadIndex}
        onZoomChange={setZoomLevel}
      />
    </div>
  )
}
