import React from 'react'

export type IdmlTool = 'selection' | 'direct' | 'type' | 'rectangle' | 'hand' | 'zoom'

interface ToolboxProps {
  activeTool: IdmlTool
  onSelectTool: (tool: IdmlTool) => void
}

function SelectionIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 2.5v16.5l4.8-4.8 3.5 7.2 2.7-1.3-3.5-7.2h6.5L4 2.5z" />
    </svg>
  )
}

function DirectSelectionIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 2.5v16.5l4.8-4.8 3.5 7.2 2.7-1.3-3.5-7.2h6.5L4 2.5z" />
    </svg>
  )
}

function TypeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 4h14M12 4v16M9 20h6" strokeLinecap="round" />
    </svg>
  )
}

function RectangleFrameIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <line x1="3" y1="4" x2="21" y2="20" />
      <line x1="21" y1="4" x2="3" y2="20" />
    </svg>
  )
}

function HandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        d="M18 11V6a1.5 1.5 0 0 0-3 0v4.5M15 10.5V4a1.5 1.5 0 0 0-3 0v6.5M12 10.5V5a1.5 1.5 0 0 0-3 0v7M9 11.5V7.5a1.5 1.5 0 0 0-3 0v8a6.5 6.5 0 0 0 13 0v-4.5a1.5 1.5 0 0 0-3 0V11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ZoomIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="6" />
      <line x1="15.5" y1="15.5" x2="20" y2="20" strokeLinecap="round" />
    </svg>
  )
}

export const Toolbox: React.FC<ToolboxProps> = ({ activeTool, onSelectTool }) => {
  return (
    <div className="idml-toolbox">
      <button
        className={`idml-tool-btn ${activeTool === 'selection' ? 'active' : ''}`}
        title="Selection Tool (V)"
        onClick={() => onSelectTool('selection')}
      >
        <SelectionIcon />
      </button>
      <button
        className={`idml-tool-btn ${activeTool === 'direct' ? 'active' : ''}`}
        title="Direct Selection Tool (A)"
        onClick={() => onSelectTool('direct')}
      >
        <DirectSelectionIcon />
      </button>
      <button
        className={`idml-tool-btn ${activeTool === 'type' ? 'active' : ''}`}
        title="Type Tool (T)"
        onClick={() => onSelectTool('type')}
      >
        <TypeIcon />
      </button>
      <button
        className={`idml-tool-btn ${activeTool === 'rectangle' ? 'active' : ''}`}
        title="Rectangle Graphic Frame Tool (M)"
        onClick={() => onSelectTool('rectangle')}
      >
        <RectangleFrameIcon />
      </button>

      <div className="idml-control-divider" style={{ width: '20px', height: '1px', margin: '4px 0' }} />

      <button
        className={`idml-tool-btn ${activeTool === 'hand' ? 'active' : ''}`}
        title="Hand Pan Tool (H)"
        onClick={() => onSelectTool('hand')}
      >
        <HandIcon />
      </button>
      <button
        className={`idml-tool-btn ${activeTool === 'zoom' ? 'active' : ''}`}
        title="Zoom Tool (Z)"
        onClick={() => onSelectTool('zoom')}
      >
        <ZoomIcon />
      </button>
    </div>
  )
}
