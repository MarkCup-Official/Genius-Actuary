import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'

import { Skeleton } from '@/components/feedback/skeleton'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { useAppStore } from '@/lib/store/app-store'

export function RequireAuth() {
  const adapter = useApiAdapter()
  const accessToken = useAppStore((state) => state.accessToken)
  const currentUser = useAppStore((state) => state.currentUser)
  const setAuthSession = useAppStore((state) => state.setAuthSession)
  const refreshToken = useAppStore((state) => state.refreshToken)

  const meQuery = useQuery({
    queryKey: ['auth', 'me', accessToken],
    queryFn: adapter.auth.me,
    enabled: Boolean(
      accessToken && (!currentUser || currentUser.id === 'backend-anonymous'),
    ),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (meQuery.data && accessToken && refreshToken) {
      setAuthSession({
        accessToken,
        refreshToken,
        currentUser: meQuery.data,
      })
    }
  }, [accessToken, meQuery.data, refreshToken, setAuthSession])

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  if (meQuery.isLoading && !currentUser) {
    return (
      <div className="bg-app-bg flex min-h-screen items-center justify-center p-8">
        <Skeleton className="h-28 w-72 rounded-[24px]" />
      </div>
    )
  }

  return <Outlet />
}
