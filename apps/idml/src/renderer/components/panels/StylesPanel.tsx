import React from 'react'
import type { IdmlCharacterStyle, IdmlParagraphStyle } from '@genoffice/idml-engine'

interface StylesPanelProps {
  paragraphStyles: Record<string, IdmlParagraphStyle>
  characterStyles: Record<string, IdmlCharacterStyle>
}

export const StylesPanel: React.FC<StylesPanelProps> = ({ paragraphStyles, characterStyles }) => {
  return (
    <div>
      <h4 style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--colorNeutralForeground3)' }}>
        Paragraph Styles
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
        {Object.values(paragraphStyles).map((p) => (
          <div
            key={p.id}
            style={{
              padding: '6px 8px',
              fontSize: '12px',
              border: '1px solid var(--colorNeutralStroke2)',
              borderRadius: 'var(--radius-4, 4px)',
            }}
          >
            ¶ {p.name || p.id}
          </div>
        ))}
      </div>

      <h4 style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--colorNeutralForeground3)' }}>
        Character Styles
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {Object.values(characterStyles).map((c) => (
          <div
            key={c.id}
            style={{
              padding: '6px 8px',
              fontSize: '12px',
              border: '1px solid var(--colorNeutralStroke2)',
              borderRadius: 'var(--radius-4, 4px)',
            }}
          >
            A {c.name || c.id}
          </div>
        ))}
      </div>
    </div>
  )
}
