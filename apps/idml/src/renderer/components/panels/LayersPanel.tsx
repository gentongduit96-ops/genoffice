import React, { useState } from 'react'
import type { IdmlDocument } from '@genoffice/idml-engine'

interface LayersPanelProps {
  doc: IdmlDocument
}

interface LayerItem {
  id: string
  name: string
  color: string
  visible: boolean
  locked: boolean
  itemCount: number
}

export const LayersPanel: React.FC<LayersPanelProps> = ({ doc }) => {
  // Collect unique layers or default layers
  const [layers, setLayers] = useState<LayerItem[]>(() => {
    const layerMap = new Map<string, number>()
    for (const spread of doc.spreads) {
      for (const item of spread.pageItems) {
        const layerName = item.layer || 'Layer 1'
        layerMap.set(layerName, (layerMap.get(layerName) || 0) + 1)
      }
    }

    if (layerMap.size === 0) {
      layerMap.set('Layer 1', 0)
    }

    const defaultColors = ['#5080dc', '#d6285d', '#107c41', '#8050dc', '#f59e0b']
    let index = 0
    return Array.from(layerMap.entries()).map(([name, count]) => ({
      id: `layer-${index}`,
      name,
      color: defaultColors[index % defaultColors.length],
      visible: true,
      locked: false,
      itemCount: count,
    }))
  })

  const toggleVisibility = (id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    )
  }

  const toggleLock = (id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)),
    )
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
          Document Layers ({layers.length})
        </h4>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {layers.map((layer) => (
          <div
            key={layer.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              border: '1px solid var(--colorNeutralStroke2)',
              borderRadius: 'var(--radius-4, 4px)',
              backgroundColor: 'var(--colorNeutralBackground1)',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '4px',
                  height: '16px',
                  backgroundColor: layer.color,
                  borderRadius: '2px',
                }}
              />
              <span style={{ fontWeight: 600, color: 'var(--colorNeutralForeground1)' }}>
                {layer.name}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--colorNeutralForeground4)' }}>
                ({layer.itemCount} items)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                className="idml-status-btn"
                style={{ opacity: layer.visible ? 1 : 0.4 }}
                onClick={() => toggleVisibility(layer.id)}
                title={layer.visible ? 'Hide Layer' : 'Show Layer'}
              >
                {layer.visible ? '👁️' : '🕶️'}
              </button>
              <button
                className="idml-status-btn"
                style={{ opacity: layer.locked ? 1 : 0.4 }}
                onClick={() => toggleLock(layer.id)}
                title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
              >
                {layer.locked ? '🔒' : '🔓'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
