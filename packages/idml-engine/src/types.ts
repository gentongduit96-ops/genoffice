/**
 * Core IDML Data Model & Types for GenOffice IDML Engine.
 * Represents extracted Adobe InDesign Markup Language document structures.
 */

export interface IdmlTransformMatrix {
  a: number
  b: number
  c: number
  d: number
  tx: number
  ty: number
}

export interface IdmlBounds {
  top: number
  left: number
  bottom: number
  right: number
}

export interface IdmlMargins {
  top: number
  bottom: number
  left: number
  right: number
}

export interface IdmlPreferences {
  pageHeight: number
  pageWidth: number
  facingPages: boolean
  margin: IdmlMargins
  bleed: number
  slug: number
  measurementUnit: string
}

export interface IdmlColor {
  id: string
  name: string
  colorSpace: 'RGB' | 'CMYK' | 'LAB' | 'Spot'
  colorValue: number[]
  hex: string
}

export interface IdmlParagraphStyle {
  id: string
  name: string
  basedOn?: string
  fontFamily?: string
  fontStyle?: string
  fontSize?: number
  leading?: number
  alignment?: 'Left' | 'Center' | 'Right' | 'Justify'
  fillColor?: string
  spaceBefore?: number
  spaceAfter?: number
}

export interface IdmlCharacterStyle {
  id: string
  name: string
  basedOn?: string
  fontFamily?: string
  fontStyle?: string
  fontSize?: number
  fillColor?: string
  underline?: boolean
  strikeThrough?: boolean
}

export interface IdmlTextRun {
  text: string
  style?: {
    fontFamily?: string
    fontStyle?: string
    fontSize?: number
    fillColor?: string
    bold?: boolean
    italic?: boolean
    underline?: boolean
  }
}

export interface IdmlCharacterStyleRange {
  appliedCharacterStyle: string
  runs: IdmlTextRun[]
  fontFamily?: string
  fontSize?: number
  fillColor?: string
}

export interface IdmlParagraphStyleRange {
  appliedParagraphStyle: string
  characterRanges: IdmlCharacterStyleRange[]
  alignment?: 'Left' | 'Center' | 'Right' | 'Justify'
}

export interface IdmlStory {
  id: string
  paragraphRanges: IdmlParagraphStyleRange[]
  rawText: string
  isDirty?: boolean
}

export interface IdmlBaseItem {
  id: string
  itemType: 'TextFrame' | 'Rectangle' | 'GraphicFrame' | 'Oval' | 'Polygon' | 'Group'
  transformMatrix: IdmlTransformMatrix
  geometricBounds: IdmlBounds
  fillColor?: string
  strokeColor?: string
  strokeWeight?: number
  appliedObjectStyle?: string
  layer?: string
}

export interface IdmlTextFrameItem extends IdmlBaseItem {
  itemType: 'TextFrame'
  parentStoryId: string
  previousFrameId?: string
  nextFrameId?: string
  textColumnCount?: number
  textColumnGutter?: number
  isOverset?: boolean
}

export interface IdmlGraphicFrameItem extends IdmlBaseItem {
  itemType: 'GraphicFrame'
  imagePath?: string
  imageFileName?: string
  linkId?: string
  imageScale?: { x: number; y: number }
  assetMissing?: boolean
}

export interface IdmlShapeItem extends IdmlBaseItem {
  itemType: 'Rectangle' | 'Oval' | 'Polygon'
}

export interface IdmlGroupItem extends IdmlBaseItem {
  itemType: 'Group'
  children: IdmlPageItem[]
}

export type IdmlPageItem = IdmlTextFrameItem | IdmlGraphicFrameItem | IdmlShapeItem | IdmlGroupItem

export interface IdmlPage {
  id: string
  name: string
  bounds: IdmlBounds
  appliedMaster?: string
}

export interface IdmlSpread {
  id: string
  pages: IdmlPage[]
  pageItems: IdmlPageItem[]
  isMasterSpread?: boolean
}

export interface IdmlLink {
  id: string
  filePath: string
  fileName: string
  format?: string
  assetMissing: boolean
}

export interface IdmlDocument {
  manifest: {
    srcPath?: string
    spreadCount: number
    storyCount: number
  }
  preferences: IdmlPreferences
  colors: Record<string, IdmlColor>
  paragraphStyles: Record<string, IdmlParagraphStyle>
  characterStyles: Record<string, IdmlCharacterStyle>
  stories: Record<string, IdmlStory>
  spreads: IdmlSpread[]
  masterSpreads: IdmlSpread[]
  links: IdmlLink[]
}

export interface OversetIssue {
  frameId: string
  storyId: string
  storySnippet: string
  overflowCharacters: number
}

export interface MissingAssetIssue {
  linkId: string
  fileName: string
  filePath: string
}

export interface PreflightReport {
  timestamp: number
  hasErrors: boolean
  oversetIssues: OversetIssue[]
  missingAssetIssues: MissingAssetIssue[]
}
