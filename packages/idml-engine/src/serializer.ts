import JSZip from 'jszip'
import type { IdmlDocument } from './types.js'

/**
 * IDML Round-Trip Serializer.
 * Patches edited stories/spreads back into original JSZip container.
 */

export async function serializeIdml(
  doc: IdmlDocument,
  originalArrayBuffer?: ArrayBuffer
): Promise<ArrayBuffer> {
  let zip: JSZip
  if (originalArrayBuffer) {
    zip = await JSZip.loadAsync(originalArrayBuffer)
  } else {
    zip = new JSZip()
  }

  // Update stories that were edited
  for (const [storyId, story] of Object.entries(doc.stories)) {
    if (story.isDirty) {
      const storyPath = `Stories/${storyId}.xml`
      const existingFile = zip.file(storyPath)
      if (existingFile) {
        const xmlStr = await existingFile.async('string')

        // Simple XML Content node patch to preserve InDesign attributes & round-trip safety
        const updatedXmlStr = xmlStr.replace(
          /<Content>([\s\S]*?)<\/Content>/g,
          `<Content>${escapeXml(story.rawText)}</Content>`
        )
        zip.file(storyPath, updatedXmlStr)
      }
    }
  }

  return await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' })
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
