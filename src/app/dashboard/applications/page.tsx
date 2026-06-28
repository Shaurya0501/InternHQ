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
  Loader2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          internships (*),
          application_timeline (*)
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
                  </div>

                  {/* Expanded Timeline details */}
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
                          {/* Details Metadata */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-slate-950/50 p-4 border border-white/5 rounded-lg">
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Provider Source</p>
                              <p className="text-slate-300 font-mono mt-1">{job.source}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Stipend Estimate</p>
                              <p className="text-slate-300 font-mono mt-1">{job.stipend || 'Not Specified'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Link URL</p>
                              <a
                                href={job.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-400 hover:underline inline-flex items-center gap-1 mt-1 font-mono"
                              >
                                View Posting <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>

                          {/* Timeline Section */}
                          <div className="space-y-4">
                            <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                              Application Timeline Progress
                            </h5>

                            {app.application_timeline && app.application_timeline.length > 0 ? (
                              <div className="relative pl-6 border-l border-white/5 space-y-6 ml-2 pt-2">
                                {app.application_timeline.map((evt, idx) => {
                                  const evtStyle = statusColors[evt.status] || statusColors.Applied
                                  return (
                                    <div key={evt.id} className="relative">
                                      {/* Event dot */}
                                      <span className={`absolute -left-[30px] top-1 h-3 w-3 rounded-full border-2 border-slate-950 ${evtStyle.indicator} shadow-md`} />

                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Badge className={`${evtStyle.bg} ${evtStyle.text} ${evtStyle.border} text-[9px] font-mono px-2 border py-0`}>
                                            {evt.status}
                                          </Badge>
                                          <span className="text-[9px] text-slate-600 font-mono">
                                            {new Date(evt.event_date).toLocaleString(undefined, {
                                              month: 'short',
                                              day: 'numeric',
                                              year: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </span>
                                        </div>
                                        {evt.notes && (
                                          <p className="text-xs text-slate-400 leading-relaxed font-sans pr-4">
                                            {evt.notes}
                                          </p>
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
