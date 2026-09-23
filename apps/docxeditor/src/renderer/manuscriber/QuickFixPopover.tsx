import React, { useState } from 'react'

interface QuickFixPopoverProps {
  word: string
  candidates?: string[]
  confidenceScore?: number
  onSelectCandidate: (candidate: string) => void
  onClose: () => void
}

export const QuickFixPopover: React.FC<QuickFixPopoverProps> = ({
  word,
  candidates = [],
  confidenceScore = 0.85,
  onSelectCandidate,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'candidates' | 'dictionary'>('candidates')
  const [dictResult, setDictResult] = useState<string | null>(null)

  const handleLookupDict = () => {
    // Basic classical turats glossary lookup mock
    setDictResult(`Definisi '${word}': Kata Turats klasik yang bermakna kedudukan, tingkatan, atau derajat (المَرْتَبَة). Dalam istilah fiqih/ushul menunjukkan susunan hierarki hukum.`)
  }

  return (
    <div className="quickfix-popover-card" dir="rtl">
      <div className="quickfix-header">
        <span className="quickfix-title">💡 Tashih & Kandidat Bacaan AI</span>
        <button type="button" className="quickfix-close" onClick={onClose}>
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="quickfix-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'candidates' ? 'active' : ''}`}
          onClick={() => setActiveTab('candidates')}
        >
          Kandidat AI ({candidates.length > 0 ? candidates.length : 1})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'dictionary' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('dictionary')
            handleLookupDict()
          }}
        >
          📖 Kamus Turats
        </button>
      </div>

      <div className="quickfix-body">
        {activeTab === 'candidates' ? (
          <div className="candidates-list">
            <div className="word-meta">
              <span>Kata Asli AI: <strong>{word}</strong></span>
              <span className="confidence-badge" style={{ backgroundColor: confidenceScore < 0.8 ? '#FFF4CE' : '#E1DFDD', color: '#323130' }}>
                Tingkat Kepercayaan: {Math.round(confidenceScore * 100)}%
              </span>
            </div>

            <div className="options-grid">
              {candidates.length > 0 ? (
                candidates.map((cand, i) => (
                  <button
                    key={i}
                    type="button"
                    className="candidate-option-btn"
                    onClick={() => onSelectCandidate(cand)}
                  >
                    <span className="cand-index">[{i + 1}]</span>
                    <span className="cand-text">{cand}</span>
                  </button>
                ))
              ) : (
                <button
                  type="button"
                  className="candidate-option-btn default"
                  onClick={() => onSelectCandidate(word)}
                >
                  <span className="cand-text">{word} (Gunakan Kata Ini)</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="dictionary-view">
            {dictResult ? (
              <p className="dict-text">{dictResult}</p>
            ) : (
              <p className="dict-loading">Memuat definisi kamus...</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
