import { useMutation } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { useAppStore } from '@/lib/store/app-store'
import { haptics } from '@/lib/utils/haptics'

const browserLoginPayload = {
  email: '',
  password: '',
  mfaCode: '',
}

export function LoginPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const adapter = useApiAdapter()
  const setAuthSession = useAppStore((state) => state.setAuthSession)
  const autoStartedRef = useRef(false)
  const isZh = i18n.language.startsWith('zh')

  const text = {
    title: isZh ? '正在准备您的专属空间' : 'Preparing your workspace',
    hint: isZh
      ? '系统会为当前浏览器自动创建并绑定账号，无需邮箱、密码或手动注册。'
      : 'A browser-linked account is created automatically. No email, password, or manual sign-up is required.',
    detail: isZh
      ? '首次进入时会建立当前浏览器的专属 Cookie 账号，后续分析记录会自动归档到这个浏览器身份下。'
      : 'On first entry, we create a cookie-linked account for this browser and keep future analysis history attached to it.',
    action: isZh ? '继续进入' : 'Continue',
    pending: isZh ? '正在创建浏览器账号...' : 'Creating browser account...',
    retry: isZh ? '重新进入' : 'Try again',
  }

  const mutation = useMutation({
    mutationFn: adapter.auth.login,
    onSuccess: (payload) => {
      setAuthSession({
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        currentUser: payload.user,
      })
      haptics.trigger('confirm')
      void navigate('/analysis/modes')
    },
  })

  useEffect(() => {
    if (autoStartedRef.current) {
      return
    }

    autoStartedRef.current = true
    void mutation.mutateAsync(browserLoginPayload)
  }, [mutation])

  return (
    <div className="app-grid flex min-h-screen items-center justify-center p-6">
      <div className="panel-card w-full max-w-md p-8">
        <div className="mb-8 space-y-3 text-center">
          <div className="border-border-subtle bg-app-bg-elevated text-gold-primary mx-auto flex size-14 items-center justify-center rounded-full border">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <h1 className="text-text-primary text-3xl font-semibold tracking-[-0.04em]">
              {text.title}
            </h1>
            <p className="text-text-secondary mt-2 text-sm">{text.hint}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border-border-subtle bg-app-bg-elevated text-text-secondary rounded-[22px] border p-4 text-sm leading-7">
            {text.detail}
          </div>

          {mutation.isError ? (
            <p className="rounded-2xl border border-[rgba(197,109,99,0.4)] bg-[rgba(197,109,99,0.12)] px-4 py-3 text-sm text-[#f7d4cf]">
              {(mutation.error as Error).message}
            </p>
          ) : null}

          <Button
            className="w-full"
            disabled={mutation.isPending}
            onClick={() => void mutation.mutateAsync(browserLoginPayload)}
          >
            {mutation.isPending
              ? text.pending
              : mutation.isError
                ? text.retry
                : text.action}
          </Button>

          <p className="text-text-muted text-center text-xs">{t('app.name')}</p>
        </div>
      </div>
    </div>
  )
}
