import { mkdirSync, readFileSync, copyFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const root = process.cwd()
const srcAppIconPng = join(root, 'app-icon.png')
const srcLogoSvg = join(root, 'genoffice-logo.svg')

/** ICO container with PNG-compressed entries */
function buildIco(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(entries.length, 4)
  const dir = Buffer.alloc(16 * entries.length)
  let offset = header.length + dir.length
  entries.forEach(({ size, png }, i) => {
    const o = i * 16
    dir.writeUInt8(size >= 256 ? 0 : size, o) // 0 means 256
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1)
    dir.writeUInt8(0, o + 2) // palette
    dir.writeUInt8(0, o + 3) // reserved
    dir.writeUInt16LE(1, o + 4) // planes
    dir.writeUInt16LE(32, o + 6) // bpp
    dir.writeUInt32LE(png.length, o + 8)
    dir.writeUInt32LE(offset, o + 12)
    offset += png.length
  })
  return Buffer.concat([header, dir, ...entries.map((e) => e.png)])
}

async function renderPng(page, imgDataUrl, canvasSize, contentSize) {
  await page.setViewportSize({ width: canvasSize, height: canvasSize })
  await page.setContent(
    `<body style="margin:0;background:transparent"><div style="width:${canvasSize}px;height:${canvasSize}px;display:flex;align-items:center;justify-content:center">` +
      `<img src="${imgDataUrl}" style="width:${contentSize}px;height:${contentSize}px;object-fit:contain"></div></body>`,
  )
  return page.screenshot({ omitBackground: true })
}

async function main() {
  const pngBuf = readFileSync(srcAppIconPng)
  const imgDataUrl = `data:image/png;base64,${pngBuf.toString('base64')}`

  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ deviceScaleFactor: 1 })

  try {
    const WIN_SIZES = [16, 24, 32, 48, 64, 128, 256]
    const winEntries = []
    for (const size of WIN_SIZES) {
      const png = await renderPng(page, imgDataUrl, size, size)
      winEntries.push({ size, png })
    }
    const icoBuffer = buildIco(winEntries)
    const iconPng512 = await renderPng(page, imgDataUrl, 512, 512)
    const iconMac1024 = await renderPng(page, imgDataUrl, 1024, Math.round(1024 * (824 / 1024)))

    // Target build folders
    const buildDirs = [
      join(root, 'apps/shell/build'),
      join(root, 'apps/docxeditor/build'),
      join(root, 'apps/docs/build'),
    ]

    for (const dir of buildDirs) {
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'icon.ico'), icoBuffer)
      writeFileSync(join(dir, 'icon.png'), iconPng512)
      writeFileSync(join(dir, 'icon-mac.png'), iconMac1024)
      console.log(`Updated icons in ${dir}`)
    }

    // Target assets folders
    const assetTargets = [
      join(root, 'apps/shell/src/renderer/src/assets/app-icon.png'),
      join(root, 'apps/docxeditor/src/renderer/assets/app-icon.png'),
      join(root, 'apps/docs/src/renderer/assets/app-icon.png'),
      join(root, 'apps/slides/src/renderer/assets/app-icon.png'),
      join(root, 'apps/sheets/src/renderer/assets/app-icon.png'),
    ]

    for (const target of assetTargets) {
      copyFileSync(srcAppIconPng, target)
      console.log(`Copied app-icon.png to ${target}`)
    }

    const logoTarget = join(root, 'apps/shell/src/renderer/src/assets/genoffice-logo.svg')
    copyFileSync(srcLogoSvg, logoTarget)
    console.log(`Copied genoffice-logo.svg to ${logoTarget}`)

    console.log('All icons and logos generated successfully!')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
