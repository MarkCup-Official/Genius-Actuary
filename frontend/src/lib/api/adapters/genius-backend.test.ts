import { describe, expect, it } from 'vitest'

import {
  mapBackendProgress,
  mapBackendReport,
  mapBackendSession,
  toBackendAnswers,
  type BackendSession,
} from '@/lib/api/adapters/genius-backend'

function buildBackendSession(overrides: Partial<BackendSession> = {}): BackendSession {
  return {
    session_id: 'sess-backend-1',
    owner_client_id: 'client-1',
    mode: 'single_decision',
    problem_statement: 'Should I join the overseas exchange program?',
    status: 'COMPLETED',
    clarification_questions: [
      {
        question_id: 'q-1',
        question_text: 'What is your main goal?',
        purpose: 'Clarify the decision objective.',
        options: ['Save money', 'Broaden exposure'],
        allow_custom_input: true,
        allow_skip: true,
        priority: 1,
        answered: true,
      },
    ],
    answers: [
      {
        question_id: 'q-1',
        value: 'Broaden exposure',
        source: 'frontend',
        answered_at: '2026-03-28T12:00:00.000Z',
      },
    ],
    search_tasks: [
      {
        task_id: 'task-1',
        search_topic: 'exchange program cost',
        search_goal: 'Validate tuition and living cost signals.',
        search_scope: 'Last 12 months',
        suggested_queries: ['exchange program cost'],
        required_fields: ['title', 'date'],
        freshness_requirement: 'high',
        status: 'completed',
      },
    ],
    calculation_tasks: [
      {
        task_id: 'calc-1',
        objective: 'Run affordability check',
        formula_hint: 'tuition + rent + travel',
        input_params: {
          tuition: 12000,
        },
        status: 'completed',
      },
    ],
    evidence_items: [
      {
        evidence_id: 'ev-1',
        title: 'University fee schedule',
        source_url: 'https://example.com/fees',
        source_name: 'Example University',
        fetched_at: '2026-03-28T12:01:00.000Z',
        summary: 'Official tuition information for exchange students.',
        extracted_facts: ['Fee range available'],
        confidence: 0.82,
      },
    ],
    chart_artifacts: [
      {
        chart_id: 'chart-1',
        chart_type: 'bar',
        title: 'Program cost comparison',
        spec: {
          labels: ['Tuition', 'Housing', 'Travel'],
          values: [12, 8, 3],
          unit: 'k USD',
        },
        notes: 'Backend preview artifact',
      },
    ],
    major_conclusions: [
      {
        conclusion_id: 'conclusion-1',
        content: 'The exchange program is viable if the scholarship lands.',
        conclusion_type: 'inference',
        basis_refs: ['ev-1'],
        confidence: 0.74,
      },
    ],
    report: {
      summary: 'The exchange option is attractive but sensitive to scholarship outcome.',
      assumptions: ['Scholarship outcome is still pending.'],
      recommendations: ['Confirm scholarship timeline before committing.'],
      open_questions: ['What is the visa processing lead time?'],
      chart_refs: ['chart-1'],
    },
    events: [
      {
        timestamp: '2026-03-28T11:50:00.000Z',
        kind: 'session_completed',
        payload: {},
      },
    ],
    created_at: '2026-03-28T11:00:00.000Z',
    updated_at: '2026-03-28T12:10:00.000Z',
    ...overrides,
  }
}

describe('genius backend contract mapping', () => {
  it('maps backend sessions into the frontend domain shape', () => {
    const session = mapBackendSession(buildBackendSession())

    expect(session.id).toBe('sess-backend-1')
    expect(session.mode).toBe('single-option')
    expect(session.questions[0]?.fieldType).toBe('single-choice')
    expect(session.calculations[0]?.formulaExpression).toBe('tuition + rent + travel')
    expect(session.lastInsight).toContain('viable')
  })

  it('builds a frontend report bundle from the backend payload', () => {
    const report = mapBackendReport(buildBackendSession())

    expect(report.summaryTitle).toContain('exchange')
    expect(report.highlights).toHaveLength(4)
    expect(report.charts[0]?.kind).toBe('bar')
    expect(report.disclaimers[1]).toContain('API Key')
  })

  it('translates progress and outgoing answers for the backend step route', () => {
    const backendSession = buildBackendSession({ status: 'ANALYZING', report: null })
    const progress = mapBackendProgress(backendSession)
    const answers = toBackendAnswers([
      {
        id: 'answer-1',
        questionId: 'q-1',
        answerStatus: 'skipped',
        selectedOptions: undefined,
        customInput: '',
        numericValue: undefined,
      },
    ])

    expect(progress.status).toBe('ANALYZING')
    expect(progress.overallProgress).toBeGreaterThan(0)
    expect(answers[0]?.question_id).toBe('q-1')
    expect(answers[0]?.value).toBe('skipped')
  })
})
