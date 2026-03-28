import { describe, expect, it } from 'vitest'

import { buildScenarioBundle, detectScenario } from '@/lib/mock/data'

describe('mock scenario bundle', () => {
  it('detects exchange-like prompts', () => {
    expect(detectScenario('我是否应该参加海外交换？')).toBe('exchange')
  })

  it('builds a complete scenario bundle', () => {
    const bundle = buildScenarioBundle('sess-test', '我是否应该买车而不是继续公共交通？', 'single-option')

    expect(bundle.questions.length).toBeGreaterThan(0)
    expect(bundle.report.charts.length).toBeGreaterThan(0)
    expect(bundle.report.highlights.length).toBeGreaterThan(0)
    expect(bundle.evidence.length).toBeGreaterThan(0)
  })
})
