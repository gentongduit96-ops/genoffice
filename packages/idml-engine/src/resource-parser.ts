import type {
  IdmlCharacterStyle,
  IdmlColor,
  IdmlParagraphStyle,
  IdmlPreferences,
} from './types.js'
import { cmykToHex, getAttribute, rgbToHex } from './xml-helpers.js'

export function parsePreferencesXml(xmlDoc: Document): IdmlPreferences {
  const defaultPrefs: IdmlPreferences = {
    pageHeight: 297, // A4 default mm
    pageWidth: 210,
    facingPages: true,
    margin: { top: 20, bottom: 20, left: 20, right: 20 },
    bleed: 3,
    slug: 0,
    measurementUnit: 'Millimeters',
  }

  const docPref = xmlDoc.querySelector('DocumentPreference')
  if (docPref) {
    const h = getAttribute(docPref, 'PageHeight')
    const w = getAttribute(docPref, 'PageWidth')
    const fp = getAttribute(docPref, 'FacingPages')

    if (h) defaultPrefs.pageHeight = parseFloat(h)
    if (w) defaultPrefs.pageWidth = parseFloat(w)
    if (fp) defaultPrefs.facingPages = fp.toLowerCase() === 'true'
  }

  const marginPref = xmlDoc.querySelector('MarginPreference')
  if (marginPref) {
    const t = getAttribute(marginPref, 'Top')
    const b = getAttribute(marginPref, 'Bottom')
    const l = getAttribute(marginPref, 'Left')
    const r = getAttribute(marginPref, 'Right')

    if (t) defaultPrefs.margin.top = parseFloat(t)
    if (b) defaultPrefs.margin.bottom = parseFloat(b)
    if (l) defaultPrefs.margin.left = parseFloat(l)
    if (r) defaultPrefs.margin.right = parseFloat(r)
  }

  return defaultPrefs
}

export function parseGraphicXml(xmlDoc: Document): Record<string, IdmlColor> {
  const colors: Record<string, IdmlColor> = {}

  const colorNodes = Array.from(xmlDoc.getElementsByTagName('Color'))
  for (const cNode of colorNodes) {
    const id = getAttribute(cNode, 'Self') || ''
    const name = getAttribute(cNode, 'Name') || id
    const space = (getAttribute(cNode, 'Space') || 'RGB') as IdmlColor['colorSpace']
    const valAttr = getAttribute(cNode, 'ColorValue') || '0 0 0'
    const values = valAttr.split(/\s+/).map(Number)

    let hex = '#000000'
    if (space === 'CMYK' && values.length >= 4) {
      hex = cmykToHex(values[0], values[1], values[2], values[3])
    } else if (space === 'RGB' && values.length >= 3) {
      hex = rgbToHex(values[0], values[1], values[2])
    }

    if (id) {
      colors[id] = { id, name, colorSpace: space, colorValue: values, hex }
    }
  }

  return colors
}

export function parseStylesXml(xmlDoc: Document): {
  paragraphStyles: Record<string, IdmlParagraphStyle>
  characterStyles: Record<string, IdmlCharacterStyle>
} {
  const paragraphStyles: Record<string, IdmlParagraphStyle> = {}
  const characterStyles: Record<string, IdmlCharacterStyle> = {}

  const pNodes = Array.from(xmlDoc.getElementsByTagName('ParagraphStyle'))
  for (const pNode of pNodes) {
    const id = getAttribute(pNode, 'Self') || ''
    const name = getAttribute(pNode, 'Name') || id
    const fontAttr = getAttribute(pNode, 'AppliedFont')
    const sizeAttr = getAttribute(pNode, 'PointSize')
    const colorAttr = getAttribute(pNode, 'FillColor')

    if (id) {
      paragraphStyles[id] = {
        id,
        name,
        fontFamily: fontAttr,
        fontSize: sizeAttr ? parseFloat(sizeAttr) : undefined,
        fillColor: colorAttr,
      }
    }
  }

  const cNodes = Array.from(xmlDoc.getElementsByTagName('CharacterStyle'))
  for (const cNode of cNodes) {
    const id = getAttribute(cNode, 'Self') || ''
    const name = getAttribute(cNode, 'Name') || id
    const fontAttr = getAttribute(cNode, 'AppliedFont')
    const sizeAttr = getAttribute(cNode, 'PointSize')

    if (id) {
      characterStyles[id] = {
        id,
        name,
        fontFamily: fontAttr,
        fontSize: sizeAttr ? parseFloat(sizeAttr) : undefined,
      }
    }
  }

  return { paragraphStyles, characterStyles }
}
