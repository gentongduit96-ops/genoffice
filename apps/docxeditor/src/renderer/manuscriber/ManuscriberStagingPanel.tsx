import React, { useState, useEffect } from 'react'
import {
  useManuscriberStagingStore,
  manuscriberStagingStore,
  StagingLine,
  StagingHistorySession,
} from './ManuscriberStagingStore'
import { StagingLineItem } from './StagingLineItem'
import {
  IconStagingAudit,
  IconFlash,
  IconCheck,
  IconClose,
  IconChevronUp,
  IconChevronDown,
  IconList,
  IconRefresh,
  IconTrash,
} from '../components/icons'

interface ManuscriberStagingPanelProps {
  onCommitToDocx: (lines: StagingLine[]) => void
  onClose?: () => void
}

export const ManuscriberStagingPanel: React.FC<ManuscriberStagingPanelProps> = ({
  onCommitToDocx,
  onClose,
}) => {
  const { lines, activeLineId, isFocusMode, history } = useManuscriberStagingStore()
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false)

  // Global Escape key listener to exit Focus Mode
  useEffect(() => {
    if (!isFocusMode) return
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        manuscriberStagingStore.setIsFocusMode(false)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isFocusMode])

  const verifiedCount = lines.filter((l: StagingLine) => l.status === 'verified').length
  const totalLines = lines.length
  const progressPercent = totalLines > 0 ? Math.round((verifiedCount / totalLines) * 100) : 0

  const activeIndex = lines.findIndex((l: StagingLine) => l.id === activeLineId)
  const activeLine = activeIndex >= 0 ? lines[activeIndex] : (lines[0] || null)

  return (
    <div className="manuscriber-staging-panel-container" dir="ltr">
      {/* Unified Top Header Bar */}
      <div className="staging-header-bar" dir="ltr">
        {/* Left Side: Staging Badge & Progress Info */}
        <div className="staging-title-group">
          <span className="staging-badge">Staging</span>
          {isFocusMode && activeLine ? (
            <span className="staging-stats-pill active-focus-pill" title={`Sedang Memfokuskan Blok ${activeIndex + 1} dari ${totalLines}`}>
              Blok {activeIndex + 1} / {totalLines}
            </span>
          ) : (
            <span className="staging-stats-pill" title={`Terverifikasi ${verifiedCount} dari ${totalLines} Blok`}>
              {verifiedCount}/{totalLines} ({progressPercent}%)
            </span>
          )}
        </div>

        {/* Right Side: Integrated Header Actions */}
        <div className="staging-action-group" dir="ltr">
          {/* Focus Navigation Controls (Shown in Focus Mode) */}
          {isFocusMode && activeLine && (
            <div className="staging-nav-group" dir="ltr">
              <button
                type="button"
                className="btn-staging-secondary btn-staging-icon-only"
                disabled={activeIndex <= 0}
                onClick={() => manuscriberStagingStore.prevPointer()}
                title="Blok Sebelumnya (Alt+Up)"
              >
                <IconChevronUp size={16} />
              </button>
              <button
                type="button"
                className="btn-staging-secondary btn-staging-icon-only"
                disabled={activeIndex >= totalLines - 1}
                onClick={() => manuscriberStagingStore.nextPointer()}
                title="Blok Berikutnya (Alt+Down)"
              >
                <IconChevronDown size={16} />
              </button>
            </div>
          )}

          {/* Mode Switcher Button (Overview List vs Single Block Focus) */}
          <button
            type="button"
            className={`btn-staging-secondary btn-staging-icon-only ${isFocusMode ? 'active' : ''}`}
            onClick={() => manuscriberStagingStore.toggleFocusMode()}
            title={isFocusMode ? 'Tampilkan Daftar Blok / Keluar Fokus (Esc)' : 'Mode Fokus Tashih Naskah'}
          >
            <IconList size={16} />
          </button>

          {/* Audit History Drawer Toggle */}
          <button
            type="button"
            className={`btn-staging-secondary btn-staging-icon-only ${showHistoryDrawer ? 'active' : ''}`}
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            title={`Riwayat Sesi Staging (${history.length})`}
          >
            <IconStagingAudit size={16} />
            {history.length > 0 && <span className="staging-history-badge">{history.length}</span>}
          </button>

          {/* Batch Approve All */}
          <button
            type="button"
            className="btn-staging-secondary btn-staging-icon-only"
            onClick={() => manuscriberStagingStore.batchApproveAll()}
            title="Setujui Seluruh Blok (Approve All)"
          >
            <IconFlash size={16} />
          </button>

          {/* Commit & Insert to Word */}
          <button
            type="button"
            className="btn-staging-primary btn-staging-icon-only"
            onClick={() => onCommitToDocx(lines)}
            title="Commit & Masukkan ke Word (.docx)"
          >
            <IconCheck size={16} />
          </button>

          {/* Close Staging Panel Button */}
          {onClose && (
            <button
              type="button"
              className="btn-staging-close"
              onClick={() => {
                if (manuscriberStagingStore.hasUnsavedChanges()) {
                  const confirmClose = window.confirm(
                    'Terdapat blok draf staging yang belum terverifikasi. Yakin ingin menutup ruang kerja staging?'
                  )
                  if (!confirmClose) return
                }
                onClose()
              }}
              title="Tutup Panel Staging"
            >
              <IconClose size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Layout Area */}
      <div className="staging-main-body">
        {/* Staging Body View: Focus Mode vs Overview List */}
        {isFocusMode && activeLine ? (
          <div className="staging-focus-view">
            <div className="focus-line-container">
              <StagingLineItem
                key={activeLine.id}
                line={activeLine}
                isActive={true}
                onFocus={() => manuscriberStagingStore.setActiveLineId(activeLine.id, true)}
              />
            </div>
          </div>
        ) : (
          /* Staging Lines Canvas (Overview Mode) */
          <div className="staging-lines-canvas">
            {lines.length > 0 ? (
              lines.map((line: StagingLine) => (
                <StagingLineItem
                  key={line.id}
                  line={line}
                  isActive={line.id === activeLineId}
                  onFocus={() => manuscriberStagingStore.setActiveLineId(line.id, true)}
                />
              ))
            ) : (
              <div className="staging-empty-state">
                <span className="empty-icon">📜</span>
                <h4>Belum Ada Draf Staging</h4>
                <p>Jalankan <strong>Transkrip AI</strong> dari Ribbon Tab Manuscriber untuk memuat draf naskah ke area staging ini.</p>
              </div>
            )}
          </div>
        )}

        {/* Staging History Drawer */}
        {showHistoryDrawer && (
          <div className="staging-history-drawer" dir="ltr">
            <div className="history-drawer-header">
              <h4>
                <IconStagingAudit size={16} />
                <span>Riwayat Sesi Staging ({history.length})</span>
              </h4>
              <button
                type="button"
                className="close-drawer-btn"
                onClick={() => setShowHistoryDrawer(false)}
                title="Tutup Riwayat"
              >
                <IconClose size={14} />
              </button>
            </div>

            <div className="history-drawer-body">
              {history.length > 0 ? (
                history.map((sess: StagingHistorySession) => (
                  <div key={sess.id} className="history-session-card">
                    <div className="session-card-info">
                      <div className="session-title">{sess.title}</div>
                      <div className="session-meta">
                        <span>Halaman {sess.pageNo}</span> •{' '}
                        <span>{sess.totalBlocks} Blok</span> •{' '}
                        <span className="verified-ratio">
                          {sess.verifiedCount}/{sess.totalBlocks} Verified
                        </span>
                      </div>
                      <div className="session-time">
                        {new Date(sess.timestamp).toLocaleString('id-ID')}
                      </div>
                    </div>

                    <div className="session-card-actions">
                      <button
                        type="button"
                        className="btn-restore-session"
                        onClick={() => {
                          manuscriberStagingStore.loadHistorySession(sess.id)
                          setShowHistoryDrawer(false)
                        }}
                        title="Muat Ulang Sesi Staging Ini"
                      >
                        <IconRefresh size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-delete-session"
                        onClick={() => manuscriberStagingStore.deleteHistorySession(sess.id)}
                        title="Hapus Sesi dari Riwayat"
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="history-empty">Belum ada riwayat sesi staging yang tersimpan.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
