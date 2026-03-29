import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Topbar } from '@/components/layout/topbar'
import { apiClient } from '@/lib/api/client'
import { renderWithAppState } from '@/tests/test-utils'

describe('Topbar', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a warning when the frontend runtime is mock', async () => {
    const requestSpy = vi.spyOn(apiClient, 'request')

    renderWithAppState(<Topbar />, { apiMode: 'mock', locale: 'en' })

    expect(
      await screen.findByText(
        'The frontend is currently using the mock adapter instead of the live backend LLM.',
      ),
    ).toBeInTheDocument()
    expect(requestSpy).not.toHaveBeenCalled()
  })

  it('hides the warning when the frontend uses a real backend LLM adapter', async () => {
    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValue({
      app_name: 'Genius Actuary',
      supported_modes: [],
      session_statuses: [],
      next_actions: [],
      notes: [
        'Adapters: analysis=openai_compatible/minimax, clarification_follow_up_round_limit=2, search=brave, chart=mock, calculation_mcp_enabled=false',
      ],
    })

    renderWithAppState(<Topbar />, { apiMode: 'rest', locale: 'en' })

    await waitFor(() => expect(requestSpy).toHaveBeenCalled())
    expect(
      screen.queryByText(/mock adapter instead of the live backend llm/i),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/backend analysis adapter is currently mock/i),
    ).not.toBeInTheDocument()
  })

  it('shows a warning when the backend analysis adapter itself is mock', async () => {
    vi.spyOn(apiClient, 'request').mockResolvedValue({
      app_name: 'Genius Actuary',
      supported_modes: [],
      session_statuses: [],
      next_actions: [],
      notes: [
        'Adapters: analysis=mock/demo, clarification_follow_up_round_limit=2, search=brave, chart=mock, calculation_mcp_enabled=false',
      ],
    })

    renderWithAppState(<Topbar />, { apiMode: 'rest', locale: 'en' })

    expect(
      await screen.findByText(
        'The backend analysis adapter is currently mock, so this is not a live LLM run.',
      ),
    ).toBeInTheDocument()
  })
})
