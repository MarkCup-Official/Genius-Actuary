import { useMutation, useQuery } from '@tanstack/react-query'
import { Form, Formik } from 'formik'
import { useTranslation } from 'react-i18next'
import * as Yup from 'yup'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/field'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { useAppStore } from '@/lib/store/app-store'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const adapter = useApiAdapter()
  const syncFromSettings = useAppStore((state) => state.syncFromSettings)

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

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Workspace" title={t('settings.title')} description={t('settings.subtitle')} />

      {settingsQuery.data ? (
        <Formik
          initialValues={settingsQuery.data}
          enableReinitialize
          validationSchema={Yup.object({
            themeMode: Yup.string().required(),
            language: Yup.string().required(),
            apiMode: Yup.string().required(),
            displayDensity: Yup.string().required(),
          })}
          onSubmit={async (values) => {
            await updateMutation.mutateAsync(values)
          }}
        >
          {({ values, handleChange, isSubmitting }) => (
            <Form className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="space-y-5 p-6">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Appearance</h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Keep the same token system while switching between obsidian dark, champagne light, and system mode.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm text-text-secondary">{t('common.theme')}</label>
                    <Select name="themeMode" value={values.themeMode} onChange={handleChange}>
                      <option value="dark">{t('common.dark')}</option>
                      <option value="light">{t('common.light')}</option>
                      <option value="system">{t('common.system')}</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-text-secondary">{t('common.language')}</label>
                    <Select name="language" value={values.language} onChange={handleChange}>
                      <option value="zh">中文</option>
                      <option value="en">English</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-text-secondary">API mode</label>
                    <Select name="apiMode" value={values.apiMode} onChange={handleChange}>
                      <option value="mock">Mock adapter</option>
                      <option value="rest">REST backend</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-text-secondary">Density</label>
                    <Select name="displayDensity" value={values.displayDensity} onChange={handleChange}>
                      <option value="cozy">Cozy</option>
                      <option value="compact">Compact</option>
                    </Select>
                  </div>
                </div>
              </Card>

              <Card className="space-y-5 p-6">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Delivery & fallback</h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    These preferences mirror the expected backend integration surface without hardcoding orchestration into the UI.
                  </p>
                </div>
                <div className="grid gap-3">
                  <label className="flex items-center justify-between rounded-[20px] border border-border-subtle bg-app-bg-elevated px-4 py-3 text-sm text-text-secondary">
                    Email notifications
                    <Input
                      type="checkbox"
                      name="notificationsEmail"
                      checked={values.notificationsEmail}
                      onChange={handleChange}
                      className="h-5 w-5 border-0 bg-transparent p-0 shadow-none"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-[20px] border border-border-subtle bg-app-bg-elevated px-4 py-3 text-sm text-text-secondary">
                    Push notifications
                    <Input
                      type="checkbox"
                      name="notificationsPush"
                      checked={values.notificationsPush}
                      onChange={handleChange}
                      className="h-5 w-5 border-0 bg-transparent p-0 shadow-none"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-[20px] border border-border-subtle bg-app-bg-elevated px-4 py-3 text-sm text-text-secondary">
                    Auto PDF export
                    <Input
                      type="checkbox"
                      name="autoExportPdf"
                      checked={values.autoExportPdf}
                      onChange={handleChange}
                      className="h-5 w-5 border-0 bg-transparent p-0 shadow-none"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-[20px] border border-border-subtle bg-app-bg-elevated px-4 py-3 text-sm text-text-secondary">
                    Chart motion
                    <Input
                      type="checkbox"
                      name="chartMotion"
                      checked={values.chartMotion}
                      onChange={handleChange}
                      className="h-5 w-5 border-0 bg-transparent p-0 shadow-none"
                    />
                  </label>
                </div>
                <Button type="submit" disabled={isSubmitting || updateMutation.isPending}>
                  {updateMutation.isPending ? t('common.loading') : t('common.save')}
                </Button>
              </Card>
            </Form>
          )}
        </Formik>
      ) : null}
    </div>
  )
}
