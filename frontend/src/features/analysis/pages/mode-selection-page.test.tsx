import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ModeSelectionPage } from '@/features/analysis/pages/mode-selection-page'
import { renderWithProviders } from '@/tests/test-utils'

describe('ModeSelectionPage', () => {
  it('renders both rebuilt analysis modes from the adapter', async () => {
    renderWithProviders(<ModeSelectionPage />, '/analysis/modes')

    expect(await screen.findByText('成本预估')).toBeInTheDocument()
    expect(await screen.findByText('多项决策')).toBeInTheDocument()
  })
})
