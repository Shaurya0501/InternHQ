'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Video,
  Plus,
  Calendar,
  Clock,
  ExternalLink,
  Trash2,
  XCircle,
  CheckCircle,
  Loader2,
  X,
  User,
  Briefcase,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface Interview {
  id: string
  user_id: string
  company: string
  role: string
  round: string
  meeting_link?: string
  platform?: string
  notes?: string
  status: 'Upcoming' | 'Completed' | 'Cancelled' | 'Missed'
  interview_date: string
  profiles: {
    full_name: string
  }
}

export default function RecruiterInterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [candidates, setCandidates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('Upcoming')

  // Scheduler Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form Fields
  const [selectedAppId, setSelectedAppId] = useState('')
  const [round, setRound] = useState('Technical')
  const [date, setDate] = useState('')
  const [platform, setPlatform] = useState('Google Meet')
  const [link, setLink] = useState('')
  const [notes, setNotes] = useState('')

  const supabase = createClient()

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Fetch internships created by recruiter
      const { data: jobs } = await supabase
        .from('internships')
        .select('id, title')
        .eq('recruiter_id', user.id)

      const jobIds = (jobs || []).map(j => j.id)

      if (jobIds.length > 0) {
        // 2. Fetch interviews where roles match the internships created by recruiter
        // Or fetch where recruiter scheduled (to make it simple, we filter interviews matching recruiter's jobs or created company)
        const { data: ivs, error: ivsErr } = await supabase
          .from('interviews')
          .select('*, profiles(full_name)')
          .order('interview_date', { ascending: true })

        if (ivsErr) throw ivsErr
        // We filter interviews matching recruiters jobs locally or by company (since role/company matches)
        const filteredIvs = (ivs || []).filter(iv => {
          return jobs?.some(j => j.title === iv.role)
        })
        setInterviews(filteredIvs as any)

        // 3. Fetch candidates who applied (to populate drop-down for scheduling)
        const { data: apps } = await supabase
          .from('applications')
          .select('*, profiles(full_name), internships(title)')
          .in('internship_id', jobIds)

        setCandidates(apps || [])
        if (apps && apps.length > 0) {
          setSelectedAppId(apps[0].id)
        }
      }
    } catch (e: any) {
      toast.error('Failed to load interviews: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateInterview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAppId || !date) {
      toast.error('Please select candidate and date')
      return
    }

    try {
      setSubmitting(true)
      const app = candidates.find(c => c.id === selectedAppId)
      if (!app) throw new Error('Selected applicant not found')

      const { data, error } = await supabase
        .from('interviews')
        .insert({
          user_id: app.user_id,
          company: app.internships?.title || 'Our Company',
          role: app.internships?.title || 'Intern',
          round,
          meeting_link: link || null,
          platform: platform || null,
          mode: 'Virtual',
          status: 'Upcoming',
          interview_date: new Date(date).toISOString(),
          notes: notes || null
        })
        .select()
        .single()

      if (error) throw error

      // Create student checklist defaults
      const defaults = [
        { user_id: app.user_id, interview_id: data.id, item: 'Research company & values', completed: false },
        { user_id: app.user_id, interview_id: data.id, item: 'Review resume & projects', completed: false },
        { user_id: app.user_id, interview_id: data.id, item: 'Practice core role skills', completed: false }
      ]
      await supabase.from('checklists').insert(defaults)

      // Notify Student
      await supabase.from('notifications').insert({
        user_id: app.user_id,
        title: 'New Interview Scheduled',
        body: `Recruiter scheduled your ${round} Interview for ${app.internships?.title} on ${new Date(date).toLocaleString()}.`,
        type: 'interview_tomorrow'
      })

      // Update application status to 'Interview'
      await supabase
        .from('applications')
        .update({ status: 'Interview' })
        .eq('id', app.id)

      toast.success('Interview scheduled successfully!')
      setIsModalOpen(false)
      resetForm()
      loadData()
    } catch (e: any) {
      toast.error('Failed to schedule interview: ' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateStatus = async (id: string, targetStatus: 'Completed' | 'Cancelled') => {
    try {
      const { error } = await supabase
        .from('interviews')
        .update({ status: targetStatus })
        .eq('id', id)

      if (error) throw error

      toast.success(`Interview marked as ${targetStatus}`)
      setInterviews(prev =>
        prev.map(iv => iv.id === id ? { ...iv, status: targetStatus } : iv)
      )
    } catch (e: any) {
      toast.error('Failed to update status: ' + e.message)
    }
  }

  const resetForm = () => {
    setRound('Technical')
    setDate('')
    setPlatform('Google Meet')
    setLink('')
    setNotes('')
  }

  const filteredInterviews = interviews.filter(iv => iv.status === statusFilter)

  // Status badges
  const statusBadges = {
    Upcoming: 'bg-amber-500/10 border-amber-500/20 text-amber-450 font-bold',
    Completed: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    Cancelled: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    Missed: 'bg-slate-500/10 border-slate-500/20 text-slate-400'
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Video className="h-7 w-7 text-purple-500" />
            Interview Scheduler
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Coordinate video interviews, track rounds, and notify candidates of scheduled meetings.
          </p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-650 hover:from-purple-500 hover:to-pink-550 text-white font-bold text-xs rounded-lg px-4 py-2.5 flex items-center gap-2 h-10 shadow-lg"
        >
          <Plus className="h-4 w-4" />
          Schedule Interview
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-slate-950 p-1 rounded-lg border border-white/5 w-fit">
        {['Upcoming', 'Completed', 'Cancelled'].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
              statusFilter === tab 
                ? 'bg-slate-900 border border-white/10 text-white shadow' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Interviews list */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : filteredInterviews.length === 0 ? (
        <Card className="bg-slate-900/20 border-white/5 p-12 text-center">
          <Calendar className="h-10 w-10 text-slate-650 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-semibold">No interviews scheduled</p>
          <p className="text-slate-500 text-xs mt-1">Select "Schedule Interview" to assign timings for your applicants.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredInterviews.map((iv) => (
              <motion.div
                key={iv.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-slate-900/40 border border-white/5 p-5 rounded-xl backdrop-blur-md flex flex-col justify-between h-44 group hover:border-white/10 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-blue-400" />
                        {iv.profiles?.full_name || 'Candidate'}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{iv.role}</p>
                    </div>
                    <Badge className={`text-[8px] font-mono py-0.5 uppercase scale-95 border ${statusBadges[iv.status]}`}>
                      {iv.round}
                    </Badge>
                  </div>

                  <div className="text-[10px] text-slate-400 flex flex-col gap-1.5 pt-2 border-t border-white/5 font-mono">
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-500" /> {new Date(iv.interview_date).toLocaleString()}</span>
                    {iv.meeting_link && (
                      <span className="flex items-center gap-1.5"><Video className="h-3.5 w-3.5 text-purple-500" /> {iv.platform}: <a href={iv.meeting_link} target="_blank" className="text-blue-400 hover:underline flex items-center gap-0.5">{iv.meeting_link.substring(0, 30)}... <ExternalLink className="h-2.5 w-2.5" /></a></span>
                    )}
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex justify-between items-center pt-2.5 border-t border-white/5">
                  <span className="text-[9px] text-slate-550 font-mono">ID: {iv.id.substring(0, 8)}</span>
                  
                  {iv.status === 'Upcoming' && (
                    <div className="flex items-center gap-1.5">
                      <Button 
                        onClick={() => handleUpdateStatus(iv.id, 'Completed')}
                        size="icon-sm" className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[9px] px-2.5 h-6.5 rounded flex items-center gap-1"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Complete
                      </Button>
                      <Button 
                        onClick={() => handleUpdateStatus(iv.id, 'Cancelled')}
                        size="icon-sm" className="bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 border border-rose-500/10 text-[9px] px-2.5 h-6.5 rounded flex items-center gap-1"
                      >
                        <XCircle className="h-3 w-3" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* SCHEDULE INTERVIEW DIALOG */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-950 border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl z-50 text-slate-100 flex flex-col gap-4 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-gradient-to-bl from-purple-500/5 to-pink-500/5 rounded-full blur-[40px] pointer-events-none" />

              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="text-md font-extrabold text-white flex items-center gap-2">
                  <Video className="h-4.5 w-4.5 text-purple-500" />
                  Schedule Candidate Interview
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateInterview} className="space-y-4 text-xs">
                
                {candidates.length === 0 ? (
                  <div className="p-4 bg-slate-900 border border-white/5 rounded-xl text-center flex flex-col gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500 mx-auto" />
                    <p className="text-slate-400 font-semibold">No candidates available</p>
                    <p className="text-slate-500 text-[10px]">You must have applicants on your listings before scheduling interviews.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Select Candidate *</label>
                      <select
                        value={selectedAppId}
                        onChange={(e) => setSelectedAppId(e.target.value)}
                        className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:ring-0 focus:border-blue-500 h-10"
                      >
                        {candidates.map((cand) => (
                          <option key={cand.id} value={cand.id}>
                            {cand.profiles?.full_name} ({cand.internships?.title})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Interview Round *</label>
                        <select
                          value={round}
                          onChange={(e) => setRound(e.target.value)}
                          className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:ring-0 focus:border-blue-500 h-10"
                        >
                          <option>Technical</option>
                          <option>HR</option>
                          <option>Behavioral</option>
                          <option>System Design</option>
                          <option>Online Assessment</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Platform</label>
                        <select
                          value={platform}
                          onChange={(e) => setPlatform(e.target.value)}
                          className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:ring-0 focus:border-blue-500 h-10"
                        >
                          <option>Google Meet</option>
                          <option>Zoom Meetings</option>
                          <option>Microsoft Teams</option>
                          <option>HackerRank Codepair</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date & Time *</label>
                      <input
                        type="datetime-local"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2 text-slate-100 focus:outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Meeting link</label>
                      <input
                        type="url"
                        placeholder="https://meet.google.com/abc-defg-hij"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:ring-0 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Private Notes / prep instructions</label>
                      <textarea
                        placeholder="Instructions sent to candidate or interviewer notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:ring-0 focus:border-blue-500 resize-none"
                      />
                    </div>

                    <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsModalOpen(false)}
                        className="text-slate-400 hover:text-white text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="bg-gradient-to-r from-purple-600 to-pink-650 hover:from-purple-500 hover:to-pink-550 text-white font-bold text-xs px-4"
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Interview'}
                      </Button>
                    </div>
                  </>
                )}

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
