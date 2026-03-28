import { useMutation, useQuery } from '@tanstack/react-query'
import { Form, Formik } from 'formik'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Select, Textarea } from '@/components/ui/field'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { haptics } from '@/lib/utils/haptics'
import type { ClarificationQuestion, UserAnswer } from '@/types'

type ClarificationValues = Record<string, string | string[]>

function buildInitialValues(questions: ClarificationQuestion[]) {
  return questions.reduce<Record<string, string | string[]>>((accumulator, question) => {
    accumulator[question.id] =
      question.fieldType === 'multi-choice' ? question.recommended ?? [] : question.recommended?.[0] ?? ''
    accumulator[`${question.id}__custom`] = ''
    accumulator[`${question.id}__status`] = 'answered'
    return accumulator
  }, {})
}

function toAnswers(questions: ClarificationQuestion[], values: ClarificationValues): UserAnswer[] {
  return questions.map((question) => {
    const rawStatus = String(values[`${question.id}__status`] ?? 'answered')
    const selectedValue = values[question.id]
    const customInput = String(values[`${question.id}__custom`] ?? '')

    return {
      id: `${question.id}-answer`,
      questionId: question.id,
      answerStatus: rawStatus as UserAnswer['answerStatus'],
      selectedOptions:
        Array.isArray(selectedValue) && selectedValue.length
          ? selectedValue
          : typeof selectedValue === 'string' && selectedValue
            ? [selectedValue]
            : undefined,
      customInput: customInput || undefined,
      numericValue:
        question.fieldType === 'slider' || question.fieldType === 'number'
          ? Number(selectedValue || 0)
          : undefined,
    }
  })
}

export function ClarificationPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { sessionId = '' } = useParams()
  const adapter = useApiAdapter()

  const sessionQuery = useQuery({
    queryKey: ['analysis', sessionId],
    queryFn: () => adapter.analysis.getById(sessionId),
  })

  const submitMutation = useMutation({
    mutationFn: (answers: UserAnswer[]) => adapter.analysis.submitAnswers(sessionId, { answers }),
    onSuccess: (session) => {
      haptics.trigger('confirm')
      void navigate(`/analysis/session/${session.id}/progress`)
    },
  })

  const questions = useMemo(() => sessionQuery.data?.questions ?? [], [sessionQuery.data?.questions])
  const initialValues = useMemo(() => buildInitialValues(questions), [questions])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clarify"
        title={t('analysis.clarifyTitle')}
        description="Each question carries a purpose so the user feels steadily guided instead of pushed through disconnected forms."
      />

      {sessionQuery.data ? (
        <Formik
          initialValues={initialValues}
          enableReinitialize
          onSubmit={async (values) => {
            await submitMutation.mutateAsync(toAnswers(questions, values))
          }}
        >
          {({ values, handleChange, setFieldValue, isSubmitting }) => (
            <Form className="space-y-4">
              {questions.map((question) => (
                <Card key={question.id} className="space-y-4 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge tone="gold">P{question.priority}</Badge>
                        <h2 className="text-lg font-semibold text-text-primary">{question.question}</h2>
                      </div>
                      <p className="text-sm text-text-secondary">
                        <span className="text-gold-ink">{t('analysis.whyThisMatters')}: </span>
                        {question.purpose}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {question.allowSkip ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setFieldValue(`${question.id}__status`, 'skipped')}
                        >
                          {t('analysis.skip')}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFieldValue(`${question.id}__status`, 'uncertain')}
                      >
                        {t('analysis.uncertain')}
                      </Button>
                    </div>
                  </div>

                  {question.fieldType === 'single-choice' ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      {question.options?.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setFieldValue(question.id, option.value)
                            setFieldValue(`${question.id}__status`, 'answered')
                          }}
                          className={`rounded-[20px] border px-4 py-3 text-left text-sm transition ${
                            values[question.id] === option.value
                              ? 'border-border-strong bg-[rgba(212,175,55,0.14)] text-text-primary'
                              : 'border-border-subtle bg-app-bg-elevated text-text-secondary hover:border-border-strong'
                          }`}
                        >
                          <p className="font-medium">{option.label}</p>
                          {option.description ? <p className="mt-1 text-xs text-text-muted">{option.description}</p> : null}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {question.fieldType === 'multi-choice' ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      {question.options?.map((option) => {
                        const selectedValues = (values[question.id] as string[]) ?? []
                        const isActive = selectedValues.includes(option.value)
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              const nextValues = isActive
                                ? selectedValues.filter((item) => item !== option.value)
                                : [...selectedValues, option.value]
                              setFieldValue(question.id, nextValues)
                              setFieldValue(`${question.id}__status`, 'answered')
                            }}
                            className={`rounded-[20px] border px-4 py-3 text-left text-sm transition ${
                              isActive
                                ? 'border-border-strong bg-[rgba(212,175,55,0.14)] text-text-primary'
                                : 'border-border-subtle bg-app-bg-elevated text-text-secondary hover:border-border-strong'
                            }`}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  ) : null}

                  {question.fieldType === 'slider' ? (
                    <div className="space-y-3">
                      <input
                        type="range"
                        min={question.min}
                        max={question.max}
                        value={String(values[question.id] || question.min || 1)}
                        onChange={(event) => {
                          void setFieldValue(question.id, event.target.value)
                          void setFieldValue(`${question.id}__status`, 'answered')
                        }}
                        className="w-full accent-[var(--gold-primary)]"
                      />
                      <p className="mono text-sm text-gold-ink">
                        {String(values[question.id] || question.min || 1)} {question.unit}
                      </p>
                    </div>
                  ) : null}

                  {question.fieldType === 'text' ? (
                    <Input
                      name={question.id}
                      value={String(values[question.id] ?? '')}
                      onChange={(event) => {
                        handleChange(event)
                        void setFieldValue(`${question.id}__status`, 'answered')
                      }}
                      placeholder="Type the most relevant fact or constraint"
                    />
                  ) : null}

                  {question.fieldType === 'textarea' ? (
                    <Textarea
                      name={question.id}
                      value={String(values[question.id] ?? '')}
                      onChange={(event) => {
                        handleChange(event)
                        void setFieldValue(`${question.id}__status`, 'answered')
                      }}
                      placeholder="Describe the context in natural language"
                    />
                  ) : null}

                  {question.allowCustomInput ? (
                    <div className="space-y-2">
                      <label htmlFor={`${question.id}__custom`} className="text-sm text-text-secondary">
                        {t('analysis.customInput')}
                      </label>
                      <Input
                        id={`${question.id}__custom`}
                        name={`${question.id}__custom`}
                        value={String(values[`${question.id}__custom`] ?? '')}
                        onChange={handleChange}
                        placeholder="Optional custom context"
                      />
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <label htmlFor={`${question.id}__status`} className="text-sm text-text-secondary">
                      Answer status
                    </label>
                    <Select
                      id={`${question.id}__status`}
                      name={`${question.id}__status`}
                      value={String(values[`${question.id}__status`])}
                      onChange={handleChange}
                    >
                      <option value="answered">Answered</option>
                      <option value="skipped">Skipped</option>
                      <option value="uncertain">Uncertain</option>
                      <option value="declined">Declined</option>
                    </Select>
                  </div>
                </Card>
              ))}

              <Button type="submit" disabled={isSubmitting || submitMutation.isPending}>
                {t('common.continue')}
              </Button>
            </Form>
          )}
        </Formik>
      ) : null}
    </div>
  )
}
