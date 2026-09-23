import type { PDFDocumentProxy } from 'pdfjs-dist'
import { marked } from 'marked'

export interface VisionProviderConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export const DEFAULT_VISION_CONFIG: VisionProviderConfig = {
  baseUrl: 'https://ai.sumopod.com/v1',
  apiKey: 'sk-2DyeaNslcr93j-i51xq8Hw',
  model: 'seed-2-0-mini',
}

const STORAGE_KEY = 'manuscriber.vision.config'

export function getVisionConfig(): VisionProviderConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        baseUrl: parsed.baseUrl || DEFAULT_VISION_CONFIG.baseUrl,
        apiKey: parsed.apiKey || DEFAULT_VISION_CONFIG.apiKey,
        model: parsed.model || DEFAULT_VISION_CONFIG.model,
      }
    }
  } catch { }
  return { ...DEFAULT_VISION_CONFIG }
}

export function saveVisionConfig(config: Partial<VisionProviderConfig>): VisionProviderConfig {
  const current = getVisionConfig()
  const next = { ...current, ...config }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch { }
  return next
}

export const MANUSCRIPT_TRANSCRIPTION_PROMPT = `
You are an expert paleographer, philologist, and specialized classical Islamic text muhaqqiq (manuscript editor) AI.
Your task is to analyze and transcribe ALL text from this classical manuscript or printed Turats page image (e.g., I'anatut Thalibin, Fathul Mu'in, Fathul Qarib, etc.) with 100% verbatim completeness and multi-column structural awareness.

=== LAYOUT & MULTI-COLUMN STRUCTURE ANALYSIS ===
Classical Turats books often feature complex multi-column and layered layouts:
1. Heading (Judul / Bismillah / Title): Prominent top titles, Bismillah, chapter headings, or book headers spanning horizontally.
2. Matan (Core Text): Primary foundational text, often at the top, center block, or bracketed > (وَقَوْلُهُ: ...).
3. Syarah (Commentary): Explanation flowing continuously in paragraphs around or below the Matan.
4. Hasyiah / Ta'liqat (Marginal Notes & Bottom Footnotes): Notes separated by horizontal lines (---) or placed in outer side margins.
5. Nadzom (Poetic Verses): Two symmetrical hemistichs separated by an asterisk *.

=== OUTPUT FORMAT & ACCURATE SPATIAL SPOTLIGHT BOUNDING BOXES ===
Produce structured output. For each coherent paragraph block or structural section detected on the page, format it clearly with block labels and estimated spatial bounding box coordinates [ymin, xmin, ymax, xmax] scaled to a normalized 0-1000 integer grid (where 0,0 is top-left and 1000,1000 is bottom-right).

Format each block as:
[[BLOCK: type=matan|syarah|hasyiah|margin|nadzom|heading, bbox=[ymin,xmin,ymax,xmax]]]
Full coherent paragraph text here with harakat and punctuation preserved verbatim.
[[END_BLOCK]]

=== SPATIAL BOUNDING BOX RULES ===
- ymin: Top edge percentage (0 to 1000)
- xmin: Leftmost edge percentage (0 to 1000)
- ymax: Bottom edge percentage (0 to 1000)
- xmax: Rightmost edge percentage (0 to 1000)

CRITICAL BOUNDING BOX EXAMPLES & ORIENTATION:
- Headings & Titles: Wide horizontal blocks spanning horizontally across the page (e.g. bbox=[180, 150, 240, 850]).
- Side-by-Side Vertical Columns (Kanan & Kiri / Multi-column layout):
  - Right Column (Kanan): Tall vertical block running top-to-bottom on the right side (e.g. bbox=[50, 500, 950, 960] where xmin=500, xmax=960, ymin=50, ymax=950).
  - Left Column (Kiri): Tall vertical block running top-to-bottom on the left side (e.g. bbox=[50, 40, 950, 480] where xmin=40, xmax=480, ymin=50, ymax=950).
- Side Margin Notes: Vertical blocks in outer left or right margins (e.g. bbox=[300, 40, 800, 220] for left margin, bbox=[300, 780, 800, 960] for right margin).

=== STRICT RULES ===
1. PURE VISUAL TRANSCRIPTION: Transcribe ONLY physically visible text. Never hallucinate or retrieve from memory.
2. PARAGRAPH-LEVEL COHERENCE: Merge broken visual lines within a column into full, coherent prose paragraphs. Do NOT break sentences mid-line.
3. UNREADABLE TEXT: Mark damaged/blurry text as [غير مقروء] or [؟].
4. Verse & Sacred Text: Enclose Qur'an in ﴿ ... ﴾, Hadith in « ... ».
`.trim()

/**
 * Render a single PDF page to an offscreen HTML5 canvas at high DPI (e.g. 2.0x)
 * and return the image as a base64 PNG data URL.
 */
export async function capturePdfPageAsDataUrl(
  doc: PDFDocumentProxy,
  pageNo: number,
  scale = 2.0,
): Promise<string> {
  const page = await doc.getPage(pageNo)
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)

  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Failed to obtain 2D canvas context')

  // White background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const renderTask = page.render({
    canvas,
    viewport,
  })

  await renderTask.promise
  return canvas.toDataURL('image/png', 0.95)
}

export interface TranscriptionResult {
  ok: boolean
  text: string
  html: string
  error?: string
  isRtl?: boolean
}

/**
 * Detects if a text contains predominantly Right-to-Left (Arabic, Hebrew, Persian, etc.) characters
 */
export function isRtlText(text: string): boolean {
  const rtlChars = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/
  return rtlChars.test(text)
}

/**
 * Direct call to OpenAI-compatible Vision API
 */
async function callDirectVisionApi(
  dataUrl: string,
  prompt: string,
  config: VisionProviderConfig,
): Promise<string> {
  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 4000,
    }),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`Vision API (${res.status}): ${errorBody}`)
  }

  const json = await res.json()
  const content = json.choices?.[0]?.message?.content ?? ''
  if (!content) throw new Error('No content returned from Vision AI')
  return content
}

/**
 * Transcribes a PDF page image using Vision AI.
 */
export async function transcribePageImage(
  dataUrl: string,
  customPrompt?: string,
): Promise<TranscriptionResult> {
  const prompt = customPrompt || MANUSCRIPT_TRANSCRIPTION_PROMPT
  const config = getVisionConfig()

  try {
    let rawText = ''

    if (config.apiKey && config.baseUrl) {
      try {
        rawText = await callDirectVisionApi(dataUrl, prompt, config)
      } catch (directErr) {
        console.warn('Direct Vision API failed, falling back to desktop bridge:', directErr)
        if (window.desktop?.analyzeMedia) {
          const res = await window.desktop.analyzeMedia({
            mediaUrls: [dataUrl],
            requirements: prompt,
          })
          if (res.error) throw new Error(res.error)
          rawText = (res.text ?? '').trim()
        } else {
          throw directErr
        }
      }
    } else if (window.desktop?.analyzeMedia) {
      const res = await window.desktop.analyzeMedia({
        mediaUrls: [dataUrl],
        requirements: prompt,
      })
      if (res.error) return { ok: false, text: '', html: '', error: res.error }
      rawText = (res.text ?? '').trim()
    } else {
      throw new Error('No Vision AI configuration or backend available.')
    }

    rawText = rawText.trim()
    if (!rawText) {
      return { ok: false, text: '', html: '', error: 'Tidak ada teks yang terdeteksi dari Vision AI.' }
    }

    // Clean up markdown block fences if any
    if (rawText.startsWith('```markdown')) {
      rawText = rawText.replace(/^```markdown\n/, '').replace(/\n```$/, '')
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '')
    }

    const rtl = isRtlText(rawText)
    const html = await marked.parse(rawText)

    return { ok: true, text: rawText, html, isRtl: rtl }
  } catch (err) {
    const msg = String(err).replace(/^Error:\s*/, '')
    return { ok: false, text: '', html: '', error: msg }
  }
}

export type BlockType = 'matan' | 'syarah' | 'hasyiah' | 'margin' | 'nadzom' | 'heading'

export interface StagingBlockItem {
  id: string
  lineNumber: number
  rawText: string
  correctedText: string
  bbox?: [number, number, number, number]
  confidenceScore: number
  status: 'unverified' | 'verified' | 'flagged' | 'edited'
  blockType?: BlockType
  columnIndex?: number
  candidates?: string[]
  auditNotes?: string
}

/**
 * Parses OCR transcription into multi-column Paragraph Blocks.
 * Supports structured [[BLOCK:...]] tags or falls back to intelligent paragraph splitting.
 */
export function parseTranscriptionToStagingLines(
  rawText: string,
  pageWidth?: number,
  pageHeight?: number,
): StagingBlockItem[] {
  const result: StagingBlockItem[] = []

  // Pre-clean raw text if wrapped in codeblocks
  let cleanedText = rawText.trim()
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim()
  }

  // Calculate Vision API letterbox padding parameters if page dimensions are provided
  let padX = 0
  let padY = 0
  let scaleX = 1.0
  let scaleY = 1.0

  if (pageWidth && pageHeight && pageWidth > 0 && pageHeight > 0) {
    if (pageHeight > pageWidth) {
      // Portrait page (standard for manuscript books): Vision API letterboxes horizontally into 1:1 square
      const ratio = pageWidth / pageHeight
      const contentWidth = 1000 * ratio
      padX = (1000 - contentWidth) / 2
      scaleX = 1000 / contentWidth
    } else if (pageWidth > pageHeight) {
      // Landscape page: Vision API letterboxes vertically into 1:1 square
      const ratio = pageHeight / pageWidth
      const contentHeight = 1000 * ratio
      padY = (1000 - contentHeight) / 2
      scaleY = 1000 / contentHeight
    }
  }

  // Flexible block parser regex matching any variant of [[BLOCK: type=..., bbox=[...]]]
  const blockRegex = /(?:\[{1,2}|<)BLOCK:?\s*(?:type=)?([a-zA-Z0-9_-]+)?(?:[,\s]+bbox=\[?([0-9,\-\. ]+)\]?)?(?:\]{1,2}|>)([\s\S]*?)(?:(?:\[{1,2}|<)\/?END_BLOCK(?:\]{1,2}|>)|(?=(?:\[{1,2}|<)BLOCK)|$)/gi

  let match: RegExpExecArray | null
  let blockIdx = 0

  while ((match = blockRegex.exec(cleanedText)) !== null) {
    const rawType = (match[1] || 'syarah').toLowerCase()
    const bboxStr = match[2]
    const rawContent = match[3] || ''

    // Clean internal block tags from content
    let content = rawContent
      .replace(/\[{1,2}\/?END_BLOCK\]{1,2}/gi, '')
      .replace(/\[{1,2}BLOCK:.*?\]{1,2}/gi, '')
      .trim()

    if (!content) continue

    blockIdx++

    // Map raw type string to valid BlockType
    let typeStr: BlockType = 'syarah'
    if (rawType.includes('head') || rawType.includes('title') || rawType.includes('judul')) {
      typeStr = 'heading'
    } else if (rawType.includes('matan')) {
      typeStr = 'matan'
    } else if (rawType.includes('hasy') || rawType.includes('foot') || rawType.includes('note')) {
      typeStr = 'hasyiah'
    } else if (rawType.includes('marg') || rawType.includes('side')) {
      typeStr = 'margin'
    } else if (rawType.includes('nadz') || rawType.includes('verse') || rawType.includes('poem')) {
      typeStr = 'nadzom'
    }

    // Collapse internal newlines into spaces for prose paragraphs to prevent empty line gaps
    if (typeStr !== 'nadzom') {
      content = content.replace(/\s*\n\s*/g, ' ').replace(/ {2,}/g, ' ')
    }

    let bbox: [number, number, number, number] | undefined = undefined
    if (bboxStr) {
      const nums = bboxStr.split(',').map((n) => parseInt(n.trim(), 10))
      if (nums.length === 4 && !nums.some(isNaN)) {
        const [n0, n1, n2, n3] = nums

        let ymin = 0
        let xmin = 0
        let ymax = 0
        let xmax = 0

        if (n2 > n0 && n3 > n1 && (n2 > 100 || n3 > 100)) {
          // Standard [ymin, xmin, ymax, xmax] format
          ymin = n0
          xmin = n1
          ymax = n2
          xmax = n3
        } else if (n2 <= 1000 && n3 <= 1000 && n0 + n2 <= 1000 && n1 + n3 <= 1000) {
          // Direct [x, y, w, h] format -> convert to [ymin, xmin, ymax, xmax]
          xmin = n0
          ymin = n1
          xmax = n0 + n2
          ymax = n1 + n3
        } else {
          // Fallback parsing: n0=top, n1=left, n2=bottom, n3=right
          ymin = Math.min(n0, n2)
          xmin = Math.min(n1, n3)
          ymax = Math.max(n0, n2)
          xmax = Math.max(n1, n3)
        }

        // Un-pad Vision API letterbox offset to restore exact 0-1000 coordinates relative to physical PDF page
        if (padX > 0) {
          xmin = (xmin - padX) * scaleX
          xmax = (xmax - padX) * scaleX
        }
        if (padY > 0) {
          ymin = (ymin - padY) * scaleY
          ymax = (ymax - padY) * scaleY
        }

        let x = xmin
        let y = ymin
        let w = xmax - xmin
        let h = ymax - ymin

        // Automatic Layout Sanity Check & Self-Correction for Manuscripts:
        if (typeStr === 'heading') {
          if (w < 150) {
            x = Math.max(50, Math.min(x, 200))
            w = 750
            if (h > 150) h = 70
          }
        }

        x = Math.max(0, Math.min(950, x))
        y = Math.max(0, Math.min(950, y))
        w = Math.max(30, Math.min(1000 - x, w))
        h = Math.max(20, Math.min(1000 - y, h))

        bbox = [x, y, w, h]
      }
    }

    if (!bbox) {
      // Default spatial block calculation
      const top = Math.round(50 + (blockIdx * 120) % 800)
      const defaultWidth = typeStr === 'heading' ? 750 : typeStr === 'margin' ? 250 : 850
      const defaultLeft = typeStr === 'heading' ? 125 : typeStr === 'margin' ? 50 : 75
      bbox = [defaultLeft, top, defaultWidth, 100]
    }

    result.push({
      id: `block-${blockIdx}-${Math.random().toString(36).substring(2, 7)}`,
      lineNumber: blockIdx,
      rawText: content,
      correctedText: content,
      bbox,
      confidenceScore: content.includes('[؟]') || content.includes('[غير مقروء]') ? 0.75 : 0.95,
      status: 'unverified',
      blockType: typeStr,
    })
  }

  // Fallback: If blockRegex produced 0 items, sanitize rawText by stripping any raw block tags and split into paragraphs
  if (result.length === 0) {
    const sanitizedText = cleanedText
      .replace(/\[{1,2}\/?END_BLOCK\]{1,2}/gi, '')
      .replace(/\[{1,2}BLOCK:.*?\]{1,2}/gi, '')
      .trim()

    const paragraphs = sanitizedText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)

    const total = paragraphs.length || 1

    paragraphs.forEach((para, idx) => {
      let blockType: BlockType = 'syarah'
      if (para.startsWith('> ') || para.includes('وَقَوْلُهُ')) {
        blockType = 'matan'
      } else if (para.startsWith('قوله:') || para.includes('حاشية')) {
        blockType = 'hasyiah'
      } else if (para.includes('*')) {
        blockType = 'nadzom'
      } else if (para.startsWith('#')) {
        blockType = 'heading'
      }

      const top = Math.round(40 + (idx / total) * 820)
      const height = Math.round(Math.max(50, 800 / total - 15))

      result.push({
        id: `block-${idx + 1}-${Math.random().toString(36).substring(2, 7)}`,
        lineNumber: idx + 1,
        rawText: para,
        correctedText: para,
        bbox: [70, top, 860, height],
        confidenceScore: para.includes('[؟]') || para.includes('[غير مقروء]') ? 0.75 : 0.95,
        status: 'unverified',
        blockType,
      })
    })
  }

  return result
}


