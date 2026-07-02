'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Bell,
  CheckCheck,
  Trash2,
  Calendar,
  Sparkles,
  ClipboardList,
  AlertTriangle,
  Mail,
  Loader2,
  CheckCircle2,
  Filter
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export type NotificationType =
  | 'match'
  | 'company_post'
  | 'deadline'
  | 'resume_incomplete'
  | 'interview_tomorrow'
  | 'assessment_tomorrow'
  | 'offer_received'
  | 'application_updated'
  | 'deadline_tomorrow'

interface NotificationItem {
  id: string
  user_id: string
  title: string
  body: string
  type: NotificationType
  read: boolean
  created_at: string
}

export default function NotificationsCenterPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const supabase = createClient()

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (err: any) {
      toast.error('Failed to query notifications: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const handleMarkAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)

      if (error) throw error
      
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      )
    } catch (err: any) {
      toast.error('Failed to update status: ' + err.message)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) throw error

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      toast.success('All notifications marked as read')
    } catch (err: any) {
      toast.error('Failed to mark all as read: ' + err.message)
    }
  }

  const handleDeleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)

      if (error) throw error

      setNotifications(prev => prev.filter(n => n.id !== id))
      toast.success('Notification removed')
    } catch (err: any) {
      toast.error('Failed to remove notification: ' + err.message)
    }
  }

  // Filter logic
  const filteredNotifications = notifications.filter(n => {
    if (filterType === 'all') return true
    if (filterType === 'unread') return !n.read
    if (filterType === 'interviews') return n.type === 'interview_tomorrow'
    if (filterType === 'assessments') return n.type === 'assessment_tomorrow'
    if (filterType === 'deadlines') return ['deadline', 'deadline_tomorrow'].includes(n.type)
    if (filterType === 'offers') return n.type === 'offer_received'
    return true
  })

  const getIconForType = (type: NotificationType) => {
    switch (type) {
      case 'interview_tomorrow':
        return <Calendar className="h-4.5 w-4.5 text-blue-400" />
      case 'assessment_tomorrow':
        return <ClipboardList className="h-4.5 w-4.5 text-purple-400" />
      case 'offer_received':
        return <Sparkles className="h-4.5 w-4.5 text-emerald-400" />
      case 'deadline_tomorrow':
      case 'deadline':
        return <AlertTriangle className="h-4.5 w-4.5 text-rose-400" />
      case 'application_updated':
        return <CheckCircle2 className="h-4.5 w-4.5 text-blue-400" />
      case 'match':
        return <Sparkles className="h-4.5 w-4.5 text-amber-400" />
      default:
        return <Bell className="h-4.5 w-4.5 text-slate-400" />
    }
  }

  const getBadgeStyle = (type: NotificationType) => {
    switch (type) {
      case 'interview_tomorrow':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'assessment_tomorrow':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'offer_received':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'deadline_tomorrow':
      case 'deadline':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    }
  }

  const formatTypeLabel = (type: NotificationType) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-500" /> Notification Registry
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Realtime alerts regarding your internship processes, interview invitations, and system diagnostics.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllAsRead}
            variant="outline"
            className="border-white/10 hover:bg-white/5 text-slate-300 text-xs px-4 flex items-center gap-1.5"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Filter and Content Controls */}
      <div className="flex flex-wrap gap-2.5 items-center border-b border-white/5 pb-4">
        <Filter className="h-3.5 w-3.5 text-slate-500 mr-1.5" />
        {[
          { key: 'all', label: 'All Alerts' },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'interviews', label: 'Interviews' },
          { key: 'assessments', label: 'Assessments' },
          { key: 'deadlines', label: 'Deadlines' },
          { key: 'offers', label: 'Offers' }
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setFilterType(item.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              filterType === item.key
                ? 'bg-blue-600/10 border-blue-500/30 text-white'
                : 'bg-transparent border-transparent text-slate-500 hover:text-slate-350 hover:bg-white/3'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[250px] gap-3">
          <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
          <span className="text-xs text-slate-500 font-mono">Querying alert register...</span>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/10 border border-white/5 rounded-xl backdrop-blur-sm space-y-3">
          <div className="h-10 w-10 bg-slate-800/40 rounded-full flex items-center justify-center mx-auto text-slate-500">
            <Bell className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-slate-300">No alerts found</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            You are fully caught up! Filter criteria does not match any current alerts.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {filteredNotifications.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <Card 
                  onClick={() => !item.read && handleMarkAsRead(item.id)}
                  className={`bg-slate-900/20 border-white/5 hover:border-white/10 transition-all duration-200 cursor-pointer backdrop-blur-md relative group ${
                    !item.read ? 'border-l-2 border-l-blue-500 bg-blue-500/[0.02]' : ''
                  }`}
                >
                  <CardContent className="p-4 flex gap-4 items-start">
                    {/* Icon container */}
                    <div className="h-8.5 w-8.5 rounded-lg bg-slate-950 border border-white/5 flex items-center justify-center shrink-0 mt-0.5 shadow-md">
                      {getIconForType(item.type)}
                    </div>

                    {/* Content details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-sm text-slate-200 truncate leading-snug">
                          {item.title}
                        </h4>
                        <Badge className={`${getBadgeStyle(item.type)} border text-[8px] font-mono py-0 px-2 uppercase scale-90 origin-left`}>
                          {formatTypeLabel(item.type)}
                        </Badge>
                        {!item.read && (
                          <span className="h-2 w-2 rounded-full bg-blue-500 inline-block animate-pulse shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-medium">
                        {item.body}
                      </p>
                      <p className="text-[9px] text-slate-650 font-mono mt-1 pt-1 border-t border-white/[0.02]">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteNotification(item.id)
                        }}
                        variant="ghost"
                        size="icon-sm"
                        className="h-7 w-7 text-slate-600 hover:text-rose-450 hover:bg-rose-500/5 rounded-lg"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
