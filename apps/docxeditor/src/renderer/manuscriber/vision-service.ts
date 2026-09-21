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
Your task is to transcribe ALL text from this classical manuscript / printed Turats page image (such as I'anatut Thalibin, Fathul Mu'in, Fathul Qarib, etc.) with 100% verbatim visual completeness, natural paragraph flow, and authentic scholarly formatting (tahqiq).

First, thoroughly analyze and map the layout format of the source image. Classical books sometimes use a center-and-margin layout (the outer margins for the Matan and the center for the Syarah/Hasyiah). In other cases, they follow a modern academic format written in top-to-bottom paragraphs separated by lines (Matan on top, Syarah/Hasyiah at the bottom).

=== STRICT ANTI-HALLUCINATION RULES ===
1. PURE VISUAL TRANSCRIPTION: You MUST ONLY transcribe text that is physically visible in the image.
2. NO TEXT COMPLETION: Never retrieve book text from your training memory/database. If a sentence is cut off at the end of a page or obscured, leave it cut off. NEVER complete it yourself.
3. BLURRY TEXT HANDLING: If the text has low legibility, you may infer letters based on context (Nahwu/Shorof) ONLY IF the word is 90% visible. If a word, sentence, or section is completely unreadable/damaged, DO NOT MAKE UP WORDS. Replace the unreadable part with the tag [غير مقروء] or [؟].

=== CRITICAL TRANSCRIPTION & FORMATTING RULES ===

CONTINUOUS PARAGRAPH FLOW (NO MID-SENTENCE LINE SPLITTING):
- In printed classical books, line breaks only occur because they hit the page margins. When transcribing, you MUST merge these broken visual lines into complete, coherent, and flowing prose paragraphs.
- DO NOT insert newlines (Enter) in the middle of a continuous sentence or paragraph.
- Separate paragraphs ONLY upon genuine topic transitions, new section headers, or when switching between Matan, Syarah, and Hasyiah.

TURATS LAYOUT & STRUCTURAL SEPARATION:
A. Running Header (Top Margin):
   - If there is a repeating top header (e.g., "باب الصلاة / فصل في صفة الصلاة"), ignore it. Extract ONLY the page number.

B. Upper Matan Section (Core Text):
   - If the page begins with a foundational Matan block at the top (prominent, large font, or bracketed), format it as an indented blockquote:
     > (وَقَوْلُهُ: سُبْحَانَ رَبِّيَ الْعَظِيمِ وَبِحَمْدِهِ ثَلَاثًا)

C. Syarah Section (Middle Commentary):
   - Syarah explains the Matan. Quotes from the Matan inside the Syarah text must be bolded and bracketed: **(وَقَوْلُهُ: ...)** or **(قَوْلُهُ: ...)**, immediately followed by the explanatory text flowing in a full continuous paragraph.

D. Hasyiah & Ta'liqat Divider (Bottom Commentary):
   - Pages with Hasyiah (like I'anatut Thalibin / Bajuri) have a horizontal dividing line separating the Syarah above from the Hasyiah below.
   - Use a Markdown horizontal rule to separate them: ---

E. Hasyiah Entries:
   - Below the --- divider, transcribe the Hasyiah notes.
   - Each hasyiah entry usually starts with قوله: (كلمة...) followed by the explanation:
     قوله: (وَقَوْلُهُ: سُبْحَانَ) أَيْ وَسُنَّ فِي الرُّكُوعِ قَوْلُ إِلَخْ. وَقَوْلُهُ: (الْعَظِيمِ) أَيْ الْكَامِلُ ذَاتًا وَصِفَاتٍ...
   - Each hasyiah entry must be its own continuous flowing paragraph.

F. Nadzom / Bait Sya'ir (Poetic Verses):
   - Format poetry with two symmetrical hemistichs (Shatr Awal and Shatr Thani) separated by an asterisk * on a single line:
     وَأَلِفًا سَلِّمْ وَفِي الْمَقْصُورِ عَنْ * هُذَيْلٍ انْقِلَابُهَا يَا كَسَنِ

G. Sacred Texts, Punctuation & Marginalia:
   - Enclose Qur'anic verses in ornate brackets: ﴿ ... ﴾
   - Enclose Prophetic Hadith in guillemets: « ... »
   - Preserve all original harakat, diacritics, shaddah, tanwin, and punctuation marks exactly as they appear in the image.
   - If there is marginal text on the outer edges of the page, place it according to your layout mapping (this is usually the Matan).
   - If there is a catchword (Ta'qibah) at the bottom corner, transcribe it at the very end formatted exactly as: [تعقيبة: ...] without any additional words.

OTHER LAYOUTS:
If the source page is not a standard text content page (e.g., book cover, inner title page, table of contents, index, etc.), apply formatting that accurately represents its specific visual structure and layout.

OUTPUT FORMAT:
- Output ONLY the verbatim transcribed and formatted Markdown text.
- If processing multiple pages, separate the output of each page with a pagebreak so it starts on a new page.
- STRICTLY PROHIBITED: Do not add any external text, commentary, opening greetings, conclusions, or AI explanations in any form. Output the transcribed text directly and nothing else.
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
 * Tries the direct OpenAI-compatible Vision API first (Sumopod/custom),
 * and falls back to window.desktop.analyzeMedia.
 */
export async function transcribePageImage(
  dataUrl: string,
  customPrompt?: string,
): Promise<TranscriptionResult> {
  const prompt = customPrompt || MANUSCRIPT_TRANSCRIPTION_PROMPT
  const config = getVisionConfig()

  try {
    let rawText = ''

    // 1. If custom/sumopod config is present with API Key, call directly
    if (config.apiKey && config.baseUrl) {
      try {
        rawText = await callDirectVisionApi(dataUrl, prompt, config)
      } catch (directErr) {
        console.warn('Direct Vision API failed, falling back to desktop bridge:', directErr)
        // Fallback to desktop bridge
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
