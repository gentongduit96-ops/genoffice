import React from 'react'

interface StatusBarProps {
  currentSpread: number
  totalSpreads: number
  zoomLevel: number
  hasOverset: boolean
  onSpreadChange: (spread: number) => void
  onZoomChange: (zoom: number) => void
}

export const StatusBar: React.FC<StatusBarProps> = ({
  currentSpread,
  totalSpreads,
  zoomLevel,
  hasOverset,
  onSpreadChange,
  onZoomChange,
}) => {
  return (
    <div className="idml-statusbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--colorNeutralForeground3)' }}>Spread:</span>
          <button
            className="idml-status-btn"
            disabled={currentSpread <= 1}
            onClick={() => onSpreadChange(currentSpread - 1)}
            title="Previous Spread"
          >
            ‹
          </button>
          <span style={{ fontWeight: 600, fontSize: '11px', color: 'var(--colorNeutralForeground1)', minWidth: '36px', textAlign: 'center' }}>
            {currentSpread} of {totalSpreads}
          </span>
          <button
            className="idml-status-btn"
            disabled={currentSpread >= totalSpreads}
            onClick={() => onSpreadChange(currentSpread + 1)}
            title="Next Spread"
          >
            ›
          </button>
        </div>

        <div className={`idml-preflight-badge ${hasOverset ? 'error' : 'ok'}`}>
          {hasOverset ? '⚠️ Preflight: Overset Text Detected' : '✓ Preflight: No Errors'}
        </div>
      </div>

      {/* Zoom Controls & Preset Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          className="idml-status-btn"
          onClick={() => onZoomChange(Math.max(25, zoomLevel - 25))}
          title="Zoom Out (Ctrl+-)"
        >
          −
        </button>

        <select
          className="idml-select-input"
          style={{ height: '22px', fontSize: '11px', padding: '0 4px' }}
          value={zoomLevel}
          onChange={(e) => onZoomChange(Number(e.target.value))}
        >
          <option value={25}>25%</option>
          <option value={50}>50%</option>
          <option value={75}>75%</option>
          <option value={100}>100% (Fit)</option>
          <option value={125}>125%</option>
          <option value={150}>150%</option>
          <option value={200}>200%</option>
          <option value={300}>300%</option>
          <option value={400}>400%</option>
        </select>

        <button
          className="idml-status-btn"
          onClick={() => onZoomChange(Math.min(400, zoomLevel + 25))}
          title="Zoom In (Ctrl++)"
        >
          +
        </button>
      </div>
    </div>
  )
}
