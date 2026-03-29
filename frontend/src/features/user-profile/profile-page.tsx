import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/table-core'
import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { useAppStore } from '@/lib/store/app-store'
import { formatDateTime } from '@/lib/utils/format'
import type { AnalysisSession, AnalysisSessionSummary } from '@/types'

export function ProfilePage() {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const adapter = useApiAdapter()
  const locale = useAppStore((state) => state.locale)
  const clearSession = useAppStore((state) => state.clearSession)
  const isZh = i18n.language.startsWith('zh')

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: adapter.profile.get,
  })

  const sessionStatsQuery = useQuery({
    queryKey: ['analysis', 'profile-stats'],
    queryFn: () => adapter.analysis.list({ page: 1, pageSize: 200 }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => adapter.auth.deletePersonalData(),
    onSuccess: async () => {
      clearSession()
      queryClient.clear()
      await navigate('/login', { replace: true })
    },
  })

  const profile = profileQuery.data
  const sessionItems = sessionStatsQuery.data?.items ?? []
  const metricsSource: Array<AnalysisSession | AnalysisSessionSummary> =
    sessionItems.length > 0 ? sessionItems : (profile?.history ?? [])
  const conversationCount = sessionStatsQuery.data?.total ?? profile?.history.length ?? 0
  const thinkingRoundsCount = metricsSource.reduce((total, session) => {
    const followUpRoundsUsed =
      'followUpRoundsUsed' in session ? (session.followUpRoundsUsed ?? 0) : 0
    return total + Math.max(1, followUpRoundsUsed + 1)
  }, 0)

  const text = {
    eyebrow: isZh ? '账户' : 'Account',
    title: isZh ? '个人资料' : 'Profile',
    subtitle: isZh
      ? '查看当前浏览器账号信息与历史分析记录。'
      : 'View this browser account and its analysis history.',
    problem: isZh ? '问题' : 'Problem',
    mode: isZh ? '模式' : 'Mode',
    status: isZh ? '状态' : 'Status',
    updated: isZh ? '更新时间' : 'Updated',
    email: isZh ? '邮箱' : 'Email',
    timezone: isZh ? '时区' : 'Timezone',
    roles: isZh ? '角色' : 'Roles',
    lastActive: isZh ? '最近活跃' : 'Last active',
    statsTitle: isZh ? '分析概览' : 'Analysis Summary',
    statsDescription: isZh
      ? '基于当前浏览器下已保存的分析会话统计。'
      : 'A quick summary based on the saved analysis sessions in this browser.',
    conversations: isZh ? '已进行对话' : 'Conversations',
    thinkingRounds: isZh ? '思考轮次' : 'Thinking rounds',
    dangerTitle: isZh ? '危险操作' : 'Danger zone',
    dangerDescription: isZh
      ? '执行后会同时清除当前浏览器 cookie，并删除该 cookie 归属下的全部个人会话与相关数据。'
      : 'This clears the current browser cookie and permanently removes all personal sessions and related data tied to it.',
    clearData: isZh
      ? '清除 cookie 并删除个人数据'
      : 'Clear cookie and delete personal data',
    clearDataPending: isZh
      ? '正在清除 cookie 和数据...'
      : 'Clearing cookie and data...',
    clearDataConfirm: isZh
      ? '确认清除当前 cookie，并删除该身份下的个人资料、会话历史和相关数据吗？此操作不可撤销。'
      : 'Are you sure you want to clear the current cookie and delete the profile, session history, and related data tied to it? This cannot be undone.',
  }

  const historyColumns: ColumnDef<AnalysisSessionSummary>[] = [
    {
      header: text.problem,
      accessorKey: 'problemStatement',
    },
    {
      header: text.mode,
      accessorKey: 'mode',
    },
    {
      header: text.status,
      accessorKey: 'status',
    },
    {
      header: text.updated,
      accessorKey: 'updatedAt',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={text.eyebrow}
        title={text.title}
        description={text.subtitle}
      />

      {profile ? (
        <>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <Card className="space-y-4 p-6">
              <div
                className="size-20 rounded-full bg-cover bg-center bg-no-repeat"
                style={{
                  backgroundColor: 'var(--gold-primary)',
                  backgroundImage: 'var(--gradient-gold)',
                }}
              />
              <div>
                <h2 className="text-text-primary text-2xl font-semibold">
                  {profile.name}
                </h2>
                <p className="text-text-secondary text-sm">{profile.title}</p>
              </div>
              <p className="text-text-secondary text-sm leading-6">
                {profile.bio}
              </p>
              <div className="text-text-secondary grid gap-2 text-sm">
                <p>
                  {text.email}: {profile.email}
                </p>
                <p>
                  {text.timezone}: {profile.timezone}
                </p>
                <p>
                  {text.roles}: {profile.roles.join(', ')}
                </p>
                <p>
                  {text.lastActive}: {formatDateTime(profile.lastActiveAt, locale)}
                </p>
              </div>
            </Card>

            <Card className="flex flex-col justify-between gap-5 p-6">
              <div className="space-y-2">
                <p className="text-gold-primary text-xs font-semibold tracking-[0.18em] uppercase">
                  {text.statsTitle}
                </p>
                <p className="text-text-secondary text-sm leading-6">
                  {text.statsDescription}
                </p>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[rgba(212,175,55,0.08)] p-4">
                  <p className="text-text-secondary text-xs">{text.conversations}</p>
                  <p className="text-text-primary mt-2 text-3xl font-semibold">
                    {conversationCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[rgba(212,175,55,0.08)] p-4">
                  <p className="text-text-secondary text-xs">{text.thinkingRounds}</p>
                  <p className="text-text-primary mt-2 text-3xl font-semibold">
                    {thinkingRoundsCount}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="space-y-4 border-[rgba(197,109,99,0.35)] p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full border border-[rgba(197,109,99,0.35)] bg-[rgba(197,109,99,0.12)] p-3 text-[#f7d4cf]">
                <TriangleAlert className="size-5" />
              </div>
              <div className="space-y-2">
                <h2 className="text-text-primary text-lg font-semibold">
                  {text.dangerTitle}
                </h2>
                <p className="text-text-secondary text-sm leading-7">
                  {text.dangerDescription}
                </p>
              </div>
            </div>

            {deleteMutation.isError ? (
              <p className="rounded-2xl border border-[rgba(197,109,99,0.4)] bg-[rgba(197,109,99,0.12)] px-4 py-3 text-sm text-[#f7d4cf]">
                {(deleteMutation.error as Error).message}
              </p>
            ) : null}

            <div className="flex justify-end">
              <Button
                variant="danger"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (!window.confirm(text.clearDataConfirm)) {
                    return
                  }

                  void deleteMutation.mutateAsync()
                }}
              >
                {deleteMutation.isPending
                  ? text.clearDataPending
                  : text.clearData}
              </Button>
            </div>
          </Card>

          <DataTable
            data={profile.history.map((item) => ({
              ...item,
              updatedAt: formatDateTime(item.updatedAt, locale),
            }))}
            columns={historyColumns}
          />
        </>
      ) : null}
    </div>
  )
}
