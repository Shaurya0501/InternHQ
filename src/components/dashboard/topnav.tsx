'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Bell,
  Search,
  LogOut,
  User,
  LayoutDashboard,
  Settings,
  Sparkles,
  Command
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface TopNavProps {
  profile: {
    fullName: string
    email: string
    avatarUrl: string
  }
}
export function TopNav({ profile }: TopNavProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out successfully')
    router.refresh()
    router.push('/')
  }

  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (!data || data.length === 0) {
        // Seed default alerts
        const defaults = [
          {
            user_id: user.id,
            title: 'Welcome to InternHQ Command',
            body: 'Verify your preferred roles and language stack in profile configurations.',
            type: 'resume_incomplete',
            read: false
          },
          {
            user_id: user.id,
            title: 'Vault Active',
            body: 'Upload your resumes to assign them during applications.',
            type: 'match',
            read: false
          }
        ]
        const { data: seeded } = await supabase
          .from('notifications')
          .insert(defaults)
          .select()
        data = seeded || []
      }

      setNotifications(data)
      setUnreadCount(data.filter((n: any) => !n.read).length)
    } catch (e) {
      console.error('Failed to load notifications:', e)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const markAsRead = async (id: string) => {
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', id)
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (e) {
      console.error(e)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('notifications').update({ read: true }).eq('user_id', user.id)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
      toast.success('All notifications marked as read')
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <header className="h-16 border-b border-white/5 bg-slate-950/40 backdrop-blur-md px-6 flex items-center justify-between z-30 shrink-0 relative">
      {/* Search Input trigger */}
      <div className="flex-1 max-w-md hidden md:block">
        <div
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          className="relative flex items-center cursor-pointer group"
        >
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 group-hover:text-slate-400 transition-colors" />
          <div className="w-full h-9 rounded-lg bg-slate-900/40 hover:bg-slate-900/80 border border-white/5 hover:border-white/10 pl-10 pr-4 flex items-center text-xs text-slate-500 select-none transition-all duration-150">
            <span>Search console dashboard...</span>
            <span className="ml-auto inline-flex items-center gap-0.5 rounded border border-white/10 bg-slate-950 px-1.5 font-mono text-[9px] font-medium text-slate-400">
              <Command className="h-2.5 w-2.5" />K
            </span>
          </div>
        </div>
      </div>
      <div className="flex-1 md:hidden" /> {/* Spacer for mobile */}

      {/* Control Tools */}
      <div className="flex items-center gap-4 relative">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg bg-slate-900/40 border border-white/5 hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-all duration-150 relative"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500" />
              </>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {showNotifications && (
            <>
              <div
                onClick={() => setShowNotifications(false)}
                className="fixed inset-0 z-40 bg-transparent"
              />
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-950 border border-white/10 p-4 shadow-2xl backdrop-blur-xl z-50 text-slate-100 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h4 className="font-bold text-xs">Alert Registry</h4>
                  {unreadCount > 0 ? (
                    <button onClick={markAllAsRead} className="text-[9px] text-blue-400 hover:underline">
                      Mark all as read
                    </button>
                  ) : (
                    <span className="text-[9px] text-slate-500 font-mono">0 unread</span>
                  )}
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto scrollbar-none">
                  {notifications.map((alert) => (
                    <div 
                      key={alert.id} 
                      onClick={() => !alert.read && markAsRead(alert.id)}
                      className={`text-[11px] hover:bg-white/2 p-2 rounded-lg transition-colors border border-transparent hover:border-white/5 cursor-pointer relative ${
                        !alert.read ? 'bg-blue-500/5' : ''
                      }`}
                    >
                      <div className="flex justify-between font-semibold text-slate-200">
                        <span>{alert.title}</span>
                        <span className="text-[8px] text-slate-500 font-mono">
                          {new Date(alert.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-slate-400 mt-1 leading-normal">{alert.body}</p>
                      {!alert.read && <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={(props) => (
              <button {...props} className="flex items-center gap-2 focus:outline-none cursor-pointer">
                <div className="h-8 w-8 rounded-full overflow-hidden border border-white/10 bg-slate-900 hover:border-white/30 transition-all duration-150">
                  <img src={profile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                </div>
              </button>
            )}
          />
          <DropdownMenuContent className="w-56 bg-slate-950 border border-white/10 text-slate-200 backdrop-blur-xl">
            <DropdownMenuLabel className="p-3">
              <p className="text-xs font-semibold truncate text-white">{profile.fullName}</p>
              <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{profile.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem
              render={(props) => (
                <Link
                  {...props}
                  href="/dashboard"
                  className="w-full flex items-center gap-2 p-2 text-xs hover:bg-white/5 focus:bg-white/5 cursor-pointer"
                >
                  <LayoutDashboard className="h-4 w-4 text-slate-400" />
                  Console Dashboard
                </Link>
              )}
            />
            <DropdownMenuItem
              render={(props) => (
                <Link
                  {...props}
                  href="/dashboard/profile"
                  className="w-full flex items-center gap-2 p-2 text-xs hover:bg-white/5 focus:bg-white/5 cursor-pointer"
                >
                  <Settings className="h-4 w-4 text-slate-400" />
                  Profile Settings
                </Link>
              )}
            />
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="hover:bg-rose-500/10 focus:bg-rose-500/10 text-rose-400 hover:text-rose-300 cursor-pointer flex items-center gap-2 p-2 text-xs"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
