export interface PromptPreset {
  id: string
  title: string
  category: 'ringkasan' | 'poles' | 'format' | string
  instruction: string
  description?: string
  isBuiltIn?: boolean
  updatedAt?: string
}

export const BUILTIN_PROMPT_PRESETS: PromptPreset[] = [
  // --- RINGKASAN AI (Summarization) ---
  {
    id: 'sum-executive',
    title: 'Ringkasan Eksekutif & Rekomendasi',
    category: 'ringkasan',
    description: 'Ringkasan tingkat eksekutif memuat 3-5 poin inti, temuan penting, dan rekomendasi aksi.',
    instruction:
      'Tolong buatkan Ringkasan Eksekutif yang komprehensif dari dokumen ini. Cantumkan: 1) Latar Belakang Singkat, 2) Temuan Utama (3-5 poin kunci), 3) Implikasi/Dampak, dan 4) Rekomendasi Tindak Lanjut yang jelas.',
    isBuiltIn: true,
  },
  {
    id: 'sum-table',
    title: 'Ringkasan Tabel Komparasi',
    category: 'ringkasan',
    description: 'Rangkuman dalam bentuk tabel terstruktur (Aspek, Poin Utama, Dampak/Status).',
    instruction:
      'Ekstrak dan rangkum seluruh poin-poin penting dari dokumen ini ke dalam format Tabel yang rapi dengan kolom: [No, Topik/Aspek, Temuan/Isi Utama, Status/Dampak, Rekomendasi].',
    isBuiltIn: true,
  },
  {
    id: 'sum-outline',
    title: 'Outline Presentasi (Slide Deck)',
    category: 'ringkasan',
    description: 'Konversi intisari dokumen menjadi draf 5-7 slide presentasi yang tajam.',
    instruction:
      'Ubah isi dokumen ini menjadi outline presentasi 5-7 slide. Setiap slide harus memiliki: Judul Slide, 3-4 Bullet Points tajam, dan Catatan Pembicara (Speaker Notes) singkat.',
    isBuiltIn: true,
  },
  {
    id: 'sum-abstract',
    title: 'Abstrak Akademis & Kata Kunci',
    category: 'ringkasan',
    description: 'Format abstrak ilmiah formal dengan latar belakang, metode, hasil, kesimpulan, dan keywords.',
    instruction:
      'Buatkan Abstrak formal dalam 200-250 kata berdasarkan dokumen ini yang mencakup: Latar Belakang, Tujuan, Metodologi/Pendekatan, Hasil Temuan Utama, dan Kesimpulan. Tambahkan 3-5 Kata Kunci (Keywords) di bagian bawah.',
    isBuiltIn: true,
  },
  {
    id: 'sum-manuscript',
    title: 'Intisari Rekaman / Transkripsi Manuskrip',
    category: 'ringkasan',
    description: 'Rangkum transkripsi rekaman suara/rapat menjadi notula keputusan dan action items.',
    instruction:
      'Rangkum teks hasil rekaman/transkripsi suara ini menjadi Notula Rapat & Intisari yang terstruktur: 1) Agenda Pokok, 2) Poin Diskusi Penting, 3) Keputusan yang Ditetapkan, dan 4) Daftar Action Items (Penanggung Jawab & Target).',
    isBuiltIn: true,
  },

  // --- POLES AI (Polish & Refine) ---
  {
    id: 'pol-grammar',
    title: 'Poles Tata Bahasa & EYD V Baku',
    category: 'poles',
    description: 'Perbaiki ejaan, tata bahasa, pungtuasi, dan keefektifan kalimat sesuai kaidah EYD V.',
    instruction:
      'Poles seluruh teks dokumen ini: perbaiki kesalahan ketik (typo), ejaan sesuai EYD Edisi V, tanda baca, dan tata kalimat agar menjadi kalimat efektif yang baku dan profesional tanpa mengubah makna aslinya.',
    isBuiltIn: true,
  },
  {
    id: 'pol-academic',
    title: 'Gaya Bahasa Akademis & Ilmiah',
    category: 'poles',
    description: 'Ubah gaya bahasa menjadi formal, objektif, ilmiah, dan standar jurnal/skripsi.',
    instruction:
      'Tingkatkan gaya penulisan dokumen ini menjadi ragam bahasa akademis/ilmiah yang formal, objektif, bebas kata-kata klise, dan menggunakan istilah ilmiah yang presisi sesuai standar publikasi ilmiah.',
    isBuiltIn: true,
  },
  {
    id: 'pol-transcription',
    title: 'Rapikan Transkripsi Lisan (Manuscriber)',
    category: 'poles',
    description: 'Ubah teks rekaman lisan berantakan menjadi kalimat tulisan yang rapi dan mengalir.',
    instruction:
      'Poles teks transkripsi rekaman lisan ini: hilangkan filler words ("eh", "anu", "jadi begini", pengulangan tak perlu), perbaiki struktur kalimat lisan menjadi kalimat tertulis yang runtut, logis, dan nyaman dibaca.',
    isBuiltIn: true,
  },
  {
    id: 'pol-concise',
    title: 'Buat Lebih Padat & Ringkas (Concise)',
    category: 'poles',
    description: 'Hilangkan pleonasme dan kalimat bertele-tele agar langsung to-the-point.',
    instruction:
      'Poles dokumen ini agar lebih padat, ringkas, dan to-the-point. Hilangkan pemborosan kata (pleonasme) dan kalimat yang berbelit-belit dengan tetap mempertahankan seluruh informasi penting.',
    isBuiltIn: true,
  },
  {
    id: 'pol-translate-en',
    title: 'Terjemahkan ke Bahasa Inggris Profesional',
    category: 'poles',
    description: 'Terjemahkan teks ke Bahasa Inggris formal, natural, dan berstandar internasional.',
    instruction:
      'Terjemahkan dokumen/bagian ini ke dalam Bahasa Inggris (US Professional) dengan pemilihan kosakata bisnis/akademis yang elegan, alami (natural), dan akurat secara kontekstual.',
    isBuiltIn: true,
  },
  {
    id: 'pol-translate-id',
    title: 'Terjemahkan ke Bahasa Indonesia Baku (EYD)',
    category: 'poles',
    description: 'Terjemahkan teks asing ke Bahasa Indonesia yang baku, luwes, dan sesuai KBBI/EYD.',
    instruction:
      'Terjemahkan dokumen/bagian teks ini ke dalam Bahasa Indonesia yang baku, mengalir secara alami (natural), dan mematuhi kaidah Ejaan yang Disempurnakan (EYD) serta tata istilah KBBI.',
    isBuiltIn: true,
  },
  {
    id: 'pol-translate-ar',
    title: 'Terjemahkan ke Bahasa Arab Fusha',
    category: 'poles',
    description: 'Terjemahkan teks ke Bahasa Arab standar modern/fusha yang fasih dan balaghoh.',
    instruction:
      'Terjemahkan dokumen/bagian teks ini ke dalam Bahasa Arab Fusha (Standar/Klasik) dengan pemilihan diksi yang fasih, balaghoh, dan struktur gramatikal (nahwu-sharaf) yang presisi.',
    isBuiltIn: true,
  },

  // --- FORMAT AI (Layout & Word Skillset) ---
  {
    id: 'fmt-official-doc',
    title: 'Format Dokumen Resmi / Laporan Standar',
    category: 'format',
    description: 'Format heading hierarkis, spasi paragraf rapi, dan standarisasi tata letak laporan.',
    instruction:
      'Rapikan dan terapkan format standar dokumen resmi: Gunakan Heading 1 untuk Judul Bab, Heading 2 untuk Sub-bab, pastikan perataan teks justified/rapi, spasi antar paragraf konsisten, dan buat indentasi awal paragraf yang seragam.',
    isBuiltIn: true,
  },
  {
    id: 'fmt-tables',
    title: 'Standarisasi & Percantik Tabel',
    category: 'format',
    description: 'Format semua tabel dengan baris header tegas, border rapi, dan alignment tepat.',
    instruction:
      'Format dan percantik semua tabel dalam dokumen ini: Buat baris header tabel menjadi tebal (bold) dengan kontras yang jelas, pastikan lebar kolom proporsional, teks rata kiri, angka rata kanan, dan beri border tabel yang bersih.',
    isBuiltIn: true,
  },
  {
    id: 'fmt-heading-toc',
    title: 'Hierarki Heading & Struktur Daftar Isi',
    category: 'format',
    description: 'Tata ulang level Heading 1, 2, 3 agar siap dibuatkan Daftar Isi otomatis.',
    instruction:
      'Evaluasi dan rapikan seluruh struktur judul dalam dokumen. Terapkan Heading 1 untuk bagian utama, Heading 2 untuk sub-bagian, dan Heading 3 untuk rincian topik agar struktur hierarki dokumen sempurna untuk Daftar Isi.',
    isBuiltIn: true,
  },
  {
    id: 'fmt-kti-skripsi',
    title: 'Format Karya Tulis Ilmiah / Skripsi',
    category: 'format',
    description: 'Format standar KTI: BAB Huruf Kapital di tengah, Sub-bab Heading 2, penomoran rapi.',
    instruction:
      'Format dokumen ini sesuai panduan Karya Tulis Ilmiah/Skripsi: Judul BAB dibuat Heading 1 di tengah (Uppercase), Sub-bab menggunakan penomoran hierarkis (1.1, 1.2, dst) dengan Heading 2, kutipan panjang diatur menjorok, dan daftar referensi/pustaka dirapikan.',
    isBuiltIn: true,
  },
  {
    id: 'fmt-lists-numbering',
    title: 'Seragamkan Bullet & Penomoran (List)',
    category: 'format',
    description: 'Rapikan daftar list yang berantakan agar indentasi dan penomorannya seragam.',
    instruction:
      'Identifikasi seluruh daftar berpoin (bullet) dan penomoran (numbered list) di dokumen ini. Seragamkan gaya simbol bullet, urutkan penomoran yang terputus, dan pastikan jarak indentasi list rata dan konsisten.',
    isBuiltIn: true,
  },
]

const STORAGE_KEY = 'genoffice_custom_prompt_presets'
const EVENT_KEY = 'genoffice:prompt-presets-changed'

/**
 * Load all prompt presets from localStorage, falling back to built-ins if empty or corrupted.
 */
export function getPromptPresets(): PromptPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(BUILTIN_PROMPT_PRESETS))
      return BUILTIN_PROMPT_PRESETS
    }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
  } catch (err) {
    console.error('Failed to parse prompt presets from localStorage:', err)
  }
  return BUILTIN_PROMPT_PRESETS
}

/**
 * Get presets filtered by category ('ringkasan' | 'poles' | 'format' | 'all')
 */
export function getPresetsByCategory(category?: string): PromptPreset[] {
  const all = getPromptPresets()
  if (!category || category === 'all') return all
  return all.filter((p) => p.category.toLowerCase() === category.toLowerCase())
}

/**
 * Save or update a prompt preset
 */
export function savePromptPreset(preset: Omit<PromptPreset, 'id'> & { id?: string }): PromptPreset {
  const all = getPromptPresets()
  const id = preset.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const record: PromptPreset = {
    ...preset,
    id,
    updatedAt: new Date().toISOString(),
  }

  const index = all.findIndex((p) => p.id === id)
  let updatedList: PromptPreset[]
  if (index >= 0) {
    updatedList = [...all]
    updatedList[index] = { ...all[index], ...record }
  } else {
    updatedList = [record, ...all]
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList))
  window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: { presets: updatedList } }))
  return record
}

/**
 * Delete a custom prompt preset by ID
 */
export function deletePromptPreset(id: string): boolean {
  const all = getPromptPresets()
  const filtered = all.filter((p) => p.id !== id)
  if (filtered.length !== all.length) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: { presets: filtered } }))
    return true
  }
  return false
}

/**
 * Reset presets back to default built-ins
 */
export function resetDefaultPresets(): PromptPreset[] {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(BUILTIN_PROMPT_PRESETS))
  window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: { presets: BUILTIN_PROMPT_PRESETS } }))
  return BUILTIN_PROMPT_PRESETS
}

/**
 * Hook or helper to subscribe to prompt presets updates
 */
export function subscribePromptPresets(callback: (presets: PromptPreset[]) => void): () => void {
  const handler = () => {
    callback(getPromptPresets())
  }
  window.addEventListener(EVENT_KEY, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(EVENT_KEY, handler)
    window.removeEventListener('storage', handler)
  }
}
