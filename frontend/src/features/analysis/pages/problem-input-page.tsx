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

export function ProblemInputPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const adapter = useApiAdapter()
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = (searchParams.get('mode') as 'single-option' | 'multi-option' | null) ?? 'single-option'
  const isChinese = i18n.language.startsWith('zh')

  const promptSuggestions = isChinese
    ? [
        '我是否应该参加大三的海外交换项目？',
        '我是否应该买车，而不是继续依赖公共交通？',
        '我现在是应该申请研究生，还是先工作两年？',
      ]
    : [
        'Should I join an overseas exchange program in my junior year?',
        'Should I buy a car instead of continuing to rely on public transit?',
        'Should I apply for graduate school now or work for two years first?',
      ]

  const createMutation = useMutation({
    mutationFn: adapter.analysis.create,
    onSuccess: (session) => {
      void navigate(`/analysis/session/${session.id}/clarify`)
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('common.nextStep')}
        title={t('analysis.intakeTitle')}
        description={t('analysis.intakeSubtitle')}
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-5 p-6">
          <div className="flex items-center gap-3">
            <Badge tone="gold">{mode === 'single-option' ? t('analysis.singleMode') : t('analysis.multiMode')}</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const nextMode = mode === 'single-option' ? 'multi-option' : 'single-option'
                setSearchParams({ mode: nextMode })
              }}
            >
              {t('analysis.switchMode')}
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
                    {t('analysis.problemStatementLabel')}
                  </label>
                  <Textarea
                    id="problemStatement"
                    name="problemStatement"
                    value={values.problemStatement}
                    onChange={handleChange}
                    placeholder={t('analysis.problemStatementPlaceholder')}
                    className="min-h-44 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-text-muted">{t('analysis.suggestions')}</p>
                  <div className="flex flex-wrap gap-2">
                    {promptSuggestions.map((suggestion) => {
                      const isActive = values.problemStatement === suggestion

                      return (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setFieldValue('problemStatement', suggestion)}
                          className={`interactive-lift rounded-full border px-4 py-2 text-sm transition ${
                            isActive
                              ? 'border-border-strong bg-[rgba(212,175,55,0.14)] text-text-primary shadow-[0_0_0_1px_rgba(249,228,159,0.08)]'
                              : 'border-border-subtle bg-app-bg-elevated text-text-secondary hover:border-border-strong hover:text-text-primary'
                          }`}
                        >
                          {suggestion}
                        </button>
                      )
                    })}
                  </div>
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
            <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4 text-sm leading-7 text-text-secondary">
              {t('analysis.suggestionHint1')}
            </div>
            <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4 text-sm leading-7 text-text-secondary">
              {t('analysis.suggestionHint2')}
            </div>
            <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4 text-sm leading-7 text-text-secondary">
              {t('analysis.suggestionHint3')}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
