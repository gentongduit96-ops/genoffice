import type {
  IdmlCharacterStyleRange,
  IdmlParagraphStyleRange,
  IdmlStory,
  IdmlTextRun,
} from './types.js'
import { getAttribute } from './xml-helpers.js'

/**
 * Story XML Parser for InDesign Stories/Story_*.xml
 */

export function parseStoryXml(xmlDoc: Document, storyId: string): IdmlStory {
  const storyElement = xmlDoc.querySelector('Story')
  if (!storyElement) {
    return {
      id: storyId,
      paragraphRanges: [],
      rawText: '',
    }
  }

  const paragraphRanges: IdmlParagraphStyleRange[] = []
  let fullText = ''

  const pNodes = Array.from(storyElement.getElementsByTagName('ParagraphStyleRange'))
  for (const pNode of pNodes) {
    const pStyle = getAttribute(pNode, 'AppliedParagraphStyle') || 'ParagraphStyle/$ID/[No paragraph style]'
    const charRanges: IdmlCharacterStyleRange[] = []

    const cNodes = Array.from(pNode.getElementsByTagName('CharacterStyleRange'))
    for (const cNode of cNodes) {
      const cStyle = getAttribute(cNode, 'AppliedCharacterStyle') || 'CharacterStyle/$ID/[No character style]'
      const fontSizeAttr = getAttribute(cNode, 'PointSize')
      const fontSize = fontSizeAttr ? parseFloat(fontSizeAttr) : undefined
      const fontAttr = getAttribute(cNode, 'AppliedFont')
      const fillColor = getAttribute(cNode, 'FillColor')

      const runs: IdmlTextRun[] = []
      for (const child of Array.from(cNode.childNodes)) {
        if (child.nodeType === 1 /* Element */) {
          const el = child as Element
          if (el.tagName === 'Content') {
            const content = el.textContent || ''
            runs.push({ text: content })
            fullText += content
          } else if (el.tagName === 'Br') {
            runs.push({ text: '\n' })
            fullText += '\n'
          }
        }
      }

      if (runs.length > 0) {
        charRanges.push({
          appliedCharacterStyle: cStyle,
          fontFamily: fontAttr,
          fontSize,
          fillColor,
          runs,
        })
      }
    }

    if (charRanges.length > 0) {
      paragraphRanges.push({
        appliedParagraphStyle: pStyle,
        characterRanges: charRanges,
      })
    }
  }

  return {
    id: storyId,
    paragraphRanges,
    rawText: fullText,
  }
}
