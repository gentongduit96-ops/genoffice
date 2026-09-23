import React from 'react'
import type { IdmlSpread } from '@genoffice/idml-engine'

interface PagesPanelProps {
  spreads: IdmlSpread[]
  currentSpread: number
  onSelectSpread: (index: number) => void
}

export const PagesPanel: React.FC<PagesPanelProps> = ({ spreads, currentSpread, onSelectSpread }) => {
  return (
    <div>
      <h4 style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--colorNeutralForeground3)' }}>
        Spreads & Pages ({spreads.length})
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {spreads.map((spread, idx) => {
          const isActive = idx + 1 === currentSpread
          return (
            <div
              key={spread.id}
              onClick={() => onSelectSpread(idx + 1)}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-4, 4px)',
                border: `1px solid ${isActive ? 'var(--accent)' : 'var(--colorNeutralStroke2)'}`,
                backgroundColor: isActive ? 'var(--accent-soft)' : 'var(--colorNeutralBackground1)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--accent)' : 'inherit' }}>
                Spread {idx + 1} ({spread.pages.length} pages)
              </span>
              <span style={{ fontSize: '11px', color: 'var(--colorNeutralForeground3)' }}>
                {spread.pageItems.length} items
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
