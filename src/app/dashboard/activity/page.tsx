'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Activity,
  Briefcase,
  FileCode,
  FileText,
  Calendar,
  Award,
  AlertOctagon,
  Clock,
  Loader2,
  ExternalLink
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface ActivityItem {
  id: string
  type: 'application' | 'resume' | 'document'
  title: string
  description: string
  timestamp: string
  meta?: any
}

export default function ActivityCenterPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchActivities = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Fetch Timeline Events
      const { data: timelineData, error: timelineErr } = await supabase
        .from('application_timeline')
        .select(`
          id,
          status,
          notes,
          event_date,
          update_type,
          applications (
            id,
            internships (
              company_name,
              role
            )
          )
        `)
        .order('event_date', { ascending: false })

      if (timelineErr) throw timelineErr

      // 2. Fetch Resumes
      const { data: resumesData } = await supabase
        .from('resumes')
        .select('id, filename, upload_date')
        .eq('user_id', user.id)

      // 3. Fetch Documents
      const { data: documentsData } = await supabase
        .from('documents')
        .select('id, filename, type, upload_date')
        .eq('user_id', user.id)

      // 4. Transform and Merge into unified list
      const merged: ActivityItem[] = []

      // Add timeline activities
      if (timelineData) {
        timelineData.forEach((evt: any) => {
          if (!evt.applications || !evt.applications.internships) return

          const app = evt.applications
          const job = app.internships
          let title = ''
          let description = evt.notes || ''

          switch (evt.status) {
            case 'Saved':
              title = `Saved internship role`
              description = `Bookmarked ${job.role} at ${job.company_name}`
              break
            case 'Applied':
              title = `Applied to ${job.company_name}`
              description = `Initiated application process for ${job.role}`
              break
            case 'Online Assessment':
              title = `Assessment stage reached`
              description = `Online Assessment logged for ${job.role} at ${job.company_name}`
              break
            case 'Interview':
              title = `Interview Scheduled`
              description = `Interview progression set for ${job.role} at ${job.company_name}`
              break
            case 'Offer':
              title = `Offer Received!`
              description = `Congratulations! Logged a job offer for ${job.role} at ${job.company_name}`
              break
            case 'Rejected':
              title = `Rejected by ${job.company_name}`
              description = `Application closed for ${job.role}`
              break
            case 'Withdrawn':
              title = `Withdrawn from ${job.company_name}`
              description = `Canceled application tracker for ${job.role}`
              break
            default:
              title = `Application status update`
              description = `Status updated to ${evt.status} for ${job.role} at ${job.company_name}`
          }

          merged.push({
            id: evt.id,
            type: 'application',
            title,
            description,
            timestamp: evt.event_date,
            meta: {
              status: evt.status,
              companyName: job.company_name,
              role: job.role,
              updateType: evt.update_type,
              applicationId: app.id
            }
          })
        })
      }

      // Add resume uploads
      if (resumesData) {
        resumesData.forEach((res: any) => {
          merged.push({
            id: res.id,
            type: 'resume',
            title: 'Resume Version Added',
            description: `Uploaded version of ${res.filename} to Vault`,
            timestamp: res.upload_date
          })
        })
      }

      // Add document uploads
      if (documentsData) {
        documentsData.forEach((doc: any) => {
          merged.push({
            id: doc.id,
            type: 'document',
            title: `Document Uploaded`,
            description: `Added "${doc.filename}" as a linked ${doc.type}`,
            timestamp: doc.upload_date
          })
        })
      }

      // Sort chronological newest first
      merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setActivities(merged)
    } catch (err: any) {
      toast.error('Failed to query activity: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [])

  const getIconForActivity = (item: ActivityItem) => {
    if (item.type === 'resume') {
      return <FileCode className="h-4.5 w-4.5 text-blue-400" />
    }
    if (item.type === 'document') {
      return <FileText className="h-4.5 w-4.5 text-purple-400" />
    }
    
    // Application state logs
    const status = item.meta?.status
    switch (status) {
      case 'Applied':
        return <Briefcase className="h-4.5 w-4.5 text-blue-400" />
      case 'Online Assessment':
        return <Clock className="h-4.5 w-4.5 text-purple-400" />
      case 'Interview':
        return <Calendar className="h-4.5 w-4.5 text-amber-400" />
      case 'Offer':
        return <Award className="h-4.5 w-4.5 text-emerald-400" />
      case 'Rejected':
        return <AlertOctagon className="h-4.5 w-4.5 text-rose-450" />
      default:
        return <Briefcase className="h-4.5 w-4.5 text-slate-400" />
    }
  }

  const getIndicatorColor = (item: ActivityItem) => {
    if (item.type === 'resume') return 'bg-blue-500 border-blue-500/20'
    if (item.type === 'document') return 'bg-purple-500 border-purple-500/20'
    
    const status = item.meta?.status
    switch (status) {
      case 'Applied':
        return 'bg-blue-500 border-blue-500/25'
      case 'Online Assessment':
        return 'bg-purple-500 border-purple-500/25'
      case 'Interview':
        return 'bg-amber-500 border-amber-500/25'
      case 'Offer':
        return 'bg-emerald-500 border-emerald-500/25'
      case 'Rejected':
        return 'bg-rose-500 border-rose-500/25'
      default:
        return 'bg-slate-500 border-slate-500/25'
    }
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Title Header */}
      <div className="border-b border-white/5 pb-6">
        <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <Activity className="h-6 w-6 text-purple-500" /> Activity Registry
        </h2>
        <p className="text-slate-400 text-xs mt-1">
          A real-time chronological log of application pipeline updates, resume revisions, and credential uploads.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
          <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
          <span className="text-xs text-slate-500 font-mono">Querying historical activities...</span>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/10 border border-white/5 rounded-xl backdrop-blur-sm space-y-3">
          <div className="h-10 w-10 bg-slate-800/40 rounded-full flex items-center justify-center mx-auto text-slate-500">
            <Activity className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-slate-300">No activities logged</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Log applications and upload resumes to populate your chronological career timeline feed.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 md:pl-8 border-l border-white/5 ml-4 md:ml-6 space-y-8 pt-4">
          {activities.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(idx * 0.05, 0.5), duration: 0.2 }}
              className="relative"
            >
              {/* Vertical timeline dot and lines */}
              <span className={`absolute -left-[31px] md:-left-[39px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-slate-950 ${getIndicatorColor(item)} flex items-center justify-center`} />

              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 bg-slate-900/15 hover:bg-slate-900/30 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all duration-200 backdrop-blur-md">
                <div className="flex items-start gap-4">
                  {/* Category icon */}
                  <div className="h-9 w-9 rounded-lg bg-slate-950/60 border border-white/5 flex items-center justify-center shrink-0 shadow-md">
                    {getIconForActivity(item)}
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-slate-100 flex items-center gap-2 flex-wrap">
                      {item.title}
                      {item.meta?.updateType && (
                        <Badge className={`text-[8px] font-mono py-0 px-1.5 border uppercase scale-90 ${
                          item.meta.updateType === 'email'
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                            : item.meta.updateType === 'system'
                            ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                            : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                        }`}>
                          {item.meta.updateType} sync
                        </Badge>
                      )}
                    </h4>
                    <p className="text-xs text-slate-400 font-medium">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 border-t border-white/[0.03] md:border-none pt-2.5 md:pt-0">
                  {/* Timestamp */}
                  <span className="text-[10px] text-slate-650 font-mono flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {new Date(item.timestamp).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>

                  {/* Optional Deep link to Application details */}
                  {item.meta?.applicationId && (
                    <button
                      onClick={() => toast.info(`Navigate to tracker page to view ${item.meta.companyName}`)}
                      className="text-blue-400 hover:text-blue-300 text-[10px] font-semibold flex items-center gap-1 hover:underline"
                    >
                      Inspect <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
