/**
 * Manuscriber Project (.manus) Pack & Unpack Utilities
 * Bundles the Word document (content.docx), the source PDF (source.pdf),
 * and project metadata (project.json) into a single portable zip archive.
 */
import JSZip from 'jszip'

export type PageTranscriptionStatus = 'idle' | 'transcribing' | 'done' | 'error'

export interface ManusProjectMetadata {
  version: string
  projectType: 'manuscriber'
  name: string
  createdAt: string
  updatedAt: string
  pdf: {
    originalName: string
    totalPages: number
    lastActivePage: number
    lastZoom: number
    pageStatuses: Record<number, PageTranscriptionStatus>
    pageErrors?: Record<number, string>
  }
  settings?: {
    promptPreset?: string
    syncMode?: string
    [key: string]: unknown
  }
}

export interface UnpackedManusProject {
  docxData: ArrayBuffer
  pdfData: ArrayBuffer
  metadata: ManusProjectMetadata
}

export function isManusProjectFile(fileNameOrPath: string): boolean {
  const lower = fileNameOrPath.toLowerCase()
  return (
    lower.endsWith('.manus') ||
    lower.endsWith('.manuscriber') ||
    lower.endsWith('.mnsproj')
  )
}

export async function packManusProject(params: {
  docxBytes: Uint8Array | ArrayBuffer
  pdfBytes: Uint8Array | ArrayBuffer
  metadata: ManusProjectMetadata
}): Promise<Uint8Array> {
  const zip = new JSZip()

  // 1. Project Manifest
  zip.file('project.json', JSON.stringify(params.metadata, null, 2))

  // 2. Active Word Document
  const docxData =
    params.docxBytes instanceof Uint8Array
      ? params.docxBytes
      : new Uint8Array(params.docxBytes)
  zip.file('content.docx', docxData)

  // 3. Source PDF Manuscript
  const pdfData =
    params.pdfBytes instanceof Uint8Array
      ? params.pdfBytes
      : new Uint8Array(params.pdfBytes)
  zip.file('source.pdf', pdfData)

  const content = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  return content
}

export async function unpackManusProject(data: ArrayBuffer | Uint8Array): Promise<UnpackedManusProject> {
  const zip = await JSZip.loadAsync(data)

  const manifestFile = zip.file('project.json')
  if (!manifestFile) {
    throw new Error('File proyek tidak valid: project.json tidak ditemukan di dalam paket.')
  }

  const manifestText = await manifestFile.async('text')
  const metadata = JSON.parse(manifestText) as ManusProjectMetadata

  const docxFile = zip.file('content.docx')
  if (!docxFile) {
    throw new Error('File proyek tidak valid: content.docx tidak ditemukan di dalam paket.')
  }
  const docxData = await docxFile.async('arraybuffer')

  const pdfFile = zip.file('source.pdf')
  if (!pdfFile) {
    throw new Error('File proyek tidak valid: source.pdf tidak ditemukan di dalam paket.')
  }
  const pdfData = await pdfFile.async('arraybuffer')

  return {
    docxData,
    pdfData,
    metadata,
  }
}
