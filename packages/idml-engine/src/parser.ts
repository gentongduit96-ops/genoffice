import JSZip from 'jszip'
import { runPreflightCheck } from './preflight.js'
import { parseGraphicXml, parsePreferencesXml, parseStylesXml } from './resource-parser.js'
import { parseSpreadXml } from './spread-parser.js'
import { parseStoryXml } from './story-parser.js'
import type { IdmlDocument, IdmlLink, IdmlSpread, IdmlStory } from './types.js'
import { parseXmlDocument } from './xml-helpers.js'

/**
 * Main IDML Parser Entrypoint.
 * Unzips `.idml` package, reads designmap.xml, parses stories, spreads, resources & preferences.
 */
export async function parseIdml(arrayBuffer: ArrayBuffer, srcPath?: string): Promise<IdmlDocument> {
  const zip = await JSZip.loadAsync(arrayBuffer)

  // 1. Read designmap.xml
  const designMapFile = zip.file('designmap.xml')
  if (!designMapFile) {
    throw new Error('Invalid IDML file: missing designmap.xml manifest.')
  }
  const designMapXmlStr = await designMapFile.async('string')
  const designMapDoc = parseXmlDocument(designMapXmlStr)

  // 2. Read Preferences, Graphic, Styles, Fonts resources
  let preferences = {
    pageHeight: 297,
    pageWidth: 210,
    facingPages: true,
    margin: { top: 20, bottom: 20, left: 20, right: 20 },
    bleed: 3,
    slug: 0,
    measurementUnit: 'Millimeters',
  }
  const prefFile = zip.file('Resources/Preferences.xml')
  if (prefFile) {
    const xmlStr = await prefFile.async('string')
    preferences = parsePreferencesXml(parseXmlDocument(xmlStr))
  }

  let colors = {}
  const graphicFile = zip.file('Resources/Graphic.xml')
  if (graphicFile) {
    const xmlStr = await graphicFile.async('string')
    colors = parseGraphicXml(parseXmlDocument(xmlStr))
  }

  let paragraphStyles = {}
  let characterStyles = {}
  const stylesFile = zip.file('Resources/Styles.xml')
  if (stylesFile) {
    const xmlStr = await stylesFile.async('string')
    const parsed = parseStylesXml(parseXmlDocument(xmlStr))
    paragraphStyles = parsed.paragraphStyles
    characterStyles = parsed.characterStyles
  }

  // 3. Parse Spreads
  const spreads: IdmlSpread[] = []
  const spreadFiles = zip.file(/^Spreads\/Spread_.*\.xml$/)
  for (const sFile of spreadFiles) {
    const xmlStr = await sFile.async('string')
    const xmlDoc = parseXmlDocument(xmlStr)
    const spreadId = sFile.name.replace('Spreads/', '').replace('.xml', '')
    spreads.push(parseSpreadXml(xmlDoc, spreadId, false))
  }

  // 4. Parse Master Spreads
  const masterSpreads: IdmlSpread[] = []
  const masterFiles = zip.file(/^MasterSpreads\/MasterSpread_.*\.xml$/)
  for (const mFile of masterFiles) {
    const xmlStr = await mFile.async('string')
    const xmlDoc = parseXmlDocument(xmlStr)
    const mId = mFile.name.replace('MasterSpreads/', '').replace('.xml', '')
    masterSpreads.push(parseSpreadXml(xmlDoc, mId, true))
  }

  // 5. Parse Stories
  const stories: Record<string, IdmlStory> = {}
  const storyFiles = zip.file(/^Stories\/Story_.*\.xml$/)
  for (const stFile of storyFiles) {
    const xmlStr = await stFile.async('string')
    const xmlDoc = parseXmlDocument(xmlStr)
    const storyId = stFile.name.replace('Stories/', '').replace('.xml', '')
    const story = parseStoryXml(xmlDoc, storyId)
    stories[storyId] = story
  }

  const links: IdmlLink[] = []

  const doc: IdmlDocument = {
    manifest: {
      srcPath,
      spreadCount: spreads.length,
      storyCount: Object.keys(stories).length,
    },
    preferences,
    colors,
    paragraphStyles,
    characterStyles,
    stories,
    spreads,
    masterSpreads,
    links,
  }

  // Run preflight check to mark overset frames
  runPreflightCheck(doc)

  return doc
}
