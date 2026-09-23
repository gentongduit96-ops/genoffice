import type { Editor } from '@tiptap/core'
import { insertPageBreak } from '../editor/page-break'
import { isRtlText } from './vision-service'

/**
 * Checks if a string is a standalone Basmalah, Hamdalah, or opening prayer line
 */
function isOpeningBlessing(text: string): boolean {
  const trimmed = text.trim()
  return (
    trimmed.includes('بسم الله الرحمن الرحيم') ||
    trimmed.includes('الحمد لله رب العالمين') ||
    trimmed.includes('وصلى الله على سيدنا') ||
    trimmed.includes('أما بعد')
  )
}

/**
 * Checks if a paragraph is a line of Nadzom / Poetic verse (contains hemistich separator * or |)
 */
function isNadzomLine(text: string): boolean {
  const trimmed = text.trim()
  return (
    (trimmed.includes(' * ') || trimmed.includes(' | ')) &&
    trimmed.length < 150 &&
    !trimmed.startsWith('#')
  )
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Converts transcribed text or HTML into clean, unformatted paragraphs for Docx insertion.
 * Strips all inline styles, fonts, font-sizes, indents, and HTML tags.
 * Only applies RTL direction (`data-para='{"bidi":true}' dir="rtl"`) if the text contains Arabic script.
 */
export function cleanTextForDocx(html: string): string {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
    const container = doc.body.firstElementChild || doc.body

    const cleanParagraphs: string[] = []

    const processLine = (text: string) => {
      const plainText = text.replace(/<[^>]*>/g, '').trim()
      if (!plainText) return
      const isArabic = isRtlText(plainText)
      if (isArabic) {
        const payload = { bidi: true }
        cleanParagraphs.push(`<p data-para='${JSON.stringify(payload)}' dir="rtl">${escapeHtml(plainText)}</p>`)
      } else {
        cleanParagraphs.push(`<p dir="ltr">${escapeHtml(plainText)}</p>`)
      }
    }

    const nodes = Array.from(container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, div'))

    if (nodes.length === 0) {
      const lines = (container.textContent || '').split('\n')
      for (const line of lines) {
        processLine(line)
      }
    } else {
      for (const node of nodes) {
        if (node.parentElement && node.parentElement.closest('p, h1, h2, h3, h4, h5, h6, li, blockquote')) {
          continue
        }
        processLine(node.textContent || '')
      }
    }

    return cleanParagraphs.length > 0 ? cleanParagraphs.join('\n') : `<p dir="ltr"></p>`
  } catch {
    const plainText = html.replace(/<[^>]*>/g, '').trim()
    const isArabic = isRtlText(plainText)
    if (isArabic) {
      const payload = { bidi: true }
      return `<p data-para='${JSON.stringify(payload)}' dir="rtl">${escapeHtml(plainText)}</p>`
    }
    return `<p dir="ltr">${escapeHtml(plainText)}</p>`
  }
}

/**
 * Formats transcribed HTML cleanly for insertion into Docx editor.
 */
export function formatToAcademicHtml(html: string, isRtl: boolean): string {
  return cleanTextForDocx(html)
}

/**
 * Inserts or appends transcribed HTML content from a PDF page into the Word editor.
 * Ensures that:
 * - Content is clean and unformatted (no inline fonts/styles).
 * - Arabic text is set to RTL mode (`data-para='{"bidi":true}' dir="rtl"`).
 * - Page 1 content begins on Word Page 1.
 * - Page N > 1 content begins on a new Word page via a page break.
 */
export function insertTranscribedPageToEditor(
  editor: Editor,
  pageNo: number,
  htmlContent: string,
  isRtl?: boolean,
): void {
  const docSize = editor.state.doc.content.size
  const textContent = editor.state.doc.textContent.trim()
  const isEmptyDoc = textContent === '' && docSize <= 4

  const processedHtml = cleanTextForDocx(htmlContent)

  if (pageNo === 1 && isEmptyDoc) {
    editor.commands.setContent(processedHtml)
    editor.commands.focus('start')
    return
  }

  // Move selection to end of document
  editor.commands.focus('end')

  // If this is page N > 1 or document already has content, insert a page break
  if (!isEmptyDoc) {
    insertPageBreak(editor)
  }

  // Insert the transcribed content
  editor.commands.insertContent(processedHtml)
  editor.commands.focus('end')

  // Smoothly scroll to the bottom/inserted position in Word canvas
  setTimeout(() => {
    const pageWrap = document.querySelector('.editor-scroll')
    if (pageWrap) {
      pageWrap.scrollTop = pageWrap.scrollHeight
    }
  }, 100)
}

/**
 * Scroll Word editor view to approximately page N.
 */
export function scrollToWordPage(pageNo: number): void {
  const pageElements = document.querySelectorAll('.page-sheet, .page-box, .p-break')
  if (pageElements.length >= pageNo) {
    const target = pageElements[pageNo - 1] as HTMLElement
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

/**
 * Commits approved StagingLine[] array from ManuscriberStagingStore into the live Word docx editor.
 */
export function commitStagingToDocx(
  editor: Editor,
  lines: Array<{ correctedText: string; status: string }>,
  pageNo = 1,
): void {
  if (!lines || lines.length === 0) return

  const cleanLines = lines
    .map((l) => (l.correctedText || '').trim())
    .filter(Boolean)
    .join('\n')

  insertTranscribedPageToEditor(editor, pageNo, cleanLines)
}


