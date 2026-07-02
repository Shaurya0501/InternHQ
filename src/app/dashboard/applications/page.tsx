'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ClipboardList,
  Calendar,
  ExternalLink,
  Edit2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Plus,
  Loader2,
  Mail,
  FileText,
  CalendarRange,
  StickyNote,
  FileDown,
  FolderOpen,
  ArrowRight,
  Lock,
  PlusCircle,
  Info
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Application, ApplicationStatus } from '@/types/internship'

// Status styling mapping
const statusColors: Record<ApplicationStatus, { bg: string; text: string; border: string; indicator: string }> = {
  Saved: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/20',
    indicator: 'bg-slate-500'
  },
  Applied: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    indicator: 'bg-blue-500'
  },
  'Online Assessment': {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
    indicator: 'bg-purple-500'
  },
  Interview: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    indicator: 'bg-amber-500'
  },
  Offer: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    indicator: 'bg-emerald-500'
  },
  Rejected: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    indicator: 'bg-rose-500'
  },
  Withdrawn: {
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-400',
    border: 'border-zinc-500/20',
    indicator: 'bg-zinc-500'
  }
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  // Tab state per application card
  const [activeAppTabs, setActiveAppTabs] = useState<Record<string, 'overview' | 'timeline' | 'emails' | 'documents' | 'calendar' | 'notes'>>({})

  // Lists and integration states
  const [resumes, setResumes] = useState<any[]>([])
  const [isGoogleConnected, setIsGoogleConnected] = useState(false)

  // Update Status Modal States
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [activeApp, setActiveApp] = useState<Application | null>(null)
  const [newStatus, setNewStatus] = useState<ApplicationStatus>('Applied')
  const [statusNotes, setStatusNotes] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const supabase = createClient()

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch applications with joined relation schemas
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          internships (*),
          application_timeline (*),
          email_events (*),
          calendar_events (*)
        `)
        .eq('user_id', user.id)
        .order('applied_date', { ascending: false })

      if (error) throw error

      // Sort sub-timeline records chronologically (newest at bottom)
      const formatted = (data || []).map((app: any) => {
        if (app.application_timeline) {
          app.application_timeline = app.application_timeline.sort((a: any, b: any) => 
            new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
          )
        }
        return app
      })

      setApplications(formatted)

      // Fetch Resumes in the Vault
      const { data: resumeList } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', user.id)
      
      setResumes(resumeList || [])

      // Fetch Google connection status
      const { data: token } = await supabase
        .from('oauth_tokens')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      setIsGoogleConnected(!!token)
    } catch (err: any) {
      toast.error('Failed to query applications database: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [])

  const toggleExpand = (appId: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(appId)) {
      newExpanded.delete(appId)
    } else {
      newExpanded.add(appId)
    }
    setExpandedCards(newExpanded)
  }

  // Notes states per application
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({})
  const [isSavingNotes, setIsSavingNotes] = useState<Record<string, boolean>>({})

  // Calendar states
  const [eventAppId, setEventAppId] = useState<string | null>(null)
  const [calTitle, setCalTitle] = useState('')
  const [calType, setCalType] = useState<'Interview' | 'Assessment' | 'Offer Discussion' | 'Deadline Reminder'>('Interview')
  const [calDate, setCalDate] = useState('')
  const [calDesc, setCalDesc] = useState('')
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)

  // Email reader sub-expansion
  const [viewingEmailId, setViewingEmailId] = useState<string | null>(null)

  // Heuristic highlighting for emails
  const highlightImportantInfo = (text: string) => {
    if (!text) return ''
    const regex = /(https?:\/\/[^\s]+|zoom\.us|google\.meet|hackerrank|codesignal|tomorrow|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b|\b\d{1,2}:\d{2}\s*(?:am|pm)?\b)/gi

    const parts = text.split(regex)
    return parts.map((part, i) => {
      if (part.match(regex)) {
        if (part.startsWith('http') || part.includes('zoom') || part.includes('meet')) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 underline break-all font-semibold hover:text-blue-305 inline-flex items-center gap-0.5"
            >
              {part} <ExternalLink className="h-3 w-3 inline" />
            </a>
          )
        }
        return (
          <mark key={i} className="bg-yellow-500/20 text-yellow-300 px-1 py-0.5 rounded font-semibold border border-yellow-500/10">
            {part}
          </mark>
        )
      }
      return part
    })
  }

  // Export to ICS file helper
  const handleExportICS = (app: Application) => {
    const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const deadlineDateStr = app.internships?.application_deadline || new Date().toISOString()
    const dtStart = new Date(deadlineDateStr).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const dtEnd = new Date(new Date(deadlineDateStr).getTime() + 60*60*1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const uid = `${Date.now()}@internhq.com`
    
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//InternHQ//Career Assistant//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:Application Deadline: ${app.internships?.company_name} (${app.internships?.role})`,
      `DESCRIPTION:Application deadline reminder for ${app.internships?.role} role.`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
      'END:VCALENDAR'
    ]

    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${app.internships?.company_name.replace(/\s+/g, '_')}_deadline.ics`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('ICS calendar file downloaded.')
  }

  // Export specific event to ICS
  const handleExportEventICS = (event: any) => {
    const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const dtStart = new Date(event.start_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const dtEnd = new Date(event.end_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const uid = `${Date.now()}@internhq.com`
    
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//InternHQ//Career Assistant//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description || ''}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
      'END:VCALENDAR'
    ]

    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event.title.replace(/\s+/g, '_')}.ics`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Calendar event exported.')
  }

  // Save manual application notes
  const handleSaveNotes = async (appId: string) => {
    const notesText = editingNotes[appId] ?? ''
    setIsSavingNotes(prev => ({ ...prev, [appId]: true }))
    try {
      const { error } = await supabase
        .from('applications')
        .update({ notes: notesText })
        .eq('id', appId)

      if (error) throw error
      toast.success('Application notes updated.')
      fetchApplications()
    } catch (err: any) {
      toast.error('Failed to update notes: ' + err.message)
    } finally {
      setIsSavingNotes(prev => ({ ...prev, [appId]: false }))
    }
  }

  // Link resume to application
  const handleLinkResume = async (appId: string, resumeId: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ resume_id: resumeId || null })
        .eq('id', appId)

      if (error) throw error
      toast.success('Linked resume selection updated.')
      fetchApplications()
    } catch (err: any) {
      toast.error('Failed to link resume: ' + err.message)
    }
  }

  // Schedule a calendar event (securely via server-side calendar API route)
  const handleCreateCalendarEvent = async (appId: string) => {
    if (!calTitle || !calDate) {
      toast.error('Event title and date are required.')
      return
    }
    setIsCreatingEvent(true)
    try {
      const start = new Date(calDate).toISOString()
      const end = new Date(new Date(calDate).getTime() + 60 * 60 * 1000).toISOString() // 1 hour duration

      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: appId,
          title: calTitle,
          description: calDesc,
          start_time: start,
          end_time: end,
          event_type: calType
        })
      })

      if (res.ok) {
        toast.success('Calendar event scheduled successfully!')
        setCalTitle('')
        setCalDesc('')
        setCalDate('')
        setEventAppId(null)
        fetchApplications()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to schedule event.')
      }
    } catch (err: any) {
      toast.error('Error scheduling event: ' + err.message)
    } finally {
      setIsCreatingEvent(false)
    }
  }

  const handleUpdateStatusClick = (app: Application) => {
    setActiveApp(app)
    setNewStatus(app.status)
    setStatusNotes('')
    setShowStatusModal(true)
  }

  const handleConfirmStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeApp) return
    setIsUpdating(true)

    try {
      // Update in applications table
      // The database triggers will automatically insert a timeline event
      const { error } = await supabase
        .from('applications')
        .update({
          status: newStatus,
          notes: statusNotes || `Status manually transitioned to ${newStatus}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeApp.id)

      if (error) throw error

      toast.success(`Application updated to ${newStatus}`)
      
      // Reload applications list to reflect DB changes
      await fetchApplications()
      
      // Expand the updated card to show the new timeline event
      const newExpanded = new Set(expandedCards)
      newExpanded.add(activeApp.id)
      setExpandedCards(newExpanded)

      setShowStatusModal(false)
      setActiveApp(null)
    } catch (err: any) {
      toast.error('Failed to record status change: ' + err.message)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-blue-500" /> Application tracker
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Command center mapping your active internship processes.
          </p>
        </div>

        {/* Analytics Counter */}
        <div className="flex gap-4">
          <div className="px-4 py-2 rounded-lg bg-slate-900/50 border border-white/5 backdrop-blur-md">
            <p className="text-[10px] font-bold text-slate-500 uppercase font-mono">Applications</p>
            <p className="text-lg font-extrabold text-blue-400 font-mono">{applications.length}</p>
          </div>
          <div className="px-4 py-2 rounded-lg bg-slate-900/50 border border-white/5 backdrop-blur-md">
            <p className="text-[10px] font-bold text-slate-500 uppercase font-mono">Active Stages</p>
            <p className="text-lg font-extrabold text-purple-400 font-mono">
              {applications.filter(a => ['Online Assessment', 'Interview'].includes(a.status)).length}
            </p>
          </div>
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <Card key={i} className="bg-slate-900/40 border-white/5 p-6 space-y-4 backdrop-blur-md">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-1/3 bg-slate-800" />
                <Skeleton className="h-6 w-20 bg-slate-800" />
              </div>
              <Skeleton className="h-10 w-full bg-slate-800" />
            </Card>
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/20 border border-white/5 rounded-xl backdrop-blur-sm space-y-3">
          <div className="h-10 w-10 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto text-slate-500">
            <ClipboardList className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-slate-200">No active applications</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Discover internships and click Apply to log and monitor your pipeline stages.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const job = app.internships
            if (!job) return null

            const isExpanded = expandedCards.has(app.id)
            const style = statusColors[app.status] || statusColors.Applied
            const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
              job.company_name
            )}&backgroundColor=0f172a,1e293b,334155`

            return (
              <motion.div
                key={app.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden"
              >
                <Card className="bg-slate-900/40 border-white/5 hover:border-white/10 transition-all duration-300 backdrop-blur-md">
                  <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Company info */}
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg overflow-hidden border border-white/15 bg-slate-900 flex-shrink-0">
                        <img
                          src={job.company_logo || defaultAvatar}
                          alt={job.company_name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = defaultAvatar
                          }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-sm text-white">
                            {job.role}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-mono">
                            • {job.company_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1 font-mono">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Applied {new Date(app.applied_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-3 border-t border-white/5 md:border-none pt-3 md:pt-0">
                      {/* Current Status Badge */}
                      <Badge className={`${style.bg} ${style.text} ${style.border} text-[10px] font-mono py-1 px-3 border flex items-center gap-1.5`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${style.indicator}`} />
                        {app.status}
                      </Badge>

                      {/* Dropdown status update */}
                      <Button
                        onClick={() => handleUpdateStatusClick(app)}
                        variant="outline"
                        size="sm"
                        className="border-white/10 hover:bg-white/5 text-[11px] text-slate-300 gap-1.5"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Update Status
                      </Button>

                      {/* Expand Details Trigger */}
                      <button
                        onClick={() => toggleExpand(app.id)}
                        className="p-1.5 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/5 text-slate-500 hover:text-white transition-all ml-1"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>                  {/* Expanded Timeline details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 pt-2 border-t border-white/5 bg-slate-950/20 space-y-6">
                          
                          {/* Inner Tabs List */}
                          <div className="flex border-b border-white/5 gap-1.5 text-[11px] font-semibold pt-2 overflow-x-auto scrollbar-none">
                            {[
                              { id: 'overview', label: 'Overview', icon: <Info className="h-3.5 w-3.5" /> },
                              { id: 'timeline', label: 'Timeline', icon: <Clock className="h-3.5 w-3.5" /> },
                              { id: 'emails', label: 'Emails', icon: <Mail className="h-3.5 w-3.5" /> },
                              { id: 'documents', label: 'Documents', icon: <FileText className="h-3.5 w-3.5" /> },
                              { id: 'calendar', label: 'Calendar', icon: <CalendarRange className="h-3.5 w-3.5" /> },
                              { id: 'notes', label: 'Notes', icon: <StickyNote className="h-3.5 w-3.5" /> }
                            ].map(tab => {
                              const currentTab = activeAppTabs[app.id] || 'overview'
                              const isActive = currentTab === tab.id
                              return (
                                <button
                                  key={tab.id}
                                  onClick={() => {
                                    setActiveAppTabs(prev => ({ ...prev, [app.id]: tab.id as any }))
                                    if (tab.id === 'notes' && editingNotes[app.id] === undefined) {
                                      setEditingNotes(prev => ({ ...prev, [app.id]: app.notes || '' }))
                                    }
                                  }}
                                  className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                                    isActive
                                      ? 'border-blue-500 text-white'
                                      : 'border-transparent text-slate-500 hover:text-slate-350'
                                  }`}
                                >
                                  {tab.icon}
                                  {tab.label}
                                </button>
                              )
                            })}
                          </div>

                          {/* Render Panel based on currentTab */}
                          {(() => {
                            const currentTab = activeAppTabs[app.id] || 'overview'

                            if (currentTab === 'overview') {
                              return (
                                <div className="space-y-4 animate-fade-in text-xs">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/40 p-4 border border-white/5 rounded-lg">
                                    <div>
                                      <p className="text-[10px] font-bold text-slate-500 uppercase">Provider Source</p>
                                      <p className="text-slate-300 font-mono mt-1">{job.source}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-bold text-slate-500 uppercase">Stipend Estimate</p>
                                      <p className="text-slate-300 font-mono mt-1">{job.stipend || 'Not Specified'}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-bold text-slate-500 uppercase">Application Deadline</p>
                                      <p className="text-slate-300 font-mono mt-1">
                                        {job.application_deadline 
                                          ? new Date(job.application_deadline).toLocaleDateString()
                                          : 'Not Specified'}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex justify-between items-center bg-slate-900/10 p-3 rounded-lg border border-white/5">
                                    <div className="space-y-0.5">
                                      <p className="text-xs font-bold text-slate-300">Local Calendar Integration</p>
                                      <p className="text-[10px] text-slate-500">Download .ics file to export deadline to Outlook/Calendar.</p>
                                    </div>
                                    <Button
                                      onClick={() => handleExportICS(app)}
                                      variant="outline"
                                      className="border-white/10 hover:bg-white/5 text-[11px] text-slate-300 flex items-center gap-1.5"
                                    >
                                      <FileDown className="h-3.5 w-3.5" />
                                      Export Deadline
                                    </Button>
                                  </div>
                                </div>
                              )
                            }

                            if (currentTab === 'timeline') {
                              // Milestone Mapping
                              const statuses: ApplicationStatus[] = ['Applied', 'Online Assessment', 'Interview', 'Offer']
                              const currentIdx = statuses.indexOf(app.status)
                              const isRejected = app.status === 'Rejected'

                              return (
                                <div className="space-y-6 animate-fade-in text-xs">
                                  {/* Horizontal Step Tracker */}
                                  <div className="bg-slate-950/30 p-4 border border-white/5 rounded-xl space-y-4">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Milestone Progress Map</p>
                                    
                                    <div className="relative flex justify-between items-center w-full max-w-lg mx-auto py-4">
                                      {/* Horizontal track line */}
                                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
                                      <div 
                                        className="absolute top-1/2 left-0 h-0.5 bg-blue-500 -translate-y-1/2 z-0 transition-all duration-500" 
                                        style={{ width: `${currentIdx >= 0 ? (currentIdx / 3) * 100 : 0}%` }}
                                      />

                                      {statuses.map((step, idx) => {
                                        const isCompleted = currentIdx >= idx
                                        const isActive = app.status === step
                                        
                                        return (
                                          <div key={step} className="relative z-10 flex flex-col items-center gap-2">
                                            <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                              isActive 
                                                ? 'bg-blue-600 border-blue-500 text-white scale-110 shadow-lg shadow-blue-500/20'
                                                : isCompleted 
                                                ? 'bg-slate-900 border-blue-500 text-blue-400'
                                                : 'bg-slate-950 border-slate-800 text-slate-600'
                                            }`}>
                                              <span className="text-[10px] font-bold">{idx + 1}</span>
                                            </div>
                                            <span className={`text-[9px] font-mono font-bold ${
                                              isActive ? 'text-white' : isCompleted ? 'text-blue-400' : 'text-slate-600'
                                            }`}>
                                              {step === 'Online Assessment' ? 'OA' : step}
                                            </span>
                                          </div>
                                        )
                                      })}
                                    </div>

                                    {isRejected && (
                                      <div className="p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/10 text-center text-[10px] text-rose-400 font-bold font-mono">
                                        ❌ Process Concluded: Application Rejected
                                      </div>
                                    )}
                                  </div>

                                  {/* Vertical Timeline Records */}
                                  <div className="space-y-4">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Detailed Event Logs</p>

                                    {app.application_timeline && app.application_timeline.length > 0 ? (
                                      <div className="relative pl-6 border-l border-white/5 space-y-6 ml-2 pt-2">
                                        {app.application_timeline.map((evt) => {
                                          // Classify style based on update_type
                                          const type = evt.update_type || 'manual'
                                          const isEmail = type === 'email'
                                          const isSystem = type === 'system'
                                          
                                          const badgeColor = isEmail 
                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            : isSystem
                                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'

                                          const dotColor = isEmail 
                                            ? 'bg-amber-500'
                                            : isSystem
                                            ? 'bg-purple-500'
                                            : 'bg-blue-500'

                                          const evtStyle = statusColors[evt.status] || statusColors.Applied

                                          return (
                                            <div key={evt.id} className="relative">
                                              {/* Event dot */}
                                              <span className={`absolute -left-[30px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950 ${dotColor} shadow-md`} />

                                              <div className="space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <Badge className={`${evtStyle.bg} ${evtStyle.text} ${evtStyle.border} text-[9px] font-mono px-2 border py-0 scale-90 origin-left`}>
                                                    {evt.status}
                                                  </Badge>
                                                  <Badge className={`${badgeColor} border text-[8px] font-mono py-0 px-1.5 uppercase scale-90`}>
                                                    {type} log
                                                  </Badge>
                                                  <span className="text-[9px] text-slate-650 font-mono">
                                                    {new Date(evt.event_date).toLocaleString()}
                                                  </span>
                                                </div>
                                                
                                                {evt.notes && (
                                                  <p className="text-xs text-slate-450 leading-relaxed font-sans pr-4">
                                                    {evt.notes}
                                                  </p>
                                                )}

                                                {/* Email attachment details */}
                                                {isEmail && evt.email_subject && (
                                                  <div className="bg-slate-950/40 p-2.5 border border-white/5 rounded-lg max-w-md space-y-1 mt-1 text-[10px]">
                                                    <p className="font-bold text-slate-350 flex items-center gap-1.5">
                                                      <Mail className="h-3 w-3 text-amber-400" />
                                                      Subject: {evt.email_subject}
                                                    </p>
                                                    <p className="text-slate-500 line-clamp-1 italic font-medium">
                                                      "{evt.email_preview}"
                                                    </p>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-slate-500 italic">No timeline history recorded yet.</p>
                                    )}
                                  </div>
                                </div>
                              )
                            }

                            if (currentTab === 'emails') {
                              const emails = app.email_events || []
                              return (
                                <div className="space-y-4 animate-fade-in text-xs">
                                  <div className="flex justify-between items-center">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Inbox Sync Logs ({emails.length})</p>
                                  </div>

                                  {emails.length === 0 ? (
                                    <p className="text-xs text-slate-500 italic py-4 text-center">No internship-related emails synced yet.</p>
                                  ) : (
                                    <div className="space-y-3.5">
                                      {emails.map((email: any) => {
                                        const isExpandedEmail = viewingEmailId === email.id
                                        return (
                                          <Card key={email.id} className="bg-slate-900/10 border-white/5 hover:border-white/10 transition-colors">
                                            <CardContent className="p-4 space-y-2">
                                              <div className="flex justify-between items-start gap-4">
                                                <div className="min-w-0">
                                                  <h5 className="font-extrabold text-slate-200 truncate">{email.subject}</h5>
                                                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                                                    From: {email.sender} • {new Date(email.date).toLocaleDateString()}
                                                  </p>
                                                </div>
                                                <Badge className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-mono uppercase">
                                                  {email.classification}
                                                </Badge>
                                              </div>
                                              
                                              {!isExpandedEmail ? (
                                                <div className="flex justify-between items-center gap-4">
                                                  <p className="text-slate-450 line-clamp-1 italic flex-1">"{email.preview}"</p>
                                                  <button
                                                    onClick={() => setViewingEmailId(email.id)}
                                                    className="text-blue-400 hover:text-blue-300 text-[10px] font-semibold flex items-center gap-0.5"
                                                  >
                                                    Read
                                                  </button>
                                                </div>
                                              ) : (
                                                <div className="space-y-3 pt-2.5 border-t border-white/5 animate-fade-in">
                                                  {/* Highlight text utility */}
                                                  <div className="bg-slate-950/60 p-3 rounded-lg border border-white/5 text-xs text-slate-400 whitespace-pre-wrap leading-relaxed font-sans max-h-60 overflow-y-auto">
                                                    {highlightImportantInfo(email.body)}
                                                  </div>
                                                  <div className="flex justify-between items-center">
                                                    <span className="text-[9px] text-yellow-400/80 font-medium font-mono">⚡ Date & Links auto-highlighted for convenience.</span>
                                                    <button
                                                      onClick={() => setViewingEmailId(null)}
                                                      className="text-slate-500 hover:text-slate-300 text-[10px] font-semibold"
                                                    >
                                                      Collapse
                                                    </button>
                                                  </div>
                                                </div>
                                              )}
                                            </CardContent>
                                          </Card>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )
                            }

                            if (currentTab === 'documents') {
                              return (
                                <div className="space-y-4 animate-fade-in text-xs">
                                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Document Vault Mapping</p>
                                  
                                  {/* Link resume dropdown */}
                                  <div className="bg-slate-950/40 p-4 border border-white/5 rounded-xl space-y-3">
                                    <div className="space-y-1">
                                      <p className="text-xs font-bold text-slate-355 flex items-center gap-1.5">
                                        <FileText className="h-4 w-4 text-blue-400" />
                                        Primary Assigned Resume
                                      </p>
                                      <p className="text-[10px] text-slate-500">Link a specific resume version to target this application score.</p>
                                    </div>

                                    {resumes.length === 0 ? (
                                      <p className="text-[10px] text-slate-500 italic">No resumes uploaded in Vault. Navigate to Vault to upload.</p>
                                    ) : (
                                      <select
                                        value={app.resume_id || ''}
                                        onChange={(e) => handleLinkResume(app.id, e.target.value)}
                                        className="w-full bg-slate-900 border border-white/5 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none"
                                      >
                                        <option value="">-- No linked resume --</option>
                                        {resumes.map((res) => (
                                          <option key={res.id} value={res.id}>
                                            {res.filename} (v{res.version})
                                          </option>
                                        ))}
                                      </select>
                                    )}

                                    {app.resume_id && (
                                      (() => {
                                        const activeResume = resumes.find(r => r.id === app.resume_id)
                                        if (!activeResume) return null
                                        return (
                                          <div className="text-[10px] text-slate-450 border-t border-white/[0.03] pt-2.5 mt-1 space-y-1 font-mono">
                                            <p>Uploaded: {new Date(activeResume.upload_date).toLocaleDateString()}</p>
                                            <p>Skills indexed: {activeResume.primary_skills?.join(', ') || 'None'}</p>
                                          </div>
                                        )
                                      })()
                                    )}
                                  </div>
                                </div>
                              )
                            }

                            if (currentTab === 'calendar') {
                              const events = app.calendar_events || []
                              const showForm = eventAppId === app.id

                              return (
                                <div className="space-y-4 animate-fade-in text-xs">
                                  <div className="flex justify-between items-center">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Scheduled Milestones ({events.length})</p>
                                    
                                    {!showForm && (
                                      <Button
                                        onClick={() => {
                                          setEventAppId(app.id)
                                          setCalTitle(`${app.internships?.company_name} Interview`)
                                          setCalType('Interview')
                                          setCalDate('')
                                          setCalDesc('')
                                        }}
                                        className="bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600/20 text-[10px] px-3.5 py-1.5 flex items-center gap-1"
                                      >
                                        <PlusCircle className="h-3.5 w-3.5" />
                                        Schedule Event
                                      </Button>
                                    )}
                                  </div>

                                  {/* Create Event form */}
                                  {showForm && (
                                    <Card className="bg-slate-950/60 border border-blue-500/10 p-4 animate-fade-in">
                                      <div className="space-y-3.5">
                                        <div className="flex justify-between items-center">
                                          <h6 className="font-extrabold text-white text-xs">Schedule Assistant Event</h6>
                                          <button 
                                            onClick={() => setEventAppId(null)} 
                                            className="text-slate-500 hover:text-white text-[10px] font-semibold"
                                          >
                                            Cancel
                                          </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                          <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Event Title</label>
                                            <Input
                                              value={calTitle}
                                              onChange={(e) => setCalTitle(e.target.value)}
                                              placeholder="e.g. Technical Interview"
                                              className="bg-slate-900 border-white/10 text-white h-8 text-xs"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Event Category</label>
                                            <select
                                              value={calType}
                                              onChange={(e: any) => setCalType(e.target.value)}
                                              className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none h-8.5"
                                            >
                                              <option value="Interview">Interview</option>
                                              <option value="Assessment">Assessment</option>
                                              <option value="Offer Discussion">Offer Discussion</option>
                                              <option value="Deadline Reminder">Deadline Reminder</option>
                                            </select>
                                          </div>
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[9px] font-bold text-slate-500 uppercase">Date & Time (UTC)</label>
                                          <Input
                                            type="datetime-local"
                                            value={calDate}
                                            onChange={(e) => setCalDate(e.target.value)}
                                            className="bg-slate-900 border-white/10 text-white h-8 text-xs font-mono"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[9px] font-bold text-slate-500 uppercase">Notes / Description</label>
                                          <textarea
                                            value={calDesc}
                                            onChange={(e) => setCalDesc(e.target.value)}
                                            placeholder="Zoom link details, login credentials, etc."
                                            className="w-full h-16 bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-slate-600 focus:outline-none resize-none"
                                          />
                                        </div>

                                        <div className="flex justify-between items-center pt-2">
                                          <span className="text-[8px] text-slate-600 font-mono">
                                            {isGoogleConnected ? '⚡ Auto-syncs to Google Calendar.' : '📁 Saves locally (.ics export available).'}
                                          </span>
                                          <Button
                                            onClick={() => handleCreateCalendarEvent(app.id)}
                                            disabled={isCreatingEvent}
                                            className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] px-4 py-1.5 h-8 flex items-center gap-1"
                                          >
                                            {isCreatingEvent && <Loader2 className="h-3 w-3 animate-spin" />}
                                            Add Event
                                          </Button>
                                        </div>
                                      </div>
                                    </Card>
                                  )}

                                  {events.length === 0 ? (
                                    <p className="text-xs text-slate-500 italic py-4 text-center">No events scheduled.</p>
                                  ) : (
                                    <div className="space-y-3">
                                      {events.map((evt: any) => (
                                        <Card key={evt.id} className="bg-slate-900/10 border-white/5">
                                          <CardContent className="p-4 flex justify-between items-center gap-4">
                                            <div className="space-y-1">
                                              <div className="flex items-center gap-2">
                                                <Badge className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-mono uppercase">
                                                  {evt.event_type}
                                                </Badge>
                                                <h6 className="font-extrabold text-slate-200">{evt.title}</h6>
                                              </div>
                                              <p className="text-[10px] text-slate-450 font-mono">
                                                {new Date(evt.start_time).toLocaleString()}
                                              </p>
                                              {evt.description && (
                                                <p className="text-[10px] text-slate-500 italic">"{evt.description}"</p>
                                              )}
                                            </div>

                                            {/* Google sync indicator or manual ICS export button */}
                                            {evt.google_event_id ? (
                                              <Badge className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-mono uppercase flex items-center gap-1">
                                                <CheckCircle className="h-3 w-3" /> Synced
                                              </Badge>
                                            ) : (
                                              <Button
                                                onClick={() => handleExportEventICS(evt)}
                                                variant="outline"
                                                className="border-white/5 hover:bg-white/5 text-[9px] text-slate-400 h-7 px-2.5 flex items-center gap-1"
                                              >
                                                <FileDown className="h-3 w-3" />
                                                ICS Export
                                              </Button>
                                            )}
                                          </CardContent>
                                        </Card>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            }

                            if (currentTab === 'notes') {
                              const notesText = editingNotes[app.id] ?? ''
                              const isSaving = isSavingNotes[app.id] || false
                              
                              return (
                                <div className="space-y-4 animate-fade-in text-xs">
                                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Manual notepad (Protected from email overwrites)</p>
                                  
                                  <div className="space-y-3">
                                    <textarea
                                      value={notesText}
                                      onChange={(e) => setEditingNotes(prev => ({ ...prev, [app.id]: e.target.value }))}
                                      placeholder="Save your custom details here, interview questions, contacts, or draft follow-up templates..."
                                      className="w-full h-32 bg-slate-900 border border-white/5 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 resize-none font-sans"
                                    />
                                    <div className="flex justify-end">
                                      <Button
                                        onClick={() => handleSaveNotes(app.id)}
                                        disabled={isSaving}
                                        className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[10px] px-5 py-2 flex items-center gap-1.5 h-8.5"
                                      >
                                        {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                                        Save Notepad Notes
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )
                            }

                            return null
                          })()}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Update Status Modal Dialog */}
      <Dialog open={showStatusModal} onOpenChange={(open) => {
        if (!open) {
          setShowStatusModal(false)
          setActiveApp(null)
        }
      }}>
        <DialogContent className="max-w-sm bg-slate-950 border border-white/10 p-6 text-slate-100 backdrop-blur-xl">
          <form onSubmit={handleConfirmStatusUpdate} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold text-white">Transition Status</DialogTitle>
              <DialogDescription className="text-slate-400 text-xs mt-1">
                Manually record progression for **{activeApp?.internships?.role}** at **{activeApp?.internships?.company_name}**.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-2">
              {/* Select Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">New Pipeline Stage</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ApplicationStatus)}
                  className="w-full bg-slate-900 border border-white/5 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="Saved">Saved</option>
                  <option value="Applied">Applied</option>
                  <option value="Online Assessment">Online Assessment</option>
                  <option value="Interview">Interview</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Withdrawn">Withdrawn</option>
                </select>
              </div>

              {/* Textarea notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Stage Action Notes</label>
                <textarea
                  placeholder="e.g., Invitation for coding interview received, deadline is next Tuesday. Or Interview completed with engineer. "
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="w-full h-24 bg-slate-900 border border-white/5 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 resize-none"
                />
              </div>
            </div>

            <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isUpdating}
                onClick={() => {
                  setShowStatusModal(false)
                  setActiveApp(null)
                }}
                className="border-white/10 hover:bg-white/5 text-slate-300 text-xs px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdating}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 flex items-center gap-1.5"
              >
                {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
                Log Transition
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
