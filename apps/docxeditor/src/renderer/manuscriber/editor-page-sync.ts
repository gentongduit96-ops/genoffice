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

/**
 * Formats transcribed HTML into clean academic publication / scholarly edition (tahqiq ilmiah)
 * structure with proper TipTap data-para attributes (justification, 1.5 line spacing, 480 twips first-line indent, etc.)
 */
export function formatToAcademicHtml(html: string, isRtl: boolean): string {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
    const container = doc.body.firstElementChild || doc.body

    const arabicFont = "'Traditional Arabic', 'Amiri', 'Noto Naskh Arabic', serif"
    const latinFont = "'Times New Roman', 'Calibri', serif"
    const bodyFont = isRtl ? arabicFont : latinFont
    const bodyFontSize = isRtl ? '15pt' : '12pt'
    const titleFontSize = isRtl ? '20pt' : '16pt'
    const h2FontSize = isRtl ? '16pt' : '14pt'
    const h3FontSize = isRtl ? '14pt' : '13pt'
    const hasyiahFontSize = isRtl ? '13.5pt' : '11pt'

    let inHasyiahSection = false

    const elements = Array.from(container.children)
    for (const el of elements) {
      const tag = el.tagName.toUpperCase()
      const text = el.textContent?.trim() || ''

      if (tag === 'HR') {
        inHasyiahSection = true
        // Convert HR to a clean divider paragraph with top/bottom border
        const p = doc.createElement('p')
        const payload = {
          align: 'center',
          bidi: isRtl,
          borders: 'b',
          spaceBefore: 160,
          spaceAfter: 160,
        }
        p.setAttribute('data-para', JSON.stringify(payload))
        p.innerHTML = `<span style="font-family: ${bodyFont}; font-size: 10pt; color: #888888;">&nbsp;</span>`
        el.replaceWith(p)
        continue
      }

      if (tag === 'H1') {
        const payload = {
          align: 'center',
          bidi: isRtl,
          spaceBefore: 120,
          spaceAfter: 200,
        }
        el.setAttribute('data-para', JSON.stringify(payload))
        el.innerHTML = `<span style="font-family: ${bodyFont}; font-size: ${titleFontSize}; font-weight: bold;">${el.innerHTML}</span>`
      } else if (tag === 'H2') {
        const payload = {
          align: 'center',
          bidi: isRtl,
          spaceBefore: 160,
          spaceAfter: 120,
        }
        el.setAttribute('data-para', JSON.stringify(payload))
        el.innerHTML = `<span style="font-family: ${bodyFont}; font-size: ${h2FontSize}; font-weight: bold;">${el.innerHTML}</span>`
      } else if (tag === 'H3' || tag === 'H4') {
        const payload = {
          align: 'center',
          bidi: isRtl,
          spaceBefore: 120,
          spaceAfter: 80,
        }
        el.setAttribute('data-para', JSON.stringify(payload))
        el.innerHTML = `<span style="font-family: ${bodyFont}; font-size: ${h3FontSize}; font-weight: bold;">${el.innerHTML}</span>`
      } else if (tag === 'BLOCKQUOTE') {
        // Matan Core Text / Quotations: prominent, indented, justified
        const paras = el.querySelectorAll('p')
        if (paras.length > 0) {
          paras.forEach((p) => {
            const payload = {
              align: 'justify',
              bidi: isRtl,
              indentLeft: 720,
              indentRight: 720,
              lineSpacing: 1.35,
              spaceBefore: 100,
              spaceAfter: 100,
            }
            p.setAttribute('data-para', JSON.stringify(payload))
            p.innerHTML = `<span style="font-family: ${bodyFont}; font-size: ${bodyFontSize}; font-weight: bold;">${p.innerHTML}</span>`
          })
        } else {
          const payload = {
            align: 'justify',
            bidi: isRtl,
            indentLeft: 720,
            indentRight: 720,
            lineSpacing: 1.35,
            spaceBefore: 100,
            spaceAfter: 100,
          }
          const p = doc.createElement('p')
          p.setAttribute('data-para', JSON.stringify(payload))
          p.innerHTML = `<span style="font-family: ${bodyFont}; font-size: ${bodyFontSize}; font-weight: bold;">${el.innerHTML}</span>`
          el.replaceWith(p)
        }
      } else if (tag === 'P') {
        if (isOpeningBlessing(text)) {
          // Opening Basmalah or prayer line: centered
          const payload = {
            align: 'center',
            bidi: isRtl,
            lineSpacing: 1.5,
            spaceBefore: 120,
            spaceAfter: 160,
          }
          el.setAttribute('data-para', JSON.stringify(payload))
          el.innerHTML = `<span style="font-family: ${bodyFont}; font-size: ${bodyFontSize}; font-weight: bold;">${el.innerHTML}</span>`
        } else if (isNadzomLine(text)) {
          // Poetic Nadzom verses: centered symmetrical line
          const payload = {
            align: 'center',
            bidi: isRtl,
            lineSpacing: 1.5,
            spaceBefore: 80,
            spaceAfter: 80,
          }
          el.setAttribute('data-para', JSON.stringify(payload))
          el.innerHTML = `<span style="font-family: ${bodyFont}; font-size: ${bodyFontSize}; font-weight: 500;">${el.innerHTML}</span>`
        } else if (inHasyiahSection || text.startsWith('قوله:') || text.startsWith('(قوله:')) {
          // Hasyiah / Ta'liqat entries: justified, compact line-height
          const payload = {
            align: 'justify',
            bidi: isRtl,
            lineSpacing: 1.35,
            indentFirstLine: 360,
            spaceAfter: 100,
          }
          el.setAttribute('data-para', JSON.stringify(payload))
          el.innerHTML = `<span style="font-family: ${bodyFont}; font-size: ${hasyiahFontSize};">${el.innerHTML}</span>`
        } else {
          // Standard Academic Body Paragraph (Syarah): Justified, 1.5 line spacing, 480 twips first line indent
          const payload = {
            align: 'justify',
            bidi: isRtl,
            lineSpacing: 1.5,
            indentFirstLine: 480,
            spaceAfter: 120,
          }
          el.setAttribute('data-para', JSON.stringify(payload))
          el.innerHTML = `<span style="font-family: ${bodyFont}; font-size: ${bodyFontSize};">${el.innerHTML}</span>`
        }
      } else if (tag === 'UL' || tag === 'OL') {
        const lis = el.querySelectorAll('li')
        lis.forEach((li) => {
          const payload = {
            align: 'justify',
            bidi: isRtl,
            lineSpacing: 1.5,
            spaceAfter: 60,
          }
          li.setAttribute('data-para', JSON.stringify(payload))
          li.innerHTML = `<span style="font-family: ${bodyFont}; font-size: ${bodyFontSize};">${li.innerHTML}</span>`
        })
      }
    }

    return container.innerHTML
  } catch (err) {
    console.warn('Academic formatting fallback:', err)
    return html
  }
}

/**
 * Inserts or appends transcribed HTML content from a PDF page into the Word editor.
 * Ensures that:
 * - Content is automatically formatted to academic publication standards (Justify, 1.5 spacing, indents, center headings).
 * - Page 1 content begins on Word Page 1.
 * - Page N > 1 content begins on a new Word page via a page break.
 * - RTL scripts (Arabic, Pegon, Jawi, Hebrew) format with bidi=true and proper Arabic serif font.
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

  const rtl = isRtl !== undefined ? isRtl : isRtlText(htmlContent)
  const processedHtml = formatToAcademicHtml(htmlContent, rtl)

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

