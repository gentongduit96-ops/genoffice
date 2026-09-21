import { describe, it, expect } from 'vitest'
import {
  parseAiFindingsResponse,
  SYSTEM_PROMPT_PAGE_ANALYZER,
  buildSystemPromptPageAnalyzer,
  ANALYSIS_PRESETS,
} from '../src/renderer/services/page-analyzer'

describe('Page Analyzer Service', () => {
  it('has a valid fixed system prompt adapted to language', () => {
    const promptId = buildSystemPromptPageAnalyzer('id')
    expect(promptId).toContain('You are an advanced autonomous document reviewer')
    expect(promptId).toContain('Bahasa Indonesia')

    const promptEn = buildSystemPromptPageAnalyzer('en')
    expect(promptEn).toContain('English')

    const promptAr = buildSystemPromptPageAnalyzer('ar')
    expect(promptAr).toContain('العربية (Arabic)')
  })

  it('contains the Turats Arabic 8-aspects preset as the primary preset', () => {
    const turats = ANALYSIS_PRESETS.find((p) => p.id === 'turats_arabic')
    expect(turats).toBeDefined()
    expect(turats?.prompt).toContain('8 Aspek Analisis Utama')
    expect(turats?.prompt).toContain('Huruf \'Illat Akhir')
    expect(turats?.prompt).toContain('Nahwu')
    expect(turats?.prompt).toContain('Sharaf')
    expect(turats?.prompt).toContain('Hamzah')
    expect(turats?.prompt).toContain('Imla\'')
    expect(turats?.prompt).toContain('Tahqiq Naskah')
    expect(turats?.prompt).toContain('Balaghah & Uslub')
    expect(turats?.prompt).toContain('Referensi Kitab Mu\'tabar')
    expect(turats?.prompt).toContain('Usulan Teks (Ber-harakat)')
  })

  it('parses direct JSON findings', () => {
    const json = JSON.stringify({
      findings: [
        {
          quote: 'هذا كتاب مبين',
          comment: 'كلمة كتاب بالرفع خبر المبتدأ',
          suggestion: 'هَذَا كِتَابٌ مُبِينٌ',
        },
      ],
    })

    const result = parseAiFindingsResponse(json)
    expect(result).toHaveLength(1)
    expect(result[0]?.quote).toBe('هذا كتاب مبين')
    expect(result[0]?.comment).toContain('كلمة كتاب')
    expect(result[0]?.suggestion).toBe('هَذَا كِتَابٌ مُبِينٌ')
  })

  it('parses JSON wrapped in markdown codeblocks', () => {
    const markdown = `
Here is the review:
\`\`\`json
{
  "findings": [
    {
      "quote": "perkataan tersebut",
      "comment": "Gunakan kata baku",
      "suggestion": "ungkapan tersebut"
    }
  ]
}
\`\`\`
`
    const result = parseAiFindingsResponse(markdown)
    expect(result).toHaveLength(1)
    expect(result[0]?.quote).toBe('perkataan tersebut')
    expect(result[0]?.suggestion).toBe('ungkapan tersebut')
  })

  it('handles empty or malformed input safely without throwing', () => {
    expect(parseAiFindingsResponse('')).toEqual([])
    expect(parseAiFindingsResponse('invalid json text')).toEqual([])
    expect(parseAiFindingsResponse('{"findings": []}')).toEqual([])
  })
})
