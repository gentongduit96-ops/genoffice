# Modul InDesign (IDML) & AI Design Copilot — Implementation Plan

## 1. Executive Summary & Goal

Mengintegrasikan modul **Adobe InDesign (IDML) Viewer, Visual Editor, dan AI Design Copilot** ke dalam platform **GenOffice** sebagai modul desktop independen (`apps/idml`) dan shared engine package (`packages/idml-engine`). 

Inisiatif ini memungkinkan pengguna membuka, melihat dengan fidelitas tinggi, mengedit teks & aset gambar, serta memanfaatkan AI (copywriting, smart fit-to-frame, multi-language translation, image generation) pada dokumen InDesign tanpa memerlukan lisensi Adobe InDesign desktop.

Seluruh arsitektur dibangun dengan prinsip **Strict Isolation & Non-Destructive Integration** agar kegagalan atau crash pada modul IDML tidak akan pernah mempengaruhi dokumen kerja lain (Office Docs, Sheets, Slides, Markdown, atau HTML).

---

## 2. Arsitektur & Prinsip Desain

### 2.1 Pola Modul GenOffice (Electron Multi-WebContentsView)
Modul IDML mengikuti pola arsitektur resmi GenOffice yang identik dengan modul `markdown` dan `html`:

```
genoffice/
├── packages/
│   ├── idml-engine/              # [NEW] Pure TypeScript IDML Parser, Model & Serializer
│   │   ├── src/
│   │   │   ├── types.ts          # IdmlDocument, Spread, Story, Style, Geometry
│   │   │   ├── parser.ts         # JSZip + DOMParser → typed document model
│   │   │   ├── serializer.ts     # Model → IDML Package (lossless XML round-trip)
│   │   │   ├── spread-parser.ts  # Spreads, Pages, TextFrames, Rectangles, Graphics
│   │   │   ├── story-parser.ts   # Paragraph/Character style ranges, inline runs
│   │   │   ├── resource-parser.ts# Styles.xml, Graphic.xml, Fonts.xml, Preferences.xml
│   │   │   ├── preflight.ts      # Overset text detection, missing links detector
│   │   │   └── index.ts
│   │   └── package.json
│   └── ai-provider/              # [EXISTING] Multi-provider LLM streaming & vision
│
├── apps/
│   ├── idml/                     # [NEW] Standalone Electron Module (@genoffice/idml)
│   │   ├── package.json
│   │   ├── electron.vite.config.ts
│   │   ├── vite.renderer.config.ts
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── main/
│   │       │   ├── index.ts      # Standalone runner
│   │       │   └── idml-main.ts  # Exported runtime: createIdmlView, configure, IPC, close
│   │       ├── preload/
│   │       │   └── index.ts      # contextBridge.exposeInMainWorld('idmlApi', ...)
│   │       ├── shared/
│   │       │   └── ipc.ts        # IDML_CHANNELS, IdmlApi, types
│   │       └── renderer/
│   │           ├── main.tsx
│   │           ├── App.tsx       # InDesign-like Workspace Layout
│   │           ├── styles.css
│   │           ├── components/
│   │           │   ├── workspace/ # InDesign Workspace (Toolbox, ControlBar, DockPanels)
│   │           │   ├── canvas/    # Spread Canvas (SVG/HTML5, Rulers, Guides, Zoom/Pan)
│   │           │   ├── frames/    # TextFrame, GraphicFrame, Rectangle, OversetIndicator
│   │           │   ├── panels/    # PagesPanel, LayersPanel, StylesPanel, SwatchesPanel
│   │           │   └── ai/        # AiDesignPanel, SmartFitModal, CopywritingTransport
│   │           └── hooks/         # useIdmlDocument, useSelection, useHistory (Undo/Redo)
│   │
│   └── shell/                    # [MODIFY - Non-Breaking Extensions Only]
│       └── src/
│           ├── main/
│           │   ├── index.ts      # Route .idml, configure runtime, dev proxy port 5180
│           │   └── tab-manager.ts# openIdmlTab, findIdmlTabByPath, idmlIsDirty
│           └── shared/
│               └── tabs-api.ts   # TabKind: ... | 'idml'
```

---

## 3. UI/UX: InDesign-Familiar Workspace Layout

Untuk memastikan desainer dan pengguna grafis merasa familiar, antarmuka `apps/idml` mengadopsi tata letak klasik InDesign Workspace yang elegan dan responsif:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [Topbar / Control Panel]  Tool Options: Font [ Inter ▾ ] [12 pt ▾] [B][I] [≡][≡] Fill:■ Stroke:□ │
├──────┬────────────────────────────────────────────────────────────────────────┬────────┤
│ [T]  │ [Ruler Horizontal 0......100......200......300......400 mm]           │ DOCK   │
│ [V]  │ ┌────────────────────────────────────────────────────────────────────┐ │ [Pages]│
│ Sel  │ │ [Pasteboard Area]                                                  │ │ [Style]│
│      │ │   ┌─────────────────────── Spread 1 ─────────────────────────┐     │ │ [Color]│
│ [A]  │ │   │ [Bleed / Margin Guides]                                  │     │ │ [Layer]│
│ Dir  │ │   │                                                          │     │ │ [Links]│
│      │ │   │  ┌───────────────────────┐   ┌────────────────────────┐  │     │ ├────────┤
│ [T]  │ │   │  │ Headline Text Frame   │   │ Graphic Frame [Image]  │  │     │ [AI    │
│ Type │ │   │  │ "Spring Collection"   │   │ [Replace / Gen AI]     │  │     │  Design│
│      │ │   │  └───────────────────────┘   └────────────────────────┘  │     │  Copilot│
│ [□]  │ │   │                                                          │     │   - Fit│
│ Rect │ │   │  ┌───────────────────────┐                               │     │   - Copy│
│      │ │   │  │ Body Text Story       │                               │     │   - Trans│
│ [H]  │ │   │  │ Lorem ipsum dolor...  │                               │     │   - Img] │
│ Hand │ │   │  │                   [+] │ <-- Overset Text Warning      │     │        │
│      │ │   │  └───────────────────────┘                               │     │        │
│ [Z]  │ │   └──────────────────────────────────────────────────────────┘     │        │
│ Zoom │ └────────────────────────────────────────────────────────────────────┘ │        │
├──────┴────────────────────────────────────────────────────────────────────────┴────────┤
│ [Statusbar] Page: [ Spread 1 of 4 ▾ ] | Zoom: [ 100% ▾ ] | Preflight: ⚠️ 1 Overset Text│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Elemen Antarmuka Utama:
1. **Left Toolbox (Palette Alat)**:
   - **Selection Tool (`V`)**: Memilih, memindahkan, dan mengubah ukuran bounding box frame.
   - **Direct Selection Tool (`A`)**: Memilih konten internal frame (misal gambar di dalam crop mask).
   - **Type Tool (`T`)**: Double click atau drag untuk inline text edit langsung di atas canvas.
   - **Rectangle / Frame Tool (`M` / `F`)**: Menambahkan placeholder bentuk atau gambar baru.
   - **Hand Tool (`H`) & Zoom Tool (`Z`)**: Navigasi pan & zoom canvas yang mulus.
2. **Top Control Bar**: Menampilkan opsi kontekstual berbasis seleksi aktif (font family, font size, leading, tracking, text alignment, fill swatch, stroke weight).
3. **Center Artboard Canvas**:
   - Menampilkan layout Spread (single page atau facing pages).
   - Panduan visual: Rulers (mm/pt/inch), Bleed line, Margin guides, dan Column guides.
   - High-fidelity visual rendering teks, bentuk vektor, warna CMYK/RGB, dan gambar.
4. **Right Dockable Panels**:
   - **Pages Panel**: Thumbnail navigasi spread dan master pages.
   - **Paragraph & Character Styles**: Hierarki style InDesign dari `Resources/Styles.xml`.
   - **Swatches & Colors**: Color palette dari `Resources/Graphic.xml` (RGB, CMYK, Spot colors).
   - **Links Panel**: Daftar file gambar eksternal/internal beserta resolusi dan status keberadaannya.
   - **AI Design Copilot Panel**: Workspace terintegrasi untuk asistensi AI.
5. **Bottom Status & Preflight Bar**:
   - Spread jumper & zoom control.
   - **Preflight Live Indicator**: Mendeteksi overset text (teks terpotong/meluap dari frame) dan missing image assets secara real-time.

### 3.2 Clean PC Desktop Styling dengan Microsoft Fluent 2 Design System

Untuk memberikan sensasi aplikasi desktop PC kelas enterprise yang modern, bersih, dan konsisten dengan ekosistem GenOffice (Docs, Sheets, Slides), modul IDML dirancang secara ketat mengikuti **Microsoft Fluent 2 Design System**:

1. **Design Tokens Terstandarisasi (`@genoffice/ui/tokens.css`)**:
   - Menjadikan `tokens.css` sebagai satu-satunya *single source of truth* untuk seluruh warna chrome, stroke, shadow, dan radius.
   - Tidak ada hardcoded ad-hoc utility colors.

2. **Tipografi & Tampilan Desktop**:
   - Font antarmuka: `'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif`.
   - Hierarchy teks: Label tool 12px (Regular), Panel title 13px (Semibold), Header 14px (Semibold), dengan contrast ratio WCAG AAA.

3. **Neutral Surface & Pasteboard Visual**:
   - **Chrome UI** (Toolbox, Control Bar, Panels): Menggunakan `--colorNeutralBackground1` (#ffffff di Light, #202020 di Dark) dengan batas tepi 1px crisp `--colorNeutralStroke2` (#e0e0e0).
   - **Canvas Pasteboard**: `--canvas` (#edebe9 di Light, #191919 di Dark) yang memberikan kontras natural terhadap kertas putih spread dokumen.
   - **Spread Artboard Shadow**: `--shadow-fluent-4` untuk memberikan efek lembar kertas cetak fisik yang elegan.

4. **Corner Radius & Komponen Kontrol**:
   - Tombol tool & dropdown: `--radius-4` (4px) khas Windows/Office desktop.
   - Panel cards & flyouts: `--radius-6` (6px) hingga `--radius-8` (8px).
   - Popovers & Dropdowns: Didukung elevation `--shadow-fluent-8` dan border subtle.

5. **Aksen Identitas Modul (InDesign Creative Magenta)**:
   - Modul IDML menggunakan per-app accent berbasis warna khas InDesign yang disesuaikan dengan palet Fluent:
     - **Light Theme**: `--accent: #d6285d; --accent-soft: #fdeef3; --accent-dark: #b81e4c;`
     - **Dark Theme**: `--accent: #ff6b9d; --accent-soft: #381824; --accent-dark: #e03c7a;`
   - Aksen ini digunakan pada: Active tool indicator, selection handles/bounding box, live text cursor, dan highlight overset badge.

6. **Interaksi & Mikro-animasi Bersih (Clean Micro-interactions)**:
   - **Hover States**: Transisi halus 100ms menggunakan `--colorNeutralBackground1Hover`.
   - **Selection Bounding Box**: Garis seleksi 1px vector dengan 8 handle kotak putih bertepi aksen (standard DTP desktop app).
   - **Fluent ScreenTips**: Tooltip desktop bergaya Office yang menampilkan nama fungsi dan hotkey (contoh: `Selection Tool (V)`, `Zoom In (Ctrl++)`).
   - **Reusable Components**: Memanfaatkan komponen siap pakai dari `packages/ui` (`Dropdown`, `ScreenTip`, `ColorPicker`).

---

## 4. Rincian Teknis: Parser & Lossless Engine (`packages/idml-engine`)

IDML adalah file ZIP yang berisi kumpulan dokumen XML terdistribusi. Tantangan utama IDML parser adalah menjaga **round-trip fidelity** (agar file yang diedit dapat dibuka kembali di Adobe InDesign desktop tanpa merusak struktur XML aslinya).

### 4.1 Modul IDML Engine:
1. **`parser.ts` (JSZip + DOMParser)**:
   - Membaca `designmap.xml` untuk memetakan path semua spreads, stories, dan resources.
   - Parsing `Resources/Preferences.xml` untuk document size, margins, facing pages setup.
   - Parsing `Resources/Styles.xml` dan `Resources/Graphic.xml` untuk color swatches dan style sheet.
   - Parsing `Spreads/Spread_*.xml` untuk pohon objek geometri dan penempatan TextFrame / GraphicFrame.
   - Parsing `Stories/Story_*.xml` untuk konten teks berstruktur (ParagraphStyleRange, CharacterStyleRange, Run elements).
2. **`serializer.ts` (Preservation & Round-Trip Serializer)**:
   - Menyimpan buffer ZIP asli sebagai basis.
   - Hanya melakukan patch / re-serialize pada file XML yang mengalami perubahan (misalnya `Story_*.xml` yang diedit teksnya, atau `Spread_*.xml` yang diubah ukuran framenya).
   - Menjaga XML namespace, atribut internal InDesign (Self ID, AppliedParagraphStyle, PageItem default attributes), sehingga InDesign desktop dapat membuka kembali file tanpa peringatan korupsi.
3. **`preflight.ts` (Layout & Overset Detection)**:
   - Mengkalkulasi metrik teks perkiraan (menggunakan `@genoffice/font-metrics` atau canvas measureText) terhadap geometric bounds TextFrame.
   - Menandai indikator overset `[+]` jika teks melebihi kapasitas frame fisik.

---

## 5. Fitur AI Copilot & Otomasi Desain

Modul IDML memanfaatkan modul shared `@genoffice/ai-provider` yang sudah ada di GenOffice (mendukung Claude, OpenAI, Gemini, DeepSeek, dan Local Ollama):

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Design Copilot                        │
├─────────────────────────────────────────────────────────────┤
│ Target Seleksi: [ TextFrame #Story_u12a: Headline ]         │
│ Kapasitas Frame: ~45 karakter (Lebar: 210mm, Tinggi: 25mm)  │
│                                                             │
│ [ Quick Actions ]                                           │
│  ✨ Auto-Fit Text to Frame (Perbaiki Overset / Meluap)      │
│  ✍️ Tulis Ulang Salinan (Persuasif / Formal / Ringkas)      │
│  🌐 Terjemahkan Halaman / Frame (Multibahasa)               │
│  🎨 Generate Placeholder Gambar (Sesuai Konsep Desain)      │
│                                                             │
│ [ Prompt Asisten Desain ]                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Buat headline musim panas yang eye-catching, max 3 kata │ │
│ └─────────────────────────────────────────────────────────┘ │
│ [ ⚡ Terapkan Langsung ke Frame ]                           │
└─────────────────────────────────────────────────────────────┘
```

### 5.1 Kemampuan Utama AI Copilot:
1. **Smart Copy Fit-to-Frame (Auto-Fix Overset)**:
   - Saat teks di dalam TextFrame melebihi tinggi frame (overset text `[+]`), pengguna dapat mengklik satu tombol AI untuk memadatkan teks (shorten/rewrite) secara otomatis hingga pas dengan batas geometri frame tanpa mengubah ukuran font.
2. **Context-Aware Copywriting**:
   - Mengubah nada bicara (tone) salinan teks, memperbaiki tata bahasa, atau memperluas/memperpendek teks dengan mempertahankan hierarki style karakter (bold, italic, warna kata kunci tetap terjaga).
3. **Automated Multi-Language Localization**:
   - Menerjemahkan isi teks dari seluruh halaman atau frame tertentu ke bahasa lain (misal: ID -> EN, JP, dsb) secara in-place, dengan cerdas membatasi panjang terjemahan agar tidak merusak layout.
4. **AI Image Placeholder Filler**:
   - Jika dokumen memiliki Graphic Frame kosong atau gambar berresolusi rendah, AI (via modul image generation `@genoffice/ai-provider`) dapat mengenerate gambar ilustrasi/foto yang sesuai dengan deskripsi konteks dokumen dan langsung memasangnya ke dalam frame.

---

## 6. Rencana Implementasi Bertahap (Phased Roadmap)

### **Phase 1: Engine Foundation & High-Fidelity Viewer**
- Membuat `packages/idml-engine` dengan dukungan unzip, parsing XML manifest, spread, stories, dan resources.
- Membuat skeleton `apps/idml` dengan arsitektur Vite + Electron identik dengan `apps/markdown`.
- Mengimplementasikan InDesign-like Canvas viewer yang menampilkan spread, text frames, rectangles, warna swatches, dan placeholder gambar.
- Integrasi ke `apps/shell` (routing path `.idml`, tab manager, isolasi renderer di port 5180).

### **Phase 2: InDesign Workspace & Direct Text Editing**
- Mengimplementasikan Left Toolbox (Selection Tool, Type Tool, Hand/Zoom).
- Canvas Direct Selection: Klik frame untuk menampilkan bounding box & drag handles.
- Inline Text Editing: Edit teks langsung di atas frame atau via Story Editor drawer.
- Preflight & Overset Indicator: Menampilkan badge `[+]` jika teks meluap dari frame.
- Lossless Save: Serializer memperbarui `Story_*.xml` ke dalam container IDML asli.

### **Phase 3: Image Replacement & Dockable Styling Panels**
- Drag & Drop penggantian gambar pada Graphic Frames (menyimpan gambar ke dalam asset IDML atau linking).
- Panel Swatches & Colors: Mengubah warna fill dan stroke secara visual.
- Panel Paragraph & Character Styles: Menerapkan style InDesign yang ada ke teks yang dipilih.

### **Phase 4: AI Design Copilot Integration**
- Menyambungkan UI AI Panel di `apps/idml` dengan `@genoffice/ai-provider`.
- Fitur **Smart Fit-to-Frame** untuk auto-resolve overset text.
- Fitur Contextual Copywriting & Tone Shifter.
- Fitur In-Place Document Translation.
- Fitur AI Image Generation untuk Graphic Frame.

---

## 7. Rincian Perubahan File

### Component 1: `packages/idml-engine` [BARU]
- `packages/idml-engine/package.json` — dependency: `jszip`
- `packages/idml-engine/src/types.ts` — model data IDML
- `packages/idml-engine/src/parser.ts` — parser utama
- `packages/idml-engine/src/spread-parser.ts` — parser spread & layout
- `packages/idml-engine/src/story-parser.ts` — parser teks & style range
- `packages/idml-engine/src/resource-parser.ts` — parser styles, fonts, swatches
- `packages/idml-engine/src/serializer.ts` — serializer zip/xml round-trip
- `packages/idml-engine/src/preflight.ts` — deteksi overset & missing links
- `packages/idml-engine/src/index.ts` — public exports

### Component 2: `apps/idml` [BARU]
- `apps/idml/package.json` — workspace package `@genoffice/idml`
- `apps/idml/electron.vite.config.ts` & `vite.renderer.config.ts` — dev server port 5180
- `apps/idml/src/main/idml-main.ts` — WebContentsView manager, IPC handlers `idml:*`
- `apps/idml/src/preload/index.ts` — contextBridge `idmlApi`
- `apps/idml/src/shared/ipc.ts` — type definitions IPC & channels
- `apps/idml/src/renderer/App.tsx` — InDesign Workspace layout
- `apps/idml/src/renderer/styles.css` — dark/light theme InDesign styling
- `apps/idml/src/renderer/components/workspace/Toolbox.tsx` — V, A, T, M, H, Z tools
- `apps/idml/src/renderer/components/workspace/ControlBar.tsx` — context styling bar
- `apps/idml/src/renderer/components/canvas/SpreadCanvas.tsx` — layout renderer dengan rulers & guides
- `apps/idml/src/renderer/components/frames/TextFrameView.tsx` — text frame dengan overset badge
- `apps/idml/src/renderer/components/frames/GraphicFrameView.tsx` — image frame & replacement
- `apps/idml/src/renderer/components/panels/PagesPanel.tsx` — spread thumbnails
- `apps/idml/src/renderer/components/panels/StylesPanel.tsx` — paragraph & character styles
- `apps/idml/src/renderer/components/panels/SwatchesPanel.tsx` — color swatches
- `apps/idml/src/renderer/components/ai/AiDesignPanel.tsx` — AI Copilot & Smart Fit-to-Frame

### Component 3: `apps/shell` [MODIFIKASI AMAN / NON-DESTRUCTIVE]
- `apps/shell/src/shared/tabs-api.ts`: Menambahkan `'idml'` pada union `TabKind`.
- `apps/shell/src/main/tab-manager.ts`: Menambahkan method `openIdmlTab()`, `findIdmlTabByPath()`, dan pengecekan dirty state `idmlIsDirty`.
- `apps/shell/src/main/index.ts`: Menambahkan route handler untuk file `.idml`, registrasi renderer protocol port 5180, dan open dialog filter.
- `package.json` (root): Menambahkan target scripts dev & build untuk `@genoffice/idml`.

---

## 8. Jaminan Keamanan & Isolasi Modul

1. **Process Isolation**: Seluruh UI IDML berjalan di dalam `WebContentsView` independen dengan `contextIsolation: true` dan sandbox aktif.
2. **IPC Namespace**: Semua channel komunikasi IPC diprefix secara unik dengan `idml:*` (contoh: `idml:read-file`, `idml:save`, `idml:ai-prompt`).
3. **No Cross-Contamination**: Kegagalan parsing IDML (misal file XML korup) hanya ditangkap di dalam tab IDML bersangkutan dengan status error UI yang rapi tanpa menyebabkan shell atau tab dokumen lain crash.
4. **Graceful Fallback**: Jika file IDML memiliki fitur XML yang sangat kompleks dan belum didukung penuh oleh renderer, elemen tersebut tetap dipertahankan utuh pada file ZIP saat disimpan kembali.

---

## 9. Verification & Testing Plan

### Automated Tests
- `npm run test -w @genoffice/idml-engine` — Unit test ekstraksi ZIP, parsing stories, parsing spreads, dan serialisasi round-trip.
- `npm run typecheck -w @genoffice/idml-engine` — Validasi TypeScript types IDML model.
- `npm run typecheck -w @genoffice/idml` — Validasi kompilasi modul IDML.
- `npm run test -w @genoffice/docs` & `npm run test -w @genoffice/markdown` — Menjamin tidak ada efek samping terhadap modul lain.

### Manual Verification
1. Jalankan `npm run dev` dan pastikan dev server IDML aktif di port `5180`.
2. Buka file sample `.idml` melalui File -> Open atau Drag & Drop ke GenOffice Shell.
3. Verifikasi rendering halaman spread (teks headline, body text, bentuk box, warna).
4. Klik Text Frame dengan Selection tool (`V`), beralih ke Type tool (`T`), ubah teks headline.
5. Uji tombol **Save (`Ctrl+S`)** dan verifikasi file `.idml` tersimpan dengan benar.
6. Buka tab AI Copilot, jalankan test copywriting atau smart fit-to-frame.
7. Tutup tab IDML dan pastikan close guard mendeteksi jika ada perubahan yang belum disimpan.
