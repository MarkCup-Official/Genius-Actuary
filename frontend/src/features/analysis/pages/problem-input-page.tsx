import { useMutation } from '@tanstack/react-query'
import { Form, Formik } from 'formik'
import { Lightbulb, WandSparkles } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as Yup from 'yup'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/field'
import { useApiAdapter } from '@/lib/api/use-api-adapter'

const promptSuggestions = [
  '我是否应该参加大三的海外交换项目？',
  '我是否应该买车，而不是继续依赖公共交通？',
  '我现在是应该申请研究生，还是先工作两年？',
]

export function ProblemInputPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const adapter = useApiAdapter()
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = (searchParams.get('mode') as 'single-option' | 'multi-option' | null) ?? 'single-option'

  const createMutation = useMutation({
    mutationFn: adapter.analysis.create,
    onSuccess: (session) => {
      void navigate(`/analysis/session/${session.id}/clarify`)
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Intake"
        title={t('analysis.intakeTitle')}
        description="Use a precise, natural-language prompt. The frontend captures intent, while the backend owns clarification, analysis, and report assembly."
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-5 p-6">
          <div className="flex items-center gap-3">
            <Badge tone="gold">{mode}</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const nextMode = mode === 'single-option' ? 'multi-option' : 'single-option'
                setSearchParams({ mode: nextMode })
              }}
            >
              Switch mode
            </Button>
          </div>

          <Formik
            initialValues={{
              problemStatement: promptSuggestions[0],
            }}
            validationSchema={Yup.object({
              problemStatement: Yup.string().min(12).required(),
            })}
            onSubmit={async (values) => {
              await createMutation.mutateAsync({
                mode,
                problemStatement: values.problemStatement,
              })
            }}
          >
            {({ values, handleChange, handleSubmit, setFieldValue, isSubmitting }) => (
              <Form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label htmlFor="problemStatement" className="text-sm text-text-secondary">
                    Problem statement
                  </label>
                  <Textarea
                    id="problemStatement"
                    name="problemStatement"
                    value={values.problemStatement}
                    onChange={handleChange}
                    placeholder="Describe the decision, options, constraints, and uncertainty you want the backend to analyze."
                    className="min-h-44 text-base"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {promptSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setFieldValue('problemStatement', suggestion)}
                      className="rounded-full border border-border-subtle bg-app-bg-elevated px-4 py-2 text-sm text-text-secondary transition hover:border-border-strong hover:text-text-primary"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                <Button type="submit" disabled={createMutation.isPending || isSubmitting}>
                  <WandSparkles className="size-4" />
                  {t('analysis.startAnalysis')}
                </Button>
              </Form>
            )}
          </Formik>
        </Card>

        <Card className="space-y-5 p-6">
          <div className="flex items-center gap-3 text-gold-primary">
            <Lightbulb className="size-5" />
            <h2 className="text-lg font-semibold text-text-primary">{t('analysis.suggestions')}</h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4 text-sm text-text-secondary">
              Prefer describing the decision, alternatives, timing, and the constraint you care about most.
            </div>
            <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4 text-sm text-text-secondary">
              The real backend currently returns structured clarification questions and advances the session step by step through its orchestrator.
            </div>
            <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4 text-sm text-text-secondary">
              This workspace keeps the black-gold design system consistent whether you are using mock data or the FastAPI backend.
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
