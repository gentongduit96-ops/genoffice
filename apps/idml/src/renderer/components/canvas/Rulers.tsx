import React from 'react'

interface RulersProps {
  widthMm: number
  heightMm: number
  zoomLevel: number
  cursorPos?: { xMm: number; yMm: number }
}

export const HorizontalRuler: React.FC<{ widthMm: number; zoomLevel: number; mouseXmm?: number }> = ({
  widthMm,
  zoomLevel,
  mouseXmm,
}) => {
  const scale = zoomLevel / 100
  const widthPx = widthMm * 3.78 * scale
  const stepMm = zoomLevel < 50 ? 50 : zoomLevel < 100 ? 20 : 10

  const ticks: React.ReactNode[] = []
  for (let mm = 0; mm <= widthMm; mm += stepMm) {
    const xPx = mm * 3.78 * scale
    ticks.push(
      <g key={mm}>
        <line x1={xPx} y1="12" x2={xPx} y2="20" stroke="var(--colorNeutralForeground4)" strokeWidth="1" />
        <text
          x={xPx + 2}
          y="10"
          fontSize="9"
          fill="var(--colorNeutralForeground3)"
          fontFamily="Segoe UI, sans-serif"
        >
          {mm}
        </text>
      </g>,
    )
  }

  return (
    <div
      style={{
        height: '20px',
        width: `${widthPx}px`,
        backgroundColor: 'var(--colorNeutralBackground1)',
        borderBottom: '1px solid var(--colorNeutralStroke2)',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <svg width={widthPx} height="20" style={{ display: 'block' }}>
        {ticks}
        {mouseXmm !== undefined && (
          <line
            x1={mouseXmm * 3.78 * scale}
            y1="0"
            x2={mouseXmm * 3.78 * scale}
            y2="20"
            stroke="var(--accent)"
            strokeWidth="1.5"
          />
        )}
      </svg>
    </div>
  )
}

export const VerticalRuler: React.FC<{ heightMm: number; zoomLevel: number; mouseYmm?: number }> = ({
  heightMm,
  zoomLevel,
  mouseYmm,
}) => {
  const scale = zoomLevel / 100
  const heightPx = heightMm * 3.78 * scale
  const stepMm = zoomLevel < 50 ? 50 : zoomLevel < 100 ? 20 : 10

  const ticks: React.ReactNode[] = []
  for (let mm = 0; mm <= heightMm; mm += stepMm) {
    const yPx = mm * 3.78 * scale
    ticks.push(
      <g key={mm}>
        <line x1="12" y1={yPx} x2="20" y2={yPx} stroke="var(--colorNeutralForeground4)" strokeWidth="1" />
        <text
          x="2"
          y={yPx + 8}
          fontSize="8"
          fill="var(--colorNeutralForeground3)"
          fontFamily="Segoe UI, sans-serif"
        >
          {mm}
        </text>
      </g>,
    )
  }

  return (
    <div
      style={{
        width: '20px',
        height: `${heightPx}px`,
        backgroundColor: 'var(--colorNeutralBackground1)',
        borderRight: '1px solid var(--colorNeutralStroke2)',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <svg width="20" height={heightPx} style={{ display: 'block' }}>
        {ticks}
        {mouseYmm !== undefined && (
          <line
            x1="0"
            y1={mouseYmm * 3.78 * scale}
            x2="20"
            y2={mouseYmm * 3.78 * scale}
            stroke="var(--accent)"
            strokeWidth="1.5"
          />
        )}
      </svg>
    </div>
  )
}
