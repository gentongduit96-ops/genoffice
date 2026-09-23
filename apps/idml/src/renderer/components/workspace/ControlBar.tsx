import React, { useState } from 'react'
import type { IdmlPageItem } from '@genoffice/idml-engine'

interface ControlBarProps {
  selectedItem?: IdmlPageItem
  filePath?: string
  isDirty?: boolean
  fontFamily: string
  fontSize: number
  onOpenDocument: () => void
  onSaveDocument: () => void
  onSaveAsDocument: () => void
  onFontFamilyChange: (font: string) => void
  onFontSizeChange: (size: number) => void
}

export const ControlBar: React.FC<ControlBarProps> = ({
  selectedItem,
  filePath,
  isDirty,
  fontFamily,
  fontSize,
  onOpenDocument,
  onSaveDocument,
  onSaveAsDocument,
  onFontFamilyChange,
  onFontSizeChange,
}) => {
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right' | 'justify'>('left')
  const [leading, setLeading] = useState('Auto')
  const [tracking, setTracking] = useState('0')

  const bounds = selectedItem?.geometricBounds
  const widthMm = bounds ? Math.round(Math.abs(bounds.right - bounds.left)) : 0
  const heightMm = bounds ? Math.round(Math.abs(bounds.bottom - bounds.top)) : 0
  const xMm = bounds ? Math.round(bounds.left) : 0
  const yMm = bounds ? Math.round(bounds.top) : 0

  const fileName = filePath ? filePath.split(/[/\\]/).pop() : 'Dokumen IDML tanpa judul'

  return (
    <div className="idml-controlbar">
      {/* File Action Controls (Open / Save / Save As) */}
      <div className="idml-control-group">
        <button
          className="idml-status-btn"
          style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
          onClick={onOpenDocument}
          title="Open InDesign File (Ctrl+O)"
        >
          <span>📂</span> Buka
        </button>
        <button
          className="idml-status-btn"
          style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
          onClick={onSaveDocument}
          title="Save InDesign File (Ctrl+S)"
        >
          <span>💾</span> Simpan
        </button>
        <button
          className="idml-status-btn"
          onClick={onSaveAsDocument}
          title="Save As New File (Ctrl+Shift+S)"
        >
          Simpan Sebagai…
        </button>
      </div>

      <div className="idml-control-divider" />

      {/* Document Name Indicator */}
      <div className="idml-control-group" style={{ fontSize: '12px' }}>
        <span style={{ fontWeight: 600, color: 'var(--colorNeutralForeground1)' }}>{fileName}</span>
        {isDirty && (
          <span
            style={{
              fontSize: '10px',
              color: 'var(--accent)',
              fontWeight: 700,
              backgroundColor: 'var(--accent-soft)',
              padding: '1px 5px',
              borderRadius: '3px',
            }}
          >
            * Belum Disimpan
          </span>
        )}
      </div>

      <div className="idml-control-divider" />

      {/* Frame Selection & Coordinates */}
      <div className="idml-control-group">
        <span style={{ fontWeight: 600, fontSize: '11px', color: 'var(--accent)' }}>
          {selectedItem ? `[ ${selectedItem.itemType} #${selectedItem.id} ]` : 'Selection: None'}
        </span>
        {selectedItem && (
          <div style={{ display: 'flex', gap: '6px', fontSize: '11px', color: 'var(--colorNeutralForeground3)' }}>
            <span>X:{xMm}</span>
            <span>Y:{yMm}</span>
            <span>W:{widthMm}</span>
            <span>H:{heightMm}</span>
          </div>
        )}
      </div>

      <div className="idml-control-divider" />

      {/* Font Family & Size */}
      <div className="idml-control-group">
        <label style={{ fontSize: '11px', color: 'var(--colorNeutralForeground3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7V4h16v3M9 20h6M12 4v16" strokeLinecap="round" />
          </svg>
        </label>
        <select
          className="idml-select-input"
          value={fontFamily}
          onChange={(e) => onFontFamilyChange(e.target.value)}
        >
          <option value="Segoe UI">Segoe UI</option>
          <option value="Inter">Inter</option>
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
        </select>

        <select
          className="idml-select-input"
          style={{ width: '68px' }}
          value={fontSize}
          onChange={(e) => onFontSizeChange(Number(e.target.value))}
        >
          <option value={9}>9 pt</option>
          <option value={10}>10 pt</option>
          <option value={11}>11 pt</option>
          <option value={12}>12 pt</option>
          <option value={14}>14 pt</option>
          <option value={18}>18 pt</option>
          <option value={24}>24 pt</option>
          <option value={36}>36 pt</option>
          <option value={48}>48 pt</option>
          <option value={72}>72 pt</option>
        </select>
      </div>

      <div className="idml-control-divider" />

      {/* Typography Formatting Buttons (B, I, U, Alignment) */}
      <div className="idml-control-group">
        <button
          className={`idml-status-btn ${isBold ? 'active' : ''}`}
          style={{ fontWeight: 700, padding: '2px 8px' }}
          onClick={() => setIsBold(!isBold)}
          title="Bold (Ctrl+B)"
        >
          B
        </button>
        <button
          className={`idml-status-btn ${isItalic ? 'active' : ''}`}
          style={{ fontStyle: 'italic', padding: '2px 8px' }}
          onClick={() => setIsItalic(!isItalic)}
          title="Italic (Ctrl+I)"
        >
          I
        </button>
        <button
          className={`idml-status-btn ${isUnderline ? 'active' : ''}`}
          style={{ textDecoration: 'underline', padding: '2px 8px' }}
          onClick={() => setIsUnderline(!isUnderline)}
          title="Underline (Ctrl+U)"
        >
          U
        </button>

        <div style={{ display: 'flex', gap: '2px', marginLeft: '4px' }}>
          <button
            className={`idml-status-btn ${alignment === 'left' ? 'active' : ''}`}
            onClick={() => setAlignment('left')}
            title="Align Left"
          >
            ≡
          </button>
          <button
            className={`idml-status-btn ${alignment === 'center' ? 'active' : ''}`}
            onClick={() => setAlignment('center')}
            title="Align Center"
          >
            ≂
          </button>
          <button
            className={`idml-status-btn ${alignment === 'right' ? 'active' : ''}`}
            onClick={() => setAlignment('right')}
            title="Align Right"
          >
            ≡
          </button>
          <button
            className={`idml-status-btn ${alignment === 'justify' ? 'active' : ''}`}
            onClick={() => setAlignment('justify')}
            title="Justify"
          >
            ☰
          </button>
        </div>
      </div>

      <div className="idml-control-divider" />

      {/* Leading & Tracking */}
      <div className="idml-control-group" style={{ fontSize: '11px', color: 'var(--colorNeutralForeground3)' }}>
        <label title="Leading (Line Height)">Leading:</label>
        <input
          type="text"
          className="idml-select-input"
          style={{ width: '50px' }}
          value={leading}
          onChange={(e) => setLeading(e.target.value)}
        />
        <label title="Tracking (Character Spacing)" style={{ marginLeft: '4px' }}>Tracking:</label>
        <input
          type="text"
          className="idml-select-input"
          style={{ width: '40px' }}
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
        />
      </div>

      <div className="idml-control-divider" />

      {/* Swatches (Fill & Stroke) */}
      <div className="idml-control-group">
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Fill Color">
          <label style={{ fontSize: '11px', color: 'var(--colorNeutralForeground3)' }}>Fill:</label>
          <div
            style={{
              width: '18px',
              height: '18px',
              backgroundColor: selectedItem?.fillColor || '#ffffff',
              border: '1px solid var(--colorNeutralStroke1)',
              borderRadius: '3px',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }} title="Stroke Color">
          <label style={{ fontSize: '11px', color: 'var(--colorNeutralForeground3)' }}>Stroke:</label>
          <div
            style={{
              width: '18px',
              height: '18px',
              border: '2px solid var(--colorNeutralForeground1)',
              borderRadius: '3px',
              backgroundColor: 'transparent',
            }}
          />
        </div>
      </div>
    </div>
  )
}
