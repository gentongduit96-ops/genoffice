/**
 * Page Analyzer Service for AI Document Review & Seamless Commenting.
 *
 * Runs page-by-page AI evaluation in the background without opening the chat panel,
 * extracts exact text quotes, anchors them to ProseMirror ranges, and inserts
 * structured Word comment balloons and edit suggestions.
 */
import type { Editor } from '@tiptap/core'
import type { CommentInfo } from '@genoffice/docx-engine'
import type { Lang } from '@genoffice/i18n'
import { getLang } from '../i18n/locale'
import { addCommentToRange, nextCommentId } from '../editor/comments'

const LANGUAGE_NAMES: Record<Lang, string> = {
  id: 'Bahasa Indonesia (Indonesian)',
  en: 'English',
  ar: 'العربية (Arabic)',
  zh: '简体中文 (Simplified Chinese)',
  'zh-TW': '繁體中文 (Traditional Chinese)',
  ja: '日本語 (Japanese)',
  ko: '한국어 (Korean)',
  fr: 'Français (French)',
  de: 'Deutsch (German)',
  es: 'Español (Spanish)',
  pt: 'Português (Portuguese)',
  it: 'Italiano (Italian)',
  ru: 'Русский (Russian)',
  nl: 'Nederlands (Dutch)',
  pl: 'Polski (Polish)',
  ms: 'Bahasa Melayu (Malay)',
  th: 'ไทย (Thai)',
  hi: 'हिन्दी (Hindi)',
  he: 'עברית (Hebrew)',
  cs: 'Čeština (Czech)',
}

/**
 * Builds the system prompt for page analysis, configuring the introductory
 * and commentary language to strictly match the application UI language.
 */
export function buildSystemPromptPageAnalyzer(lang: Lang = getLang()): string {
  const targetLanguage = LANGUAGE_NAMES[lang] || 'Bahasa Indonesia'

  return `
You are an advanced autonomous document reviewer and editor embedded in Microsoft Word (.docx).
Your task is to analyze the provided text of a document page according to the user's analytical guidelines, identify specific words, phrases, or sentences that need correction, suggestions, or comments, and return your findings in strict JSON format.

LANGUAGE OF THE COMMENTARY & EXPLANATIONS:
- All analysis explanations, reasons, rules, and commentary inside the "comment" field MUST be written in: ${targetLanguage}.
- If the user prompt specifically instructs another language or if analyzing Classical Arabic (Turats) where specific Arabic terms/dalil are quoted, write the analytical explanations and introductory sentences in ${targetLanguage} while keeping religious/linguistic citations and corrected texts ("suggestion" / "quote") in their original language.

CRITICAL INSTRUCTIONS:
1. You must output ONLY a valid JSON object matching this schema:
{
  "findings": [
    {
      "quote": "EXACT substring from the provided page text that will be highlighted and commented on",
      "comment": "Structured comment content containing analysis, reasons, rules, or references (written in ${targetLanguage})",
      "suggestion": "Suggested replacement text with proper vowels/harakat/grammar if applicable (or null/empty)"
    }
  ]
}
2. "quote" MUST be an EXACT, literal substring extracted from the provided text so that the system can locate and highlight it on the document. Do not modify or summarize the quote text.
3. If no issues or improvements are found on this page, return {"findings": []}.
4. Do NOT wrap the JSON in markdown code fences (\`\`\`json) if possible, or ensure it is clean parsable JSON without any conversational preamble or outro text.
`.trim()
}

export const SYSTEM_PROMPT_PAGE_ANALYZER = buildSystemPromptPageAnalyzer('id')

export interface AnalysisPreset {
  id: string
  labelKey: string
  title: string
  icon: string
  description: string
  prompt: string
}

/**
 * Curated Prompt Gallery Presets (Customizable by user in the UI)
 */
export const ANALYSIS_PRESETS: AnalysisPreset[] = [
  {
    id: 'turats_arabic',
    labelKey: 'presetTuratsArabic',
    title: 'Editor Kitab Turats & Linguistik Arab',
    icon: '📜',
    description: 'Analisis 8 aspek: Huruf \'Illat, Nahwu, Sharaf, Hamzah, Imla\', Tahqiq Naskah, Balaghah, dan Rujukan Kitab.',
    prompt: `# Role & Expertise
Kamu adalah seorang Editor Kitab Turats dan Pakar Senior Linguistik Arab Klasik yang memiliki akses dan kemampuan untuk menyunting serta menambahkan Komentar/Catatan (*Word Comments & Highlight*) langsung ke dalam dokumen Microsoft Word (\`.docx\`).

# Main Task
Tugas utamanya adalah memeriksa teks Arab/kitab di dalam dokumen \`.docx\` yang diberikan, lalu **memberikan fitur Komentar (Word Comment) pada kata/kalimat spesifik yang disorot (diblok)** untuk memberikan koreksi, catatan, dan usulan harakat/i'rab berdasarkan 8 Aspek Keilmuan.

---

# 8 Aspek Analisis Utama
Setiap komentar yang ditambahkan ke dalam dokumen Word harus mencakup aspek yang relevan dari 8 kriteria berikut:

1. **Huruf 'Illat Akhir:** Identifikasi kata yang berakhiran huruf 'illat. Jelaskan apakah itu Alif (ا/ى) atau Ya' (ي) beserta alasan morfologisnya, serta **usulan kata ber-harakat penuh**.
2. **Nahwu:** Analisis status i'rab lengkap jika ditemukan kekeliruan struktur kalimat.
3. **Sharaf:** Bedah wazan (pola), bentuk kata, dan asal kata (*ashl al-kalimah*).
4. **Hamzah:** Tentukan jenis hamzah (Hamzah Qath' atau Washl) dan kaidah penulisannya.
5. **Imla':** Periksa ejaan Arab klasik maupun modern (termasuk kedudukan hamzah dan alif maqshurah).
6. **Tahqiq Naskah:** Deteksi dugaan salah cetak, *tashif* (titik tertukar), *tahrif* (perubahan huruf/kata), atau variasi naskah (*ikhtilaf an-nuskhat*).
7. **Balaghah & Uslub:** Catatan tentang keunikan estetika bahasa, ketepatan redaksi, atau gaya bahasa (*uslub*).
8. **Referensi Kitab Mu'tabar:** Sertakan dalil/rujukan akademis (seperti *Syarh Ibn 'Aqil*, *Mughni al-Labib*, *Syadza al-'Arf*, atau kitab *imla'* klasik/modern) untuk memperkuat usulan perubahan.

---

# Format Komentar yang Diharapkan:
- 📌 **Usulan Teks (Ber-harakat):** [Tulis kata/kalimat perbaikan lengkap dengan harakat]
- 💡 **Analisis & Alasan:** [Penjelasan ringkas poin Nahwu/Sharaf/Imla'/Huruf 'Illat]
- 📚 **Referensi:** [Nama kitab mu'tabar & kaidah yang digunakan]`,
  },
  {
    id: 'indonesian_grammar',
    labelKey: 'presetIndonesianGrammar',
    title: 'Tata Bahasa & Ejaan (EYD / PUEBI)',
    icon: '✍️',
    description: 'Koreksi ejaan baku, kata serapan, huruf kapital, tanda baca, serta struktur kalimat efektif.',
    prompt: `Periksa ketepatan tata bahasa Indonesia, ejaan baku sesuai EYD/PUEBI/KBBI, penulisan huruf kapital, kata depan, imbuhan, dan tanda baca.
Identifikasi setiap kata, frasa, atau kalimat yang keliru atau kurang efektif, lalu berikan saran perbaikan yang baku dan komunikatif.

Format Komentar:
- 📌 **Usulan Perbaikan:** [Teks perbaikan yang benar]
- 💡 **Kaidah & Alasan:** [Penjelasan aturan ejaan atau tata bahasa yang berlaku]`,
  },
  {
    id: 'academic_clarity',
    labelKey: 'presetAcademicClarity',
    title: 'Kejelasan Kalimat & Gaya Akademik',
    icon: '💡',
    description: 'Penyempurnaan gaya bahasa formal, terminologi baku, eliminasi ambiguitas, dan kelugasan kalimat.',
    prompt: `Evaluasi kualitas penulisan dari segi kejelasan, formalitas nada akademik/ilmiah, konsistensi terminologi, dan kelugasan bahasa.
Tandai kalimat yang berbelit-belit (wordy), rancu, atau tidak formal, dan berikan alternatif susunan kalimat yang lebih tajam dan ringkas.

Format Komentar:
- 📌 **Rekomendasi Redaksi:** [Alternatif kalimat yang lebih ringkas dan lugas]
- 💡 **Evaluasi Gaya Bahasa:** [Poin analisis kejelasan atau formalitas kalimat]`,
  },
  {
    id: 'logic_structure',
    labelKey: 'presetLogicStructure',
    title: 'Struktur Logika & Koherensi Alur',
    icon: '🏛️',
    description: 'Evaluasi kesinambungan ide antarkalimat, kekuatan premis argumen, dan kata transisi paragraf.',
    prompt: `Periksa koherensi dan alur logika berpikir antar-kalimat dan antar-paragraf.
Tandai loncatan logika, hubungan sebab-akibat yang lemah, kontradiksi implisit, atau kata transisi yang kurang tepat.

Format Komentar:
- 📌 **Saran Alur:** [Saran perbaikan transisi atau penyambung argumen]
- 💡 **Catatan Logika:** [Analisis kelemahan alur atau hubungan ide]`,
  },
  {
    id: 'fact_conciseness',
    labelKey: 'presetFactConciseness',
    title: 'Pemeriksaan Redundansi & Klaim Ambigu',
    icon: '🔍',
    description: 'Deteksi pemborosan kata berulang (tautologi), kalimat multitafsir, dan generalisasi klaim yang berlebihan.',
    prompt: `Cari dan tandai pengulangan kata/makna yang mubazir (tautologi/redundansi), klaim yang terlalu menggeneralisir tanpa dasar yang jelas, atau kalimat ambigu.

Format Komentar:
- 📌 **Teks Efisien:** [Versi ringkas tanpa kata mubazir]
- 💡 **Poin Redundansi/Ambiguitas:** [Alasan pemborosan kata atau potensi salah paham]`,
  },
  {
    id: 'custom',
    labelKey: 'presetCustom',
    title: 'Kustom (Instruksi Bebas)',
    icon: '⚙️',
    description: 'Tuliskan instruksi analisis dan parameter review dokumen sesuai kebutuhan spesifik Anda.',
    prompt: `Silakan analisis halaman dokumen ini dan tandai bagian penting yang memerlukan koreksi atau catatan. Berikan ulasan mendalam pada setiap bagian yang ditandai.`,
  },
]

export interface PageTextRange {
  pageIndex: number
  pageNumber: number // 1-based
  text: string
  blockFroms: number[]
  startPos: number
  endPos: number
}

/**
 * Extracts page text slices and their ProseMirror document position ranges.
 */
export function extractDocumentPages(
  editor: Editor,
  totalPagesHint?: number,
): PageTextRange[] {
  const doc = editor.state.doc
  const pages: PageTextRange[] = []

  // 1. Check if .pagination-preview .pv-page preview elements exist in DOM for exact page slicing
  const pvPages = Array.from(document.querySelectorAll<HTMLElement>('.pagination-preview .pv-page'))
  if (pvPages.length > 0) {
    pvPages.forEach((pvPage, idx) => {
      const text = (pvPage.innerText || pvPage.textContent || '').trim()
      pages.push({
        pageIndex: idx,
        pageNumber: idx + 1,
        text,
        blockFroms: [],
        startPos: 0,
        endPos: doc.content.size,
      })
    })
    if (pages.length > 0) return pages
  }

  // 2. Check live DOM page gaps in .editor-scroll .doc-page (.ProseMirror)
  const pmEl =
    document.querySelector<HTMLElement>('.editor-scroll .doc-page.ProseMirror') ||
    document.querySelector<HTMLElement>('.ProseMirror')

  if (pmEl) {
    const gaps = Array.from(
      pmEl.querySelectorAll<HTMLElement>('.page-gap:not(.page-gap-carry), .page-repeat-header'),
    )

    if (gaps.length > 0) {
      const children = Array.from(pmEl.children) as HTMLElement[]
      const pageBuckets: { text: string; startPos: number; endPos: number }[] = []
      let currentBucket = { text: '', startPos: 0, endPos: doc.content.size }
      let gapIdx = 0

      let blockIdx = 0
      doc.forEach((node, pos) => {
        const domNode = children[blockIdx]
        if (domNode && gapIdx < gaps.length) {
          const gap = gaps[gapIdx]
          if (gap && (domNode.compareDocumentPosition(gap) & Node.DOCUMENT_POSITION_PRECEDING)) {
            pageBuckets.push({ ...currentBucket, endPos: pos })
            currentBucket = { text: '', startPos: pos, endPos: doc.content.size }
            gapIdx++
          }
        }
        const blockText = node.textContent
        if (blockText) {
          currentBucket.text += blockText + '\n'
        }
        blockIdx++
      })
      pageBuckets.push(currentBucket)

      if (pageBuckets.length > 1) {
        return pageBuckets.map((bucket, idx) => ({
          pageIndex: idx,
          pageNumber: idx + 1,
          text: bucket.text.trim(),
          blockFroms: [],
          startPos: bucket.startPos,
          endPos: bucket.endPos,
        }))
      }
    }
  }

  // 3. Fallback: Slice document blocks by paragraph breaks or explicit page breaks
  let currentPageIndex = 0
  let currentText = ''
  let currentStart = 0
  let currentBlockFroms: number[] = []

  doc.forEach((node, pos) => {
    const isPageBreakBefore = Boolean(node.attrs?.pageBreakBefore)
    const isExplicitBreak = node.type.name === 'pageBreak' || node.attrs?.pageBreak

    if ((isPageBreakBefore || isExplicitBreak) && currentText.trim().length > 0) {
      pages.push({
        pageIndex: currentPageIndex,
        pageNumber: currentPageIndex + 1,
        text: currentText.trim(),
        blockFroms: [...currentBlockFroms],
        startPos: currentStart,
        endPos: pos,
      })
      currentPageIndex++
      currentText = ''
      currentStart = pos
      currentBlockFroms = []
    }

    currentBlockFroms.push(pos)
    const blockText = node.textContent
    if (blockText) {
      currentText += blockText + '\n'
    }
  })

  // Final remaining page
  pages.push({
    pageIndex: currentPageIndex,
    pageNumber: currentPageIndex + 1,
    text: currentText.trim() || doc.textContent || '',
    blockFroms: [...currentBlockFroms],
    startPos: currentStart,
    endPos: doc.content.size,
  })

  // 4. If totalPagesHint is given and higher than detected pages, divide blocks evenly across totalPagesHint
  if (totalPagesHint && totalPagesHint > 1 && pages.length < totalPagesHint) {
    const totalBlocks = doc.childCount
    const blocksPerPage = Math.max(1, Math.ceil(totalBlocks / totalPagesHint))
    const hintedPages: PageTextRange[] = []
    let pIdx = 0
    let curTxt = ''
    let curStart = 0
    let bCount = 0

    doc.forEach((node, pos) => {
      if (bCount > 0 && bCount % blocksPerPage === 0 && pIdx < totalPagesHint - 1) {
        hintedPages.push({
          pageIndex: pIdx,
          pageNumber: pIdx + 1,
          text: curTxt.trim(),
          blockFroms: [],
          startPos: curStart,
          endPos: pos,
        })
        pIdx++
        curTxt = ''
        curStart = pos
      }
      const blockText = node.textContent
      if (blockText) curTxt += blockText + '\n'
      bCount++
    })

    hintedPages.push({
      pageIndex: pIdx,
      pageNumber: pIdx + 1,
      text: curTxt.trim() || doc.textContent || '',
      blockFroms: [],
      startPos: curStart,
      endPos: doc.content.size,
    })

    return hintedPages
  }

  return pages
}

/**
 * Normalizes Arabic diacritics / harakat for fuzzy match fallback.
 */
function stripArabicDiacritics(str: string): string {
  // Removes Harakat (fathah, kasrah, dhammah, tanwin, sukun, shaddah, dagger alif, etc.)
  return str.replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '')
}

/**
 * Finds the exact or diacritic-normalized ProseMirror [from, to] character range for a quote.
 */
export function findQuoteRange(
  editor: Editor,
  quote: string,
  _pageHint?: { startPos: number; endPos: number },
): { from: number; to: number } | null {
  const doc = editor.state.doc
  const cleanQuote = quote.trim()
  if (!cleanQuote) return null

  // 1. Direct Search across text blocks
  let foundRange: { from: number; to: number } | null = null

  doc.descendants((node, pos) => {
    if (foundRange) return false
    if (!node.isTextblock) return true

    const text = node.textContent
    if (!text) return true

    // Direct exact match inside this block
    const exactIdx = text.indexOf(cleanQuote)
    if (exactIdx !== -1) {
      // Find the text node offset within the parent block
      const startInBlock = exactIdx
      const endInBlock = exactIdx + cleanQuote.length
      const blockStart = pos + 1 // inside block
      foundRange = {
        from: blockStart + startInBlock,
        to: blockStart + endInBlock,
      }
      return false
    }

    // Normalized match (case-insensitive & whitespace trimmed)
    const normText = text.toLowerCase()
    const normQuote = cleanQuote.toLowerCase()
    const normIdx = normText.indexOf(normQuote)
    if (normIdx !== -1) {
      const blockStart = pos + 1
      foundRange = {
        from: blockStart + normIdx,
        to: blockStart + normIdx + cleanQuote.length,
      }
      return false
    }

    // Arabic diacritics stripped fallback
    const strippedText = stripArabicDiacritics(text)
    const strippedQuote = stripArabicDiacritics(cleanQuote)
    if (strippedQuote.length >= 3) {
      const stripIdx = strippedText.indexOf(strippedQuote)
      if (stripIdx !== -1) {
        // Approximate to full block or segment
        const blockStart = pos + 1
        foundRange = {
          from: blockStart,
          to: Math.min(pos + node.nodeSize - 1, blockStart + text.length),
        }
        return false
      }
    }

    return true
  })

  if (foundRange) return foundRange

  // 2. Full document text search if quote spans nodes
  const fullText = doc.textBetween(0, doc.content.size, '\n', '\n')
  const fullIdx = fullText.indexOf(cleanQuote)
  if (fullIdx !== -1) {
    return {
      from: Math.max(1, fullIdx),
      to: Math.min(doc.content.size, fullIdx + cleanQuote.length),
    }
  }

  return null
}

export interface AiFinding {
  quote: string
  comment: string
  suggestion?: string | null
}

export interface AnalysisProgressInfo {
  currentPage: number
  totalPages: number
  pageNumber: number
  commentsAddedCount: number
  status: 'running' | 'completed' | 'error' | 'cancelled'
  errorMessage?: string
}

export interface PageAnalysisOptions {
  editor: Editor
  totalPagesHint?: number
  selectedPageIndices: number[] // 0-based page indices
  userPrompt: string
  includeSuggestions?: boolean
  comments: CommentInfo[]
  setComments: (updater: (prev: CommentInfo[]) => CommentInfo[]) => void
  setCommentsDirty: (dirty: boolean) => void
  setShowComments: (show: boolean) => void
  onProgress?: (progress: AnalysisProgressInfo) => void
  signal?: AbortSignal
}

/**
 * Runs page-by-page AI evaluation in the background seamlessly.
 */
export async function executePageAnalysis({
  editor,
  totalPagesHint,
  selectedPageIndices,
  userPrompt,
  comments,
  setComments,
  setCommentsDirty,
  setShowComments,
  onProgress,
  signal,
}: PageAnalysisOptions): Promise<{ totalAdded: number; cancelled: boolean }> {
  const allPages = extractDocumentPages(editor, totalPagesHint)
  const targetPages = allPages.filter((_, idx) => selectedPageIndices.includes(idx))

  let totalCommentsAdded = 0
  let latestComments = [...comments]

  for (let i = 0; i < targetPages.length; i++) {
    if (signal?.aborted) {
      onProgress?.({
        currentPage: i + 1,
        totalPages: targetPages.length,
        pageNumber: targetPages[i]?.pageNumber ?? (i + 1),
        commentsAddedCount: totalCommentsAdded,
        status: 'cancelled',
      })
      return { totalAdded: totalCommentsAdded, cancelled: true }
    }

    const page = targetPages[i]
    if (!page) continue

    onProgress?.({
      currentPage: i + 1,
      totalPages: targetPages.length,
      pageNumber: page.pageNumber,
      commentsAddedCount: totalCommentsAdded,
      status: 'running',
    })

    const pageText = page.text.trim()
    if (!pageText) continue

    try {
      if (!window.desktop?.aiChat || !window.desktop?.getAiSettings) {
        throw new Error('AI backend service is not available in desktop environment.')
      }

      const settings = await window.desktop.getAiSettings()
      const systemPrompt = buildSystemPromptPageAnalyzer()

      const response = await window.desktop.aiChat({
        settings,
        system: systemPrompt,
        user: `INSTRUKSI ANALISIS / USER GUIDELINES:\n${userPrompt}\n\n====================\nTEKS DOKUMEN HALAMAN ${page.pageNumber}:\n====================\n${pageText}`,
      })

      if (signal?.aborted) {
        return { totalAdded: totalCommentsAdded, cancelled: true }
      }

      if (response && response.ok && response.content) {
        const rawContent = response.content || ''
        const findings = parseAiFindingsResponse(rawContent)

        let pageAdded = 0
        const newCommentsBatch: CommentInfo[] = []

        for (const finding of findings) {
          if (!finding.quote || !finding.comment) continue

          const range = findQuoteRange(editor, finding.quote, {
            startPos: page.startPos,
            endPos: page.endPos,
          })

          if (range && range.from < range.to) {
            const newId = nextCommentId([...latestComments, ...newCommentsBatch])

            const applied = addCommentToRange(editor, newId, range.from, range.to)
            if (applied) {
              const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
              let commentBody = finding.comment.trim()

              if (finding.suggestion && finding.suggestion.trim()) {
                commentBody += `\n\n📌 **Usulan Teks:**\n${finding.suggestion.trim()}`
              }

              const newComment: CommentInfo = {
                id: newId,
                author: 'AI Reviewer',
                initials: 'AI',
                date: now,
                text: commentBody,
              }

              newCommentsBatch.push(newComment)
              pageAdded++
              totalCommentsAdded++
            }
          }
        }

        if (newCommentsBatch.length > 0) {
          latestComments = [...latestComments, ...newCommentsBatch]
          setComments((prev) => [...prev, ...newCommentsBatch])
          setCommentsDirty(true)
          setShowComments(true)
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error(`Error analyzing page ${page.pageNumber}:`, err)
      onProgress?.({
        currentPage: i + 1,
        totalPages: targetPages.length,
        pageNumber: page.pageNumber,
        commentsAddedCount: totalCommentsAdded,
        status: 'error',
        errorMessage: errMsg,
      })
    }
  }

  onProgress?.({
    currentPage: targetPages.length,
    totalPages: targetPages.length,
    pageNumber: targetPages[targetPages.length - 1]?.pageNumber ?? targetPages.length,
    commentsAddedCount: totalCommentsAdded,
    status: 'completed',
  })

  return { totalAdded: totalCommentsAdded, cancelled: false }
}

/**
 * Robust JSON extraction from LLM response string.
 */
export function parseAiFindingsResponse(raw: string): AiFinding[] {
  try {
    let clean = raw.trim()

    // Strip markdown code fences if present
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    }

    // Find opening and closing braces
    const firstBrace = clean.indexOf('{')
    const lastBrace = clean.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.substring(firstBrace, lastBrace + 1)
    }

    const parsed = JSON.parse(clean)
    if (parsed && Array.isArray(parsed.findings)) {
      return parsed.findings
    }
    if (Array.isArray(parsed)) {
      return parsed
    }
    return []
  } catch (err) {
    console.warn('Failed to parse AI findings JSON:', err, raw)
    return []
  }
}
