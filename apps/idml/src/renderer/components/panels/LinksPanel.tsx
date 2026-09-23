import React from 'react'
import type { IdmlDocument, IdmlPageItem } from '@genoffice/idml-engine'

interface LinksPanelProps {
  doc: IdmlDocument
  onRelinkImage?: (item: IdmlPageItem) => void
}

export const LinksPanel: React.FC<LinksPanelProps> = ({ doc, onRelinkImage }) => {
  // Collect graphic frames across all spreads
  const graphicFrames: IdmlPageItem[] = []
  for (const spread of doc.spreads) {
    for (const item of spread.pageItems) {
      if (item.itemType === 'GraphicFrame') {
        graphicFrames.push(item)
      }
    }
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <h4 style={{ fontSize: '12px', color: 'var(--colorNeutralForeground3)' }}>
          Linked Assets ({graphicFrames.length})
        </h4>
      </div>

      {graphicFrames.length === 0 ? (
        <div style={{ fontSize: '12px', color: 'var(--colorNeutralForeground4)', fontStyle: 'italic' }}>
          No image graphic frames found in spread.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {graphicFrames.map((item) => {
            const fileName = item.itemType === 'GraphicFrame' ? item.imageFileName : 'Image'
            const missing = item.itemType === 'GraphicFrame' ? item.assetMissing : false

            return (
              <div
                key={item.id}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-4, 4px)',
                  border: '1px solid var(--colorNeutralStroke2)',
                  backgroundColor: 'var(--colorNeutralBackground1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <span style={{ fontSize: '14px' }}>🖼️</span>
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span
                      style={{
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={fileName}
                    >
                      {fileName || 'Unlinked Graphic Frame'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--colorNeutralForeground3)' }}>
                      Frame #{item.id}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    className={`idml-preflight-badge ${missing ? 'error' : 'ok'}`}
                    style={{ fontSize: '10px', padding: '1px 6px' }}
                  >
                    {missing ? 'Missing' : 'OK'}
                  </span>

                  {onRelinkImage && (
                    <button
                      className="idml-status-btn"
                      onClick={() => onRelinkImage(item)}
                      title="Relink/Replace Image Asset"
                    >
                      Relink
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
