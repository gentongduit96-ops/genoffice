import { useState, useEffect } from 'react'
import {
  type PromptPreset,
  getPromptPresets,
  savePromptPreset,
  deletePromptPreset,
  resetDefaultPresets,
  subscribePromptPresets,
} from '../ai/prompt-presets'
import { useModalKeys } from './modal-keys'
import { showToast } from './toast-bus'

interface PromptManagerModalProps {
  initialCategory?: string
  onClose: () => void
  onExecutePrompt: (instruction: string) => void
}

export function PromptManagerModal({
  initialCategory,
  onClose,
  onExecutePrompt,
}: PromptManagerModalProps) {
  const modalKeys = useModalKeys(onClose)
  const [presets, setPresets] = useState<PromptPreset[]>(() => getPromptPresets())
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory || 'all')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingPreset, setEditingPreset] = useState<Partial<PromptPreset> | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    return subscribePromptPresets((newPresets) => {
      setPresets(newPresets)
    })
  }, [])

  const filteredPresets = presets.filter((p) => {
    const matchesCategory =
      activeCategory === 'all'
        ? true
        : activeCategory === 'kustom'
        ? !p.isBuiltIn
        : p.category.toLowerCase() === activeCategory.toLowerCase()

    const q = searchQuery.trim().toLowerCase()
    const matchesQuery =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.instruction.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))

    return matchesCategory && matchesQuery
  })

  const handleCopy = (preset: PromptPreset) => {
    navigator.clipboard.writeText(preset.instruction)
    setCopiedId(preset.id)
    showToast('Instruksi prompt berhasil disalin!', 'success')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSave = () => {
    if (!editingPreset || !editingPreset.title?.trim() || !editingPreset.instruction?.trim()) {
      showToast('Judul dan instruksi prompt wajib diisi', 'error')
      return
    }

    const saved = savePromptPreset({
      id: editingPreset.id,
      title: editingPreset.title.trim(),
      category: editingPreset.category || 'kustom',
      description: editingPreset.description?.trim() || '',
      instruction: editingPreset.instruction.trim(),
      isBuiltIn: false,
    })

    showToast(`Prompt "${saved.title}" berhasil disimpan`, 'success')
    setEditingPreset(null)
  }

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Yakin ingin menghapus pintasan prompt "${title}"?`)) {
      deletePromptPreset(id)
      showToast(`Prompt "${title}" dihapus`, 'success')
    }
  }

  const handleReset = () => {
    if (window.confirm('Kembalikan semua pintasan prompt ke default bawaan Manuscriber?')) {
      resetDefaultPresets()
      showToast('Pintasan prompt dikembalikan ke default', 'success')
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category.toLowerCase()) {
      case 'ringkasan':
        return 'Ringkasan AI'
      case 'poles':
        return 'Poles AI'
      case 'format':
        return 'Format AI'
      default:
        return 'Kustom'
    }
  }

  return (
    <div
      className="modal-backdrop"
      ref={modalKeys.ref}
      onKeyDown={modalKeys.onKeyDown}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(10px)',
        background: 'rgba(0, 0, 0, 0.55)',
      }}
    >
      <div
        className="fluent-prompt-modal"
        role="dialog"
        aria-label="Kelola Pintasan Prompt AI"
      >
        {/* Header */}
        <div className="fluent-prompt-header">
          <div className="fluent-prompt-header-title">
            <div className="fluent-prompt-icon-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v3m0 12v3M3 12h3m12 0h3" />
                <path d="M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12M19.07 19.07l-2.12-2.12M7.05 7.05L4.93 4.93" />
              </svg>
            </div>
            <div className="fluent-prompt-title-text">
              <h2>Kelola Pintasan Prompt AI</h2>
              <p>Daftar judul & instruksi prompt terintegrasi Word Skillset Manuscriber</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!editingPreset && (
              <button
                className="fluent-btn-primary"
                onClick={() =>
                  setEditingPreset({
                    title: '',
                    category: activeCategory !== 'all' ? activeCategory : 'ringkasan',
                    description: '',
                    instruction: '',
                  })
                }
              >
                <span>+</span> Buat Prompt Baru
              </button>
            )}
            <button
              onClick={onClose}
              className="fluent-btn-subtle"
              style={{ padding: '6px 10px', fontSize: '14px', border: 'none' }}
              title="Tutup (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        {editingPreset ? (
          /* Editor Form */
          <div
            style={{
              padding: '20px 24px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
                {editingPreset.id ? 'Edit Pintasan Prompt' : 'Buat Pintasan Prompt Baru'}
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                Perintah prompt akan langsung dieksekusi oleh AI pada dokumen
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '16px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    marginBottom: '6px',
                  }}
                >
                  Judul Prompt <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Format Karya Ilmiah Standar"
                  value={editingPreset.title || ''}
                  onChange={(e) => setEditingPreset({ ...editingPreset, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-strong)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    marginBottom: '6px',
                  }}
                >
                  Kategori
                </label>
                <select
                  value={editingPreset.category || 'ringkasan'}
                  onChange={(e) => setEditingPreset({ ...editingPreset, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-strong)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                >
                  <option value="ringkasan">Ringkasan AI</option>
                  <option value="poles">Poles AI</option>
                  <option value="format">Format AI</option>
                  <option value="kustom">Kustom</option>
                </select>
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  marginBottom: '6px',
                }}
              >
                Keterangan Singkat (Opsional)
              </label>
              <input
                type="text"
                placeholder="Penjelasan ringkas tujuan pintasan prompt..."
                value={editingPreset.description || ''}
                onChange={(e) =>
                  setEditingPreset({ ...editingPreset, description: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-strong)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  marginBottom: '6px',
                }}
              >
                Isi Perintah / Instruksi AI <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                rows={7}
                placeholder="Tuliskan instruksi AI secara rinci. Contoh: 'Poles teks dokumen ini agar sesuai kaidah EYD V, perbaiki tanda baca dan struktur kalimat tanpa mengubah esensi teks...'"
                value={editingPreset.instruction || ''}
                onChange={(e) =>
                  setEditingPreset({ ...editingPreset, instruction: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-strong)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '4px' }}>
                💡 Tip: Tulis instruksi yang terstruktur untuk mendapatkan hasil pemformatan Word terbaik.
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '10px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border)',
              }}
            >
              <button
                className="fluent-btn-subtle"
                onClick={() => setEditingPreset(null)}
              >
                Batal
              </button>
              <button
                className="fluent-btn-primary"
                onClick={handleSave}
              >
                Simpan Prompt
              </button>
            </div>
          </div>
        ) : (
          /* List View */
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Filter Toolbar */}
            <div className="fluent-prompt-toolbar">
              {/* Fluent Pill Tabs */}
              <div className="fluent-tabs-pill">
                {[
                  { id: 'all', label: 'Semua' },
                  { id: 'ringkasan', label: 'Ringkasan AI' },
                  { id: 'poles', label: 'Poles AI' },
                  { id: 'format', label: 'Format AI' },
                  { id: 'kustom', label: 'Kustom' },
                ].map((tab) => {
                  const active = activeCategory.toLowerCase() === tab.id.toLowerCase()
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveCategory(tab.id)}
                      className={`fluent-tab-item ${active ? 'active' : ''}`}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              {/* Fluent Search Box */}
              <div className="fluent-searchbox">
                <span className="fluent-searchbox-icon">🔍</span>
                <input
                  type="search"
                  placeholder="Cari judul / isi prompt..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* List Cards */}
            <div className="fluent-cards-container">
              {filteredPresets.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: 'var(--text-dim)',
                  }}
                >
                  <p style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 6px 0' }}>
                    Tidak ada prompt ditemukan
                  </p>
                  <p style={{ fontSize: '12.5px', margin: 0 }}>
                    Coba ganti filter kategori atau klik tombol "+ Buat Prompt Baru" di atas.
                  </p>
                </div>
              ) : (
                filteredPresets.map((preset) => {
                  const isCopied = copiedId === preset.id
                  const catClass = ['ringkasan', 'poles', 'format'].includes(preset.category.toLowerCase())
                    ? preset.category.toLowerCase()
                    : 'kustom'

                  return (
                    <div key={preset.id} className="fluent-prompt-card">
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className={`fluent-badge ${catClass}`}>
                            {getCategoryLabel(preset.category)}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text)' }}>
                            {preset.title}
                          </span>
                          {preset.isBuiltIn && (
                            <span
                              style={{
                                fontSize: '10.5px',
                                color: 'var(--text-dim)',
                                padding: '1px 6px',
                                borderRadius: '3px',
                                border: '1px solid var(--border)',
                              }}
                            >
                              Bawaan
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            className="fluent-btn-primary"
                            onClick={() => {
                              onExecutePrompt(preset.instruction)
                              onClose()
                            }}
                            title="Eksekusi prompt ini pada dokumen aktif"
                          >
                            <span>⚡</span> Jalankan
                          </button>
                          <button
                            className="fluent-btn-subtle"
                            onClick={() => handleCopy(preset)}
                            title="Salin isi prompt ke clipboard"
                          >
                            {isCopied ? '✓ Disalin' : 'Salin'}
                          </button>
                          <button
                            className="fluent-btn-subtle"
                            onClick={() => setEditingPreset(preset)}
                            title="Edit prompt"
                          >
                            Edit
                          </button>
                          {!preset.isBuiltIn && (
                            <button
                              className="fluent-btn-danger"
                              onClick={() => handleDelete(preset.id, preset.title)}
                              title="Hapus prompt kustom"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      </div>

                      {preset.description && (
                        <p
                          style={{
                            margin: 0,
                            fontSize: '12px',
                            color: 'var(--text-dim)',
                          }}
                        >
                          {preset.description}
                        </p>
                      )}

                      <div
                        className="fluent-prompt-codebox"
                        style={{
                          borderLeftColor:
                            catClass === 'ringkasan'
                              ? '#10b981'
                              : catClass === 'poles'
                              ? '#0ea5e9'
                              : catClass === 'format'
                              ? '#a855f7'
                              : '#f59e0b',
                        }}
                      >
                        {preset.instruction}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--surface)',
              }}
            >
              <button
                onClick={handleReset}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Reset ke Default
              </button>
              <button
                className="fluent-btn-subtle"
                onClick={onClose}
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
