import { useMutation, useQuery } from '@tanstack/react-query'
import { Form, Formik } from 'formik'
import { useTranslation } from 'react-i18next'
import * as Yup from 'yup'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/field'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { useAppStore } from '@/lib/store/app-store'

export function SettingsPage() {
  const { i18n, t } = useTranslation()
  const adapter = useApiAdapter()
  const syncFromSettings = useAppStore((state) => state.syncFromSettings)
  const currentApiMode = useAppStore((state) => state.apiMode)
  const currentDisplayDensity = useAppStore((state) => state.displayDensity)
  const isZh = i18n.language.startsWith('zh')

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: adapter.settings.get,
  })

  const updateMutation = useMutation({
    mutationFn: adapter.settings.update,
    onSuccess: (settings) => {
      syncFromSettings(settings)
      void i18n.changeLanguage(settings.language)
    },
  })

  const text = {
    eyebrow: isZh ? '工作台偏好' : 'Workspace',
    title: isZh ? '界面设置' : 'Interface Settings',
    subtitle: isZh
      ? '当前仅保留主题和语言设置。'
      : 'Only theme and language settings are available right now.',
    appearanceTitle: isZh ? '外观与语言' : 'Appearance',
    appearanceDescription: isZh
      ? '在黑金暗色、浅色和系统模式之间切换时，整套设计 token 保持一致。'
      : 'Keep the same token system while switching between obsidian dark, champagne light, and system mode.',
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={text.eyebrow}
        title={text.title}
        description={text.subtitle}
      />

      {settingsQuery.data ? (
        <Formik
          initialValues={settingsQuery.data}
          enableReinitialize
          validationSchema={Yup.object({
            themeMode: Yup.string().required(),
            language: Yup.string().required(),
          })}
          onSubmit={async (values) => {
            await updateMutation.mutateAsync({
              ...values,
              apiMode: currentApiMode,
              displayDensity: currentDisplayDensity,
            })
          }}
        >
          {({ values, handleChange, isSubmitting }) => (
            <Form className="max-w-3xl">
              <Card className="space-y-5 p-6">
                <div>
                  <h2 className="text-text-primary text-lg font-semibold">
                    {text.appearanceTitle}
                  </h2>
                  <p className="text-text-secondary mt-1 text-sm leading-7">
                    {text.appearanceDescription}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-text-secondary text-sm">
                      {t('common.theme')}
                    </label>
                    <Select
                      name="themeMode"
                      value={values.themeMode}
                      onChange={handleChange}
                    >
                      <option value="dark">{t('common.dark')}</option>
                      <option value="light">{t('common.light')}</option>
                      <option value="system">{t('common.system')}</option>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-text-secondary text-sm">
                      {t('common.language')}
                    </label>
                    <Select
                      name="language"
                      value={values.language}
                      onChange={handleChange}
                    >
                      <option value="zh">中文</option>
                      <option value="en">English</option>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting || updateMutation.isPending}
                  >
                    {updateMutation.isPending
                      ? t('common.loading')
                      : t('common.save')}
                  </Button>
                </div>
              </Card>
            </Form>
          )}
        </Formik>
      ) : null}
    </div>
  )
}
