'use client'

import React, { useState } from 'react'
import { RefreshCw, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface DashboardSyncButtonProps {
  isGoogleConnected: boolean
}

export function DashboardSyncButton({ isGoogleConnected }: DashboardSyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const router = useRouter()

  const handleSync = async () => {
    if (!isGoogleConnected) {
      toast.error('Google account not connected. Please configure in settings.')
      return
    }

    setIsSyncing(true)
    const toastId = toast.loading('Syncing your career assistant...')
    try {
      const res = await fetch('/api/jobs/sync', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          toast.success(`Sync complete! Synced ${data.stats.emailsSynced} emails, updated ${data.stats.applicationsUpdated} applications.`, {
            id: toastId,
            duration: 4000
          })
          router.refresh()
        } else {
          toast.error(data.error || 'Sync failed.', { id: toastId })
        }
      } else {
        toast.error('Sync request failed.', { id: toastId })
      }
    } catch (err: any) {
      toast.error('Sync failed: ' + err.message, { id: toastId })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex items-center gap-3 bg-slate-900/40 p-4 border border-white/5 rounded-xl backdrop-blur-md justify-between w-full">
      <div className="flex items-center gap-2">
        {isGoogleConnected ? (
          <>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase font-mono font-bold text-slate-500">Assistant Status</p>
              <p className="text-xs font-semibold text-slate-200">Google Automation Connected</p>
            </div>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-slate-500 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase font-mono font-bold text-slate-500">Assistant Status</p>
              <p className="text-xs font-semibold text-slate-400">Google Integration Optional</p>
            </div>
          </>
        )}
      </div>

      {isGoogleConnected ? (
        <Button
          onClick={handleSync}
          disabled={isSyncing}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs px-4 py-1.5 h-8 flex items-center gap-1.5 shrink-0"
        >
          {isSyncing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      ) : (
        <Button
          onClick={() => router.push('/dashboard/profile?tab=assistant')}
          variant="outline"
          className="border-white/10 hover:bg-white/5 text-slate-350 text-xs px-4 py-1.5 h-8 shrink-0"
        >
          Configure Assistant
        </Button>
      )}
    </div>
  )
}
