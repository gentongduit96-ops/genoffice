import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { parseIdml, serializeIdml } from '../src/index.js'

describe('IDML Engine Parser & Serializer', () => {
  it('creates document model from minimal sample IDML ZIP structure', async () => {
    const zip = new JSZip()
    zip.file('designmap.xml', '<?xml version="1.0" encoding="UTF-8"?><Document />')
    zip.file(
      'Resources/Preferences.xml',
      '<?xml version="1.0" encoding="UTF-8"?><DocumentPreference PageHeight="297" PageWidth="210" FacingPages="true"/>'
    )
    zip.file(
      'Spreads/Spread_s1.xml',
      '<?xml version="1.0" encoding="UTF-8"?><Spread Self="s1"><Page Self="p1" Name="1" GeometricBounds="0 0 297 210"/><TextFrame Self="tf1" ParentStory="st1" GeometricBounds="10 10 100 200"/></Spread>'
    )
    zip.file(
      'Stories/Story_st1.xml',
      '<?xml version="1.0" encoding="UTF-8"?><Story Self="st1"><ParagraphStyleRange><CharacterStyleRange><Content>Hello IDML World</Content></CharacterStyleRange></ParagraphStyleRange></Story>'
    )

    const buffer = await zip.generateAsync({ type: 'arraybuffer' })
    const doc = await parseIdml(buffer, '/test/doc.idml')

    expect(doc.manifest.spreadCount).toBe(1)
    expect(doc.manifest.storyCount).toBe(1)
    expect(doc.preferences.pageWidth).toBe(210)
    expect(doc.preferences.pageHeight).toBe(297)

    const story = doc.stories['Story_st1']
    expect(story).toBeDefined()
    expect(story.rawText).toBe('Hello IDML World')

    // Test editing & serializing round-trip
    story.rawText = 'Updated InDesign Content'
    story.isDirty = true

    const newBuffer = await serializeIdml(doc, buffer)
    const reParsedDoc = await parseIdml(newBuffer)
    expect(reParsedDoc.stories['Story_st1'].rawText).toBe('Updated InDesign Content')
  })
})
