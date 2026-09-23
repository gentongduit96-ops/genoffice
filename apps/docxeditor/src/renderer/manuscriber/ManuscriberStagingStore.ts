import { useState, useEffect } from 'react'

export type VerificationStatus = 'unverified' | 'verified' | 'flagged' | 'edited'
export type BlockType = 'matan' | 'syarah' | 'hasyiah' | 'margin' | 'nadzom' | 'heading'

export interface StagingLine {
  id: string
  lineNumber: number
  rawText: string
  correctedText: string
  bbox?: [number, number, number, number] // [x, y, width, height]
  confidenceScore: number
  status: VerificationStatus
  blockType?: BlockType
  columnIndex?: number
  candidates?: string[]
  auditNotes?: string
}

export interface StagingHistorySession {
  id: string
  timestamp: number
  pageNo: number
  title: string
  totalBlocks: number
  verifiedCount: number
  lines: StagingLine[]
}

export interface ManuscriberStagingState {
  isOpen: boolean
  isFocusMode: boolean
  isRecordingVoice: boolean
  activeLineId: string | null
  pageNo: number
  lines: StagingLine[]
  history: StagingHistorySession[]
  ghostOverlayOpacity: number
  magnifierActive: boolean
  activeLanguage: 'ar' | 'id'
}

type Listener = (state: ManuscriberStagingState) => void

const LOCAL_STORAGE_KEY = 'manuscriber_staging_backup'
const LOCAL_STORAGE_HISTORY_KEY = 'manuscriber_staging_history'

class ManuscriberStagingStoreClass {
  private state: ManuscriberStagingState = {
    isOpen: false,
    isFocusMode: false,
    isRecordingVoice: false,
    activeLineId: null,
    pageNo: 1,
    lines: [],
    history: [],
    ghostOverlayOpacity: 0.2,
    magnifierActive: false,
    activeLanguage: 'ar',
  }

  private listeners: Set<Listener> = new Set()

  constructor() {
    this.tryRestoreLocalBackup()
  }

  public getState(): ManuscriberStagingState {
    return this.state
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private setState(partial: Partial<ManuscriberStagingState>): void {
    this.state = { ...this.state, ...partial }
    this.listeners.forEach((listener: Listener) => listener(this.state))
    this.persistLocalBackup()
  }

  private persistLocalBackup(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (this.state.lines.length > 0) {
          window.localStorage.setItem(
            LOCAL_STORAGE_KEY,
            JSON.stringify({
              pageNo: this.state.pageNo,
              activeLineId: this.state.activeLineId,
              lines: this.state.lines,
              isOpen: this.state.isOpen,
              isFocusMode: this.state.isFocusMode,
            })
          )
        }
        if (this.state.history.length > 0) {
          window.localStorage.setItem(
            LOCAL_STORAGE_HISTORY_KEY,
            JSON.stringify(this.state.history)
          )
        }
      }
    } catch {}
  }

  private tryRestoreLocalBackup(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
        let restoredLines: StagingLine[] = []
        let restoredPage = 1
        let restoredActiveId: string | null = null
        let restoredIsOpen = false
        let restoredIsFocusMode = false

        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed && Array.isArray(parsed.lines) && parsed.lines.length > 0) {
            restoredLines = parsed.lines
            restoredActiveId = parsed.activeLineId || parsed.lines[0]?.id || null
            restoredPage = parsed.pageNo || 1
            restoredIsOpen = false // Keep staging closed on launch so blank Word canvas shows by default
            restoredIsFocusMode = false
          }
        }

        const rawHistory = window.localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY)
        let restoredHistory: StagingHistorySession[] = []
        if (rawHistory) {
          const parsedHistory = JSON.parse(rawHistory)
          if (Array.isArray(parsedHistory)) {
            restoredHistory = parsedHistory
          }
        }

        this.state = {
          ...this.state,
          lines: restoredLines,
          activeLineId: restoredActiveId,
          pageNo: restoredPage,
          isOpen: restoredIsOpen,
          isFocusMode: restoredIsFocusMode,
          history: restoredHistory,
        }
      }
    } catch {}
  }

  public setIsOpen(isOpen: boolean): void {
    this.setState({ isOpen })
  }

  public setIsFocusMode(isFocusMode: boolean): void {
    this.setState({ isFocusMode })
  }

  public toggleFocusMode(): void {
    const nextMode = !this.state.isFocusMode
    const nextActiveId =
      nextMode && !this.state.activeLineId && this.state.lines.length > 0
        ? this.state.lines[0].id
        : this.state.activeLineId
    this.setState({ isFocusMode: nextMode, activeLineId: nextActiveId })
  }

  public setPageNo(pageNo: number): void {
    this.setState({ pageNo })
  }

  public setLines(lines: StagingLine[], pageNo = 1): void {
    const firstLineId = lines.length > 0 ? lines[0].id : null
    this.setState({ lines, activeLineId: firstLineId, pageNo, isOpen: lines.length > 0, isFocusMode: false })
    this.saveCurrentToHistory(`Scan Halaman ${pageNo}`)
  }

  public setActiveLineId(id: string | null, openFocus = false): void {
    this.setState({
      activeLineId: id,
      isFocusMode: openFocus && id !== null ? true : this.state.isFocusMode,
    })
  }

  public updateLineText(id: string, newText: string): void {
    const updatedLines = this.state.lines.map((line: StagingLine) => {
      if (line.id === id) {
        const isTextSame = line.rawText === newText
        const nextStatus: VerificationStatus = isTextSame && line.status === 'edited' ? 'unverified' : 'edited'
        const statusVal: VerificationStatus = line.status === 'verified' ? 'verified' : nextStatus
        return {
          ...line,
          correctedText: newText,
          status: statusVal,
        }
      }
      return line
    })
    this.setState({ lines: updatedLines })
  }

  public setLineStatus(id: string, status: VerificationStatus): void {
    const updatedLines = this.state.lines.map((line: StagingLine) =>
      line.id === id ? { ...line, status } : line
    )
    this.setState({ lines: updatedLines })
  }

  public nextPointer(): void {
    const { lines, activeLineId } = this.state
    if (lines.length === 0) return
    if (!activeLineId) {
      this.setState({ activeLineId: lines[0].id })
      return
    }
    const idx = lines.findIndex((l: StagingLine) => l.id === activeLineId)
    if (idx >= 0 && idx < lines.length - 1) {
      this.setState({ activeLineId: lines[idx + 1].id })
    }
  }

  public prevPointer(): void {
    const { lines, activeLineId } = this.state
    if (lines.length === 0) return
    if (!activeLineId) {
      this.setState({ activeLineId: lines[0].id })
      return
    }
    const idx = lines.findIndex((l: StagingLine) => l.id === activeLineId)
    if (idx > 0) {
      this.setState({ activeLineId: lines[idx - 1].id })
    }
  }

  public batchApproveAll(): void {
    const updatedLines = this.state.lines.map((line: StagingLine) => ({
      ...line,
      status: 'verified' as VerificationStatus,
    }))
    this.setState({ lines: updatedLines })
  }

  public hasUnsavedChanges(): boolean {
    if (this.state.lines.length === 0) return false
    return this.state.lines.some((l: StagingLine) => l.status !== 'verified')
  }

  public saveCurrentToHistory(customTitle?: string): void {
    if (this.state.lines.length === 0) return
    const verified = this.state.lines.filter((l) => l.status === 'verified').length
    const newSession: StagingHistorySession = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      pageNo: this.state.pageNo,
      title: customTitle || `Revisi Halaman ${this.state.pageNo}`,
      totalBlocks: this.state.lines.length,
      verifiedCount: verified,
      lines: JSON.parse(JSON.stringify(this.state.lines)),
    }

    // Keep up to 20 historical sessions
    const updatedHistory = [newSession, ...this.state.history.filter((s) => s.pageNo !== newSession.pageNo || s.timestamp !== newSession.timestamp)].slice(0, 20)
    this.setState({ history: updatedHistory })
  }

  public loadHistorySession(sessionId: string): void {
    const found = this.state.history.find((s) => s.id === sessionId)
    if (!found) return
    this.setState({
      lines: JSON.parse(JSON.stringify(found.lines)),
      pageNo: found.pageNo,
      activeLineId: found.lines[0]?.id || null,
      isOpen: true,
    })
  }

  public deleteHistorySession(sessionId: string): void {
    const updatedHistory = this.state.history.filter((s) => s.id !== sessionId)
    this.setState({ history: updatedHistory })
  }

  public setIsRecordingVoice(isRecordingVoice: boolean): void {
    this.setState({ isRecordingVoice })
  }

  public setGhostOverlayOpacity(ghostOverlayOpacity: number): void {
    this.setState({ ghostOverlayOpacity })
  }

  public setMagnifierActive(magnifierActive: boolean): void {
    this.setState({ magnifierActive })
  }

  public resetStaging(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY)
      }
    } catch {}
    this.setState({
      isOpen: false,
      isRecordingVoice: false,
      activeLineId: null,
      pageNo: 1,
      lines: [],
      magnifierActive: false,
    })
  }

  public toSerializableState(): {
    isOpen: boolean
    activeLineId: string | null
    pageNo: number
    lines: StagingLine[]
    history: StagingHistorySession[]
  } {
    return {
      isOpen: this.state.isOpen,
      activeLineId: this.state.activeLineId,
      pageNo: this.state.pageNo,
      lines: this.state.lines,
      history: this.state.history,
    }
  }

  public restoreFromState(data?: {
    isOpen?: boolean
    activeLineId?: string | null
    pageNo?: number
    lines?: StagingLine[]
    history?: StagingHistorySession[]
  }): void {
    if (!data) return
    const lines = data.lines || []
    this.setState({
      lines,
      activeLineId: data.activeLineId || (lines[0]?.id ?? null),
      pageNo: data.pageNo || 1,
      isOpen: data.isOpen ?? (lines.length > 0),
      history: data.history || this.state.history,
    })
  }
}

export const manuscriberStagingStore = new ManuscriberStagingStoreClass()

export function useManuscriberStagingStore(): ManuscriberStagingState {
  const [state, setState] = useState<ManuscriberStagingState>(manuscriberStagingStore.getState())

  useEffect(() => {
    const unsubscribe = manuscriberStagingStore.subscribe((newState: ManuscriberStagingState) => {
      setState(newState)
    })
    return () => unsubscribe()
  }, [])

  return state
}

