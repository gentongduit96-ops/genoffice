import type {
  IdmlGraphicFrameItem,
  IdmlPage,
  IdmlPageItem,
  IdmlShapeItem,
  IdmlSpread,
  IdmlTextFrameItem,
} from './types.js'
import { getAttribute, parseGeometricBounds, parseTransformMatrix } from './xml-helpers.js'

/**
 * Spread XML Parser for InDesign Spreads/Spread_*.xml & MasterSpreads/MasterSpread_*.xml
 */

export function parseSpreadXml(xmlDoc: Document, spreadId: string, isMaster = false): IdmlSpread {
  const spreadElement = xmlDoc.querySelector('Spread') || xmlDoc.querySelector('MasterSpread')
  const pages: IdmlPage[] = []
  const pageItems: IdmlPageItem[] = []

  if (!spreadElement) {
    return { id: spreadId, pages: [], pageItems: [], isMasterSpread: isMaster }
  }

  // Parse pages
  const pageNodes = Array.from(spreadElement.getElementsByTagName('Page'))
  for (const pNode of pageNodes) {
    const id = getAttribute(pNode, 'Self') || `Page_${pages.length + 1}`
    const name = getAttribute(pNode, 'Name') || `${pages.length + 1}`
    const boundsStr = getAttribute(pNode, 'GeometricBounds')
    const bounds = parseGeometricBounds(boundsStr)

    pages.push({
      id,
      name,
      bounds,
      appliedMaster: getAttribute(pNode, 'AppliedMaster'),
    })
  }

  // Parse TextFrames
  const textFrameNodes = Array.from(spreadElement.getElementsByTagName('TextFrame'))
  for (const tfNode of textFrameNodes) {
    const id = getAttribute(tfNode, 'Self') || `TextFrame_${pageItems.length + 1}`
    const storyId = getAttribute(tfNode, 'ParentStory') || ''
    const transformMatrix = parseTransformMatrix(getAttribute(tfNode, 'ItemTransform'))
    const geometricBounds = parseGeometricBounds(getAttribute(tfNode, 'GeometricBounds'))
    const fillColor = getAttribute(tfNode, 'FillColor')
    const strokeColor = getAttribute(tfNode, 'StrokeColor')
    const strokeWeightAttr = getAttribute(tfNode, 'StrokeWeight')

    const tfItem: IdmlTextFrameItem = {
      id,
      itemType: 'TextFrame',
      parentStoryId: storyId,
      transformMatrix,
      geometricBounds,
      fillColor,
      strokeColor,
      strokeWeight: strokeWeightAttr ? parseFloat(strokeWeightAttr) : undefined,
      previousFrameId: getAttribute(tfNode, 'PreviousFrame'),
      nextFrameId: getAttribute(tfNode, 'NextFrame'),
      textColumnCount: getAttribute(tfNode, 'TextColumnCount')
        ? parseInt(getAttribute(tfNode, 'TextColumnCount')!, 10)
        : 1,
    }
    pageItems.push(tfItem)
  }

  // Parse Rectangles (Shapes & Graphic Frames)
  const rectNodes = Array.from(spreadElement.getElementsByTagName('Rectangle'))
  for (const rNode of rectNodes) {
    const id = getAttribute(rNode, 'Self') || `Rectangle_${pageItems.length + 1}`
    const transformMatrix = parseTransformMatrix(getAttribute(rNode, 'ItemTransform'))
    const geometricBounds = parseGeometricBounds(getAttribute(rNode, 'GeometricBounds'))
    const fillColor = getAttribute(rNode, 'FillColor')
    const strokeColor = getAttribute(rNode, 'StrokeColor')
    const strokeWeightAttr = getAttribute(rNode, 'StrokeWeight')

    // Check if it contains image link
    const imageNode = rNode.querySelector('Image') || rNode.querySelector('EPS') || rNode.querySelector('PDF')
    const linkNode = imageNode ? imageNode.querySelector('Link') : null

    if (linkNode) {
      const linkUri = getAttribute(linkNode, 'LinkResourceURI') || ''
      const fileName = linkUri.split('/').pop() || 'image'
      const gfItem: IdmlGraphicFrameItem = {
        id,
        itemType: 'GraphicFrame',
        transformMatrix,
        geometricBounds,
        fillColor,
        strokeColor,
        strokeWeight: strokeWeightAttr ? parseFloat(strokeWeightAttr) : undefined,
        imagePath: linkUri,
        imageFileName: fileName,
        linkId: getAttribute(linkNode, 'Self'),
      }
      pageItems.push(gfItem)
    } else {
      const shapeItem: IdmlShapeItem = {
        id,
        itemType: 'Rectangle',
        transformMatrix,
        geometricBounds,
        fillColor,
        strokeColor,
        strokeWeight: strokeWeightAttr ? parseFloat(strokeWeightAttr) : undefined,
      }
      pageItems.push(shapeItem)
    }
  }

  return {
    id: spreadId,
    pages,
    pageItems,
    isMasterSpread: isMaster,
  }
}
