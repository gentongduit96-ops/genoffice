import React, { useRef, useEffect, useState } from 'react'
import {
  StagingLine,
  useManuscriberStagingStore,
  manuscriberStagingStore,
} from './ManuscriberStagingStore'
import { QuickFixPopover } from './QuickFixPopover'
import { voiceDictationService } from '../services/VoiceDictationService'
import { IconCheck } from '../components/icons'

interface StagingLineItemProps {
  line: StagingLine
  isActive: boolean
  onFocus: () => void
}

export const StagingLineItem: React.FC<StagingLineItemProps> = ({ line, isActive, onFocus }) => {
  const { isRecordingVoice } = useManuscriberStagingStore()
  const [popoverWord, setPopoverWord] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Dynamic textarea height adjustment to eliminate empty vertical gaps
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.max(42, textareaRef.current.scrollHeight)}px`
    }
  }, [line.correctedText])

  useEffect(() => {
    if (isActive && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    if (isActive && textareaRef.current && document.activeElement !== textareaRef.current) {
      textareaRef.current.focus({ preventScroll: true })
    }
  }, [isActive])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Alt + Down ➔ Next Line
    if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault()
      manuscriberStagingStore.nextPointer()
    }
    // Alt + Up ➔ Prev Line
    else if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault()
      manuscriberStagingStore.prevPointer()
    }
    // Ctrl + Enter ➔ Toggle Verified
    else if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault()
      const nextStatus = line.status === 'verified' ? 'unverified' : 'verified'
      manuscriberStagingStore.setLineStatus(line.id, nextStatus)
      if (nextStatus === 'verified') {
        manuscriberStagingStore.nextPointer()
      }
    }
    // Ctrl + Shift + F ➔ Flagged
    else if (e.ctrlKey && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
      e.preventDefault()
      const nextStatus = line.status === 'flagged' ? 'unverified' : 'flagged'
      manuscriberStagingStore.setLineStatus(line.id, nextStatus)
    }
    // Escape ➔ Exit Focus Mode
    else if (e.key === 'Escape') {
      e.preventDefault()
      manuscriberStagingStore.setIsFocusMode(false)
    }
  }

  const getBlockTypeBadge = () => {
    switch (line.blockType) {
      case 'matan':
        return <span className="block-type-badge matan">📖 MATAN</span>
      case 'hasyiah':
        return <span className="block-type-badge hasyiah">📜 HASYIAH</span>
      case 'nadzom':
        return <span className="block-type-badge nadzom">📜 NADZOM</span>
      case 'margin':
        return <span className="block-type-badge margin">📌 MARGIN</span>
      case 'heading':
        return <span className="block-type-badge heading">🔖 JUDUL</span>
      default:
        return <span className="block-type-badge syarah">💡 SYARAH</span>
    }
  }

  const getStatusBadge = () => {
    switch (line.status) {
      case 'verified':
        return <span className="status-badge verified">✓ Shahih (Verified)</span>
      case 'flagged':
        return <span className="status-badge flagged">⚠️ Ragu (Flagged)</span>
      case 'edited':
        return <span className="status-badge edited">✏️ Ditingkatkan (Edited)</span>
      default:
        return <span className="status-badge unverified">○ Draf AI (Unverified)</span>
    }
  }

  return (
    <div
      ref={cardRef}
      className={`staging-line-card ${isActive ? 'active-focus' : ''} status-${line.status}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).tagName !== 'TEXTAREA' && (e.target as HTMLElement).tagName !== 'BUTTON') {
          onFocus()
        }
      }}
    >
      {/* Line Header - Standard LTR Layout for Badges on Left & Actions on Right */}
      <div className="line-card-header" dir="ltr">
        <div className="line-meta" dir="ltr">
          <span className="line-number">Blok {line.lineNumber}</span>
          {getBlockTypeBadge()}
          {getStatusBadge()}
          {line.confidenceScore < 0.85 && (
            <button
              type="button"
              className="warning-confidence-btn"
              onClick={(e) => {
                e.stopPropagation()
                setPopoverWord(line.correctedText.split(' ')[0] || line.correctedText)
              }}
              title={`Skor kepercayaan AI ${Math.round(line.confidenceScore * 100)}%. Klik untuk opsi kandidat.`}
            >
              💡 {Math.round(line.confidenceScore * 100)}%
            </button>
          )}
        </div>

        {/* Micro Toolbar */}
        <div className="line-micro-toolbar" dir="ltr">
          <button
            type="button"
            className={`micro-btn status-toggle-btn ${line.status === 'verified' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              manuscriberStagingStore.setLineStatus(
                line.id,
                line.status === 'verified' ? 'unverified' : 'verified'
              )
            }}
            title={line.status === 'verified' ? 'Batal Verification (Status: Shahih)' : 'Tandai Shahih (Ctrl+Enter)'}
          >
            <IconCheck size={14} />
          </button>
        </div>
      </div>

      {/* Editable Area - Arabic Textarea */}
      <div className="line-card-body" dir="rtl">
        <textarea
          ref={textareaRef}
          className="line-arabic-textarea"
          value={line.correctedText}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            manuscriberStagingStore.updateLineText(line.id, e.target.value)
          }
          onKeyDown={handleKeyDown}
          onClick={() => {
            if (!isActive) {
              manuscriberStagingStore.setActiveLineId(line.id, false)
            }
          }}
          rows={1}
          style={{ overflowY: 'hidden' }}
          placeholder="Ketik atau edit teks Arab di sini..."
        />
      </div>

      {/* Quick Fix Popover if triggered */}
      {popoverWord && (
        <QuickFixPopover
          word={popoverWord}
          candidates={line.candidates}
          confidenceScore={line.confidenceScore}
          onSelectCandidate={(selected: string) => {
            manuscriberStagingStore.updateLineText(
              line.id,
              line.correctedText.replace(popoverWord, selected)
            )
            setPopoverWord(null)
          }}
          onClose={() => setPopoverWord(null)}
        />
      )}
    </div>
  )
}
