import type {
  IdmlDocument,
  MissingAssetIssue,
  OversetIssue,
  PreflightReport,
} from './types.js'

/**
 * Preflight Inspector for IDML Documents
 */

export function runPreflightCheck(doc: IdmlDocument): PreflightReport {
  const oversetIssues: OversetIssue[] = []
  const missingAssetIssues: MissingAssetIssue[] = []

  // Check overset text frames
  for (const spread of doc.spreads) {
    for (const item of spread.pageItems) {
      if (item.itemType === 'TextFrame') {
        const story = doc.stories[item.parentStoryId]
        if (story) {
          // Approximate height / capacity check based on geometric bounds
          const frameHeight = Math.abs(item.geometricBounds.bottom - item.geometricBounds.top)
          const frameWidth = Math.abs(item.geometricBounds.right - item.geometricBounds.left)

          // Rough calculation: ~15-20 characters per 100 sq units depending on size
          const estimatedCharCapacity = Math.max(20, Math.floor((frameWidth * frameHeight) / 80))
          const textLength = story.rawText.length

          if (textLength > estimatedCharCapacity * 1.8) {
            item.isOverset = true
            oversetIssues.push({
              frameId: item.id,
              storyId: story.id,
              storySnippet: story.rawText.slice(0, 30) + '...',
              overflowCharacters: textLength - estimatedCharCapacity,
            })
          }
        }
      } else if (item.itemType === 'GraphicFrame' && item.assetMissing) {
        missingAssetIssues.push({
          linkId: item.linkId || item.id,
          fileName: item.imageFileName || 'unknown',
          filePath: item.imagePath || '',
        })
      }
    }
  }

  return {
    timestamp: Date.now(),
    hasErrors: oversetIssues.length > 0 || missingAssetIssues.length > 0,
    oversetIssues,
    missingAssetIssues,
  }
}
