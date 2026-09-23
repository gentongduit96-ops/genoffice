import React from 'react'
import type { IdmlColor } from '@genoffice/idml-engine'

interface SwatchesPanelProps {
  colors: Record<string, IdmlColor>
}

export const SwatchesPanel: React.FC<SwatchesPanelProps> = ({ colors }) => {
  return (
    <div>
      <h4 style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--colorNeutralForeground3)' }}>
        Color Swatches ({Object.keys(colors).length})
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        {Object.values(colors).map((c) => (
          <div
            key={c.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px',
              border: '1px solid var(--colorNeutralStroke2)',
              borderRadius: 'var(--radius-4, 4px)',
            }}
          >
            <div
              style={{
                width: '18px',
                height: '18px',
                backgroundColor: c.hex,
                borderRadius: '2px',
                border: '1px solid #ccc',
              }}
            />
            <span style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.name || c.id}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
