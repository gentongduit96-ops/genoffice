import { useState, useMemo } from 'react'
import type { Editor } from '@tiptap/core'
import { useI18n } from '../i18n/locale'
import { useModalKeys } from './modal-keys'
import { parsePrintRange } from '../print-range'
import {
  ANALYSIS_PRESETS,
  extractDocumentPages,
  type AnalysisPreset,
} from '../services/page-analyzer'

export interface PageAnalysisModalProps {
  editor: Editor
  pageInfo?: { current: number; total: number }
  onClose: () => void
  onStart: (options: {
    selectedPageIndices: number[]
    userPrompt: string
    includeSuggestions: boolean
  }) => void
}

type RangeMode = 'current' | 'all' | 'custom'

export function PageAnalysisModal({
  editor,
  pageInfo,
  onClose,
  onStart,
}: PageAnalysisModalProps) {
  const { t } = useI18n()
  const modalKeys = useModalKeys(onClose)

  // Compute total pages & current page
  const totalHint = pageInfo?.total && pageInfo.total > 0 ? pageInfo.total : undefined
  const pages = useMemo(() => extractDocumentPages(editor, totalHint), [editor, totalHint])
  const totalPages = Math.max(1, pageInfo?.total || pages.length)

  // Estimate current page by pageInfo or selection
  const currentPageIdx = useMemo(() => {
    if (pageInfo && pageInfo.current > 0) {
      return Math.max(0, Math.min(pageInfo.current - 1, totalPages - 1))
    }
    const selPos = editor.state.selection.from
    const foundIdx = pages.findIndex(
      (p) => selPos >= p.startPos && selPos <= p.endPos,
    )
    return foundIdx >= 0 ? foundIdx : 0
  }, [editor, pages, pageInfo, totalPages])

  const [rangeMode, setRangeMode] = useState<RangeMode>('all')
  const [customRange, setCustomRange] = useState('')

  const [selectedPresetId, setSelectedPresetId] = useState<string>('turats_arabic')
  const [promptText, setPromptText] = useState<string>(
    ANALYSIS_PRESETS[0]?.prompt || '',
  )
  const [includeSuggestions, setIncludeSuggestions] = useState(true)

  // Handle selecting preset
  const handleSelectPreset = (preset: AnalysisPreset) => {
    setSelectedPresetId(preset.id)
    setPromptText(preset.prompt)
  }

  // Calculate selected page indices
  const selectedPageIndices: number[] | null = useMemo(() => {
    if (rangeMode === 'current') {
      return [currentPageIdx]
    }
    if (rangeMode === 'all') {
      return Array.from({ length: totalPages }, (_, i) => i)
    }
    if (rangeMode === 'custom') {
      return parsePrintRange(customRange, totalPages)
    }
    return null
  }, [rangeMode, currentPageIdx, totalPages, customRange])

  const isCustomRangeInvalid = rangeMode === 'custom' && selectedPageIndices === null
  const canStart =
    selectedPageIndices !== null &&
    selectedPageIndices.length > 0 &&
    promptText.trim().length > 0

  const handleStart = () => {
    if (!canStart || !selectedPageIndices) return
    onStart({
      selectedPageIndices,
      userPrompt: promptText.trim(),
      includeSuggestions,
    })
    onClose()
  }

  return (
    <div
      className="modal-backdrop"
      ref={modalKeys.ref}
      onKeyDown={modalKeys.onKeyDown}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{ zIndex: 1050 }}
    >
      <div className="page-analysis-modal">
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>✨</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#fff' }}>
                {t('pageAnalysisTitle') || 'Analisis Halaman dengan AI'}
              </h2>
              <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '2px' }}>
                {t('pageAnalysisSubtitle') ||
                  'AI membaca dokumen halaman demi halaman, memblok kalimat terkait, dan menyematkan komentar revisi.'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: 'rgba(255, 255, 255, 0.7)',
              padding: '6px 10px',
              borderRadius: '4px',
            }}
            title={t('appCloseEsc') || 'Tutup'}
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            paddingRight: '4px',
          }}
        >
          {/* Section 1: Page Range Selection */}
          <div className="fluent-card-section">
            <div
              style={{
                fontWeight: 600,
                fontSize: '13px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#58a6ff',
              }}
            >
              <span>📄</span>
              <span>{t('pageAnalysisRangeLabel') || '1. Rentang Halaman'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="fluent-radio-label">
                <input
                  type="radio"
                  name="pageRange"
                  checked={rangeMode === 'current'}
                  onChange={() => setRangeMode('current')}
                />
                <span>
                  {t('pageAnalysisRangeCurrent') || 'Halaman Saat Ini'} (Hal. {currentPageIdx + 1})
                </span>
              </label>

              <label className="fluent-radio-label">
                <input
                  type="radio"
                  name="pageRange"
                  checked={rangeMode === 'all'}
                  onChange={() => setRangeMode('all')}
                />
                <span>
                  {t('pageAnalysisRangeAll') || 'Semua Halaman'} ({t('appPrintPageCount', { n: totalPages }) || `${totalPages} Halaman`})
                </span>
              </label>

              <label className="fluent-radio-label">
                <input
                  type="radio"
                  name="pageRange"
                  checked={rangeMode === 'custom'}
                  onChange={() => setRangeMode('custom')}
                />
                <span style={{ minWidth: '110px' }}>
                  {t('pageAnalysisRangeCustom') || 'Kustom Rentang'}:
                </span>
                <input
                  type="text"
                  placeholder="Contoh: 1-3, 5"
                  value={customRange}
                  disabled={rangeMode !== 'custom'}
                  onChange={(e) => setCustomRange(e.target.value)}
                  className="fluent-custom-range-input"
                  style={{
                    borderColor: isCustomRangeInvalid ? '#e74c3c' : undefined,
                  }}
                />
                {isCustomRangeInvalid && (
                  <span style={{ color: '#ff6b6b', fontSize: '11.5px', marginLeft: '8px' }}>
                    {t('pageAnalysisRangeInvalid') || 'Format rentang tidak valid (maks hal. ' + totalPages + ')'}
                  </span>
                )}
              </label>
            </div>
          </div>

          {/* Section 2: Preset Gallery & Prompt Editor */}
          <div className="fluent-card-section">
            <div
              style={{
                fontWeight: 600,
                fontSize: '13px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#58a6ff',
              }}
            >
              <span>🎯</span>
              <span>{t('pageAnalysisPresetLabel') || '2. Galeri Preset & Prompt Analisis'}</span>
            </div>

            {/* Presets Grid */}
            <div className="fluent-preset-grid" style={{ marginBottom: '10px' }}>
              {ANALYSIS_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`fluent-preset-btn ${isSelected ? 'active' : ''}`}
                  >
                    <span style={{ fontSize: '16px', marginTop: '1px' }}>{preset.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? '#58a6ff' : '#fff',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {preset.title}
                      </div>
                      <div
                        style={{
                          fontSize: '10.5px',
                          opacity: 0.65,
                          lineHeight: '1.3',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          marginTop: '2px',
                        }}
                      >
                        {preset.description}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Prompt Textarea */}
            <div>
              <div
                style={{
                  fontSize: '11.5px',
                  opacity: 0.75,
                  marginBottom: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>{t('pageAnalysisPromptEditLabel') || 'Instruksi Analisis (Dapat disesuaikan):'}</span>
                <span style={{ opacity: 0.6 }}>{promptText.length} karakter</span>
              </div>
              <textarea
                rows={5}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder={t('pageAnalysisPromptPlaceholder') || 'Ketik instruksi analisis...'}
                className="fluent-prompt-textarea"
              />
            </div>
          </div>

          {/* Section 3: Output Options */}
          <div className="fluent-card-section" style={{ padding: '10px 16px' }}>
            <label className="fluent-radio-label">
              <input
                type="checkbox"
                checked={includeSuggestions}
                onChange={(e) => setIncludeSuggestions(e.target.checked)}
              />
              <span>
                {t('pageAnalysisIncludeSuggestions') ||
                  'Sertakan Usulan Teks Pengganti (Suggested Edits) di dalam balon komentar'}
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '14px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            {selectedPageIndices ? (
              <span>
                ✨ <strong>{selectedPageIndices.length}</strong> {t('appPrintPageCount', { n: selectedPageIndices.length }) || 'halaman'} akan dianalisis secara berurutan.
              </span>
            ) : (
              <span style={{ color: '#ff6b6b' }}>
                {t('pageAnalysisNoPagesSelected') || 'Pilih minimal satu halaman.'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="fluent-modal-footer-btn fluent-btn-cancel"
              onClick={onClose}
            >
              Batal
            </button>
            <button
              type="button"
              className="fluent-modal-footer-btn fluent-btn-submit"
              disabled={!canStart}
              onClick={handleStart}
            >
              <span>🚀</span>
              <span>{t('pageAnalysisStart') || 'Mulai Analisis'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
