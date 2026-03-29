import { describe, expect, it } from 'vitest'

import {
  getAnalysisSessionPath,
  isResultSessionStatus,
} from '@/lib/analysis/session-path'

describe('session-path', () => {
  it('routes completed sessions to the result page', () => {
    expect(getAnalysisSessionPath('sess-1', 'COMPLETED')).toBe(
      '/analysis/session/sess-1/result',
    )
    expect(isResultSessionStatus('COMPLETED')).toBe(true)
  })

  it('routes in-progress sessions to the analysis workspace', () => {
    expect(getAnalysisSessionPath('sess-2', 'CLARIFYING')).toBe(
      '/analysis/session/sess-2',
    )
    expect(isResultSessionStatus('ANALYZING')).toBe(false)
  })

  it('routes failed sessions to the result page for error review', () => {
    expect(getAnalysisSessionPath('sess-3', 'FAILED')).toBe(
      '/analysis/session/sess-3/result',
    )
  })
})
