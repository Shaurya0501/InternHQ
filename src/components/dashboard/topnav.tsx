'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Bell,
  Search,
  LogOut,
  Settings,
  LayoutDashboard,
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
    <header className="h-16 border-b border-white/20 bg-white/10 backdrop-blur-md px-6 flex items-center justify-between z-30 shrink-0 relative text-white">
      {/* Search Input trigger */}
      <div className="flex-1 max-w-md hidden md:block">
        <div
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          className="relative flex items-center cursor-pointer group"
        >
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/70 group-hover:text-white transition-colors" />
          <div className="w-full h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/25 pl-10 pr-4 flex items-center text-xs text-white/70 select-none transition-all duration-150">
            <span>Search console dashboard...</span>
            <span className="ml-auto inline-flex items-center gap-0.5 rounded border border-white/20 bg-white/15 px-1.5 font-mono text-[9px] font-medium text-white/95">
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
            className="p-2 rounded-lg bg-white/5 border border-white/15 hover:bg-white/10 text-white hover:text-white transition-all duration-150 relative cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white animate-ping" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white" />
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
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-900 border border-white/20 p-4 shadow-2xl backdrop-blur-xl z-50 text-white flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h4 className="font-bold text-xs">Alert Registry</h4>
                  {unreadCount > 0 ? (
                    <button onClick={markAllAsRead} className="text-[9px] text-white hover:underline cursor-pointer bg-transparent border-none p-0">
                      Mark all as read
                    </button>
                  ) : (
                    <span className="text-[9px] text-white/60 font-mono">0 unread</span>
                  )}
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto scrollbar-none">
                  {notifications.map((alert) => (
                    <div 
                      key={alert.id} 
                      onClick={() => !alert.read && markAsRead(alert.id)}
                      className={`text-[11px] hover:bg-white/10 p-2 rounded-lg transition-colors border border-transparent hover:border-white/10 cursor-pointer relative ${
                        !alert.read ? 'bg-white/10' : ''
                      }`}
                    >
                      <div className="flex justify-between font-semibold text-white">
                        <span>{alert.title}</span>
                        <span className="text-[8px] text-white/60 font-mono">
                          {new Date(alert.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-white/80 mt-1 leading-normal">{alert.body}</p>
                      {!alert.read && <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-white rounded-full" />}
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
              <button {...props} className="flex items-center gap-2 focus:outline-none cursor-pointer bg-transparent border-none p-0">
                <div className="h-8 w-8 rounded-full overflow-hidden border border-white/15 bg-white/5 hover:border-white/35 transition-all duration-150">
                  <img src={profile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                </div>
              </button>
            )}
          />
          <DropdownMenuContent className="w-56 bg-slate-900 border border-white/20 text-white backdrop-blur-xl rounded-xl p-1 shadow-2xl">
            <DropdownMenuLabel className="p-3">
              <p className="text-xs font-semibold truncate text-white">{profile.fullName}</p>
              <p className="text-[10px] font-mono text-white/60 truncate mt-0.5">{profile.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              render={(props) => (
                <Link
                  {...props}
                  href="/dashboard"
                  className="w-full flex items-center gap-2 p-2 text-xs hover:bg-white/10 focus:bg-white/10 cursor-pointer rounded-lg text-white/90 hover:text-white"
                >
                  <LayoutDashboard className="h-4 w-4 text-white/70" />
                  Console Dashboard
                </Link>
              )}
            />
            <DropdownMenuItem
              render={(props) => (
                <Link
                  {...props}
                  href="/dashboard/profile"
                  className="w-full flex items-center gap-2 p-2 text-xs hover:bg-white/10 focus:bg-white/10 cursor-pointer rounded-lg text-white/90 hover:text-white"
                >
                  <Settings className="h-4 w-4 text-white/70" />
                  Profile Settings
                </Link>
              )}
            />
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="hover:bg-rose-500/20 focus:bg-rose-500/20 text-rose-300 hover:text-rose-100 cursor-pointer flex items-center gap-2 p-2 text-xs rounded-lg"
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
