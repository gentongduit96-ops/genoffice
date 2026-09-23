import type { IdmlBounds, IdmlTransformMatrix } from './types.js'

/**
 * Utility functions for XML DOM parsing & IDML geometry transforms.
 */

export function parseXmlDocument(xmlString: string): Document {
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser()
    return parser.parseFromString(xmlString, 'text/xml')
  }
  // Safe fallback using DOMParser if standard or global JS DOM
  throw new Error('DOMParser is not available in the current environment.')
}

export function getAttribute(element: Element, name: string): string | undefined {
  const attr = element.getAttribute(name)
  return attr !== null ? attr : undefined
}

export function parseTransformMatrix(transformStr?: string): IdmlTransformMatrix {
  const defaultMatrix: IdmlTransformMatrix = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }
  if (!transformStr) return defaultMatrix

  const parts = transformStr.trim().split(/\s+/).map(Number)
  if (parts.length >= 6 && parts.every((n) => !isNaN(n))) {
    return {
      a: parts[0],
      b: parts[1],
      c: parts[2],
      d: parts[3],
      tx: parts[4],
      ty: parts[5],
    }
  }
  return defaultMatrix
}

export function parseGeometricBounds(boundsStr?: string): IdmlBounds {
  const defaultBounds: IdmlBounds = { top: 0, left: 0, bottom: 100, right: 100 }
  if (!boundsStr) return defaultBounds

  const parts = boundsStr.trim().split(/\s+/).map(Number)
  if (parts.length >= 4 && parts.every((n) => !isNaN(n))) {
    // IDML geometric bounds order: Top Left Bottom Right (or Top Bottom Left Right depending on spec)
    // Standard IDML GeometricBounds: [Top, Left, Bottom, Right]
    return {
      top: parts[0],
      left: parts[1],
      bottom: parts[2],
      right: parts[3],
    }
  }
  return defaultBounds
}

export function cmykToHex(c: number, m: number, y: number, k: number): string {
  const r = Math.round(255 * (1 - c / 100) * (1 - k / 100))
  const g = Math.round(255 * (1 - m / 100) * (1 - k / 100))
  const b = Math.round(255 * (1 - y / 100) * (1 - k / 100))
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
