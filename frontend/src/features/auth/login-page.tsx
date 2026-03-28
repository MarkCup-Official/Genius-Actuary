import { useMutation } from '@tanstack/react-query'
import { Form, Formik } from 'formik'
import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import * as Yup from 'yup'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { haptics } from '@/lib/utils/haptics'
import { useAppStore } from '@/lib/store/app-store'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const adapter = useApiAdapter()
  const apiMode = useAppStore((state) => state.apiMode)
  const setAuthSession = useAppStore((state) => state.setAuthSession)

  const mutation = useMutation({
    mutationFn: adapter.auth.login,
    onSuccess: (payload) => {
      setAuthSession({
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        currentUser: payload.user,
      })
      haptics.trigger('confirm')
      void navigate('/dashboard')
    },
  })

  return (
    <div className="app-grid flex min-h-screen items-center justify-center p-6">
      <div className="panel-card w-full max-w-md p-8">
        <div className="mb-8 space-y-3 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-border-subtle bg-app-bg-elevated text-gold-primary">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-text-primary">{t('auth.signIn')}</h1>
            <p className="mt-2 text-sm text-text-secondary">
              {apiMode === 'rest' ? t('auth.restHelper') : t('auth.helper')}
            </p>
          </div>
        </div>

        {apiMode === 'rest' ? (
          <div className="space-y-4">
            <div className="rounded-[22px] border border-border-subtle bg-app-bg-elevated p-4 text-sm leading-7 text-text-secondary">
              {t('auth.restDetail')}
            </div>

            {mutation.isError ? (
              <p className="rounded-2xl border border-[rgba(197,109,99,0.4)] bg-[rgba(197,109,99,0.12)] px-4 py-3 text-sm text-[#f7d4cf]">
                {(mutation.error as Error).message}
              </p>
            ) : null}

            <Button
              className="w-full"
              disabled={mutation.isPending}
              onClick={() =>
                void mutation.mutateAsync({
                  email: '',
                  password: '',
                  mfaCode: '',
                })
              }
            >
              {mutation.isPending ? t('auth.restPending') : t('auth.restAction')}
            </Button>
          </div>
        ) : (
          <Formik
            initialValues={{
              email: 'analyst@geniusactuary.ai',
              password: 'password123',
              mfaCode: '123456',
            }}
            validationSchema={Yup.object({
              email: Yup.string().email().required(),
              password: Yup.string().min(8).required(),
              mfaCode: Yup.string().min(6).required(),
            })}
            onSubmit={async (values) => {
              await mutation.mutateAsync(values)
            }}
          >
            {({ values, errors, touched, handleChange, isSubmitting }) => (
              <Form className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-text-secondary">{t('auth.email')}</label>
                  <Input name="email" value={values.email} onChange={handleChange} />
                  {touched.email && errors.email ? <p className="text-xs text-[#f7d4cf]">{errors.email}</p> : null}
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-text-secondary">{t('auth.password')}</label>
                  <Input name="password" type="password" value={values.password} onChange={handleChange} />
                  {touched.password && errors.password ? <p className="text-xs text-[#f7d4cf]">{errors.password}</p> : null}
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-text-secondary">{t('auth.mfaCode')}</label>
                  <Input name="mfaCode" value={values.mfaCode} onChange={handleChange} />
                  {touched.mfaCode && errors.mfaCode ? <p className="text-xs text-[#f7d4cf]">{errors.mfaCode}</p> : null}
                </div>

                {mutation.isError ? (
                  <p className="rounded-2xl border border-[rgba(197,109,99,0.4)] bg-[rgba(197,109,99,0.12)] px-4 py-3 text-sm text-[#f7d4cf]">
                    {(mutation.error as Error).message}
                  </p>
                ) : null}

                <Button type="submit" className="w-full" disabled={isSubmitting || mutation.isPending}>
                  {mutation.isPending ? t('common.loading') : t('common.confirm')}
                </Button>
              </Form>
            )}
          </Formik>
        )}
      </div>
    </div>
  )
}
