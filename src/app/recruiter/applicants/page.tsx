'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Users,
  Search,
  ArrowRight,
  ArrowLeft,
  Star,
  FileText,
  Github,
  Linkedin,
  Globe,
  Plus,
  Video,
  MessageSquare,
  ChevronRight,
  Trash2,
  AlertCircle,
  Loader2,
  X,
  MapPin,
  CheckCircle,
  Award
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface Candidate {
  id: string // application ID
  user_id: string
  internship_id: string
  status: 'Saved' | 'Applied' | 'Screening' | 'Online Assessment' | 'Interview' | 'Offer' | 'Rejected' | 'Withdrawn'
  applied_date: string
  notes?: string
  profiles: {
    id: string
    full_name: string
    university: string
    degree: string
    graduation_year: number
    skills: string[]
    linkedin_url?: string
    github_url?: string
    portfolio_url?: string
    resume_url?: string
  }
  internships: {
    title: string
  }
  // Recruiter review details joined from applicants table
  applicants?: {
    id: string
    notes: string
    rating: number
    match_score: number
  }[]
}

const COLUMNS = [
  { id: 'Applied', title: 'Applied', color: 'from-blue-600/10 to-blue-500/5 text-blue-400 border-blue-500/10' },
  { id: 'Screening', title: 'Screening', color: 'from-purple-650/10 to-purple-500/5 text-purple-400 border-purple-500/10' },
  { id: 'Online Assessment', title: 'OA (Online Assessment)', color: 'from-orange-650/10 to-orange-500/5 text-orange-400 border-orange-500/10' },
  { id: 'Interview', title: 'Interview', color: 'from-amber-650/10 to-amber-500/5 text-amber-400 border-amber-500/10' },
  { id: 'Offer', title: 'Offer Received', color: 'from-emerald-500/15 to-emerald-500/5 text-emerald-400 border-emerald-500/15' },
  { id: 'Rejected', title: 'Rejected', color: 'from-rose-500/10 to-rose-500/5 text-rose-450 border-rose-500/10' }
]

export default function RecruiterApplicantsPage() {
  const router = useRouter()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [internships, setInternships] = useState<any[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>('All')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Detailed student profile drawer
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [studentAchievements, setStudentAchievements] = useState<any[]>([])

  // Recruiter notes/rating state inside drawer
  const [recruiterNotes, setRecruiterNotes] = useState('')
  const [recruiterRating, setRecruiterRating] = useState(0)
  const [recruiterMatchScore, setRecruiterMatchScore] = useState(75)
  const [evaluationSaving, setEvaluationSaving] = useState(false)

  // Interview quick schedule modal
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [interviewDate, setInterviewDate] = useState('')
  const [interviewRound, setInterviewRound] = useState('Technical')
  const [meetingLink, setMeetingLink] = useState('')
  const [platform, setPlatform] = useState('Google Meet')
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false)

  const supabase = createClient()

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Fetch internships created by recruiter
      const { data: jobs, error: jobsErr } = await supabase
        .from('internships')
        .select('id, title')
        .eq('recruiter_id', user.id)

      if (jobsErr) throw jobsErr
      setInternships(jobs || [])

      const jobIds = (jobs || []).map(j => j.id)

      // 2. Fetch candidates applying to these jobs
      if (jobIds.length > 0) {
        const { data: apps, error: appsErr } = await supabase
          .from('applications')
          .select(`
            *,
            profiles (
              id,
              full_name,
              university,
              degree,
              graduation_year,
              skills,
              linkedin_url,
              github_url,
              portfolio_url,
              resume_url
            ),
            internships (
              title
            ),
            applicants (
              id,
              notes,
              rating,
              match_score
            )
          `)
          .in('internship_id', jobIds)

        if (appsErr) throw appsErr
        setCandidates((apps as any) || [])
      } else {
        setCandidates([])
      }
    } catch (e: any) {
      toast.error('Failed to load applicants: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Move candidate to adjacent pipeline status
  const moveStatus = async (applicationId: string, currentStatus: string, targetStatus: any) => {
    try {
      // 1. Update applications status
      const { error } = await supabase
        .from('applications')
        .update({ 
          status: targetStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)

      if (error) throw error

      // 2. Update timeline (logged automatically by system trigger, but we refresh local view)
      setCandidates(prev =>
        prev.map(c => c.id === applicationId ? { ...c, status: targetStatus } : c)
      )
      
      // Update selected drawer model if active
      if (selectedCandidate?.id === applicationId) {
        setSelectedCandidate(prev => prev ? { ...prev, status: targetStatus } : null)
      }

      toast.success(`Candidate status moved to ${targetStatus}`)
    } catch (e: any) {
      toast.error('Failed to transition status: ' + e.message)
    }
  }

  // Open Student evaluation drawer
  const openEvaluationDrawer = async (cand: Candidate) => {
    setSelectedCandidate(cand)
    const review = cand.applicants?.[0]
    setRecruiterNotes(review?.notes || '')
    setRecruiterRating(review?.rating || 0)
    setRecruiterMatchScore(review?.match_score || 75)
    setIsDrawerOpen(true)

    // Load student's achievements
    try {
      const { data } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', cand.user_id)
      setStudentAchievements(data || [])
    } catch (e) {
      console.error(e)
    }
  }

  // Save Recruiter notes/rating
  const handleSaveEvaluation = async () => {
    if (!selectedCandidate) return

    try {
      setEvaluationSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const review = selectedCandidate.applicants?.[0]
      const payload = {
        application_id: selectedCandidate.id,
        recruiter_id: user,
        notes: recruiterNotes,
        rating: recruiterRating,
        match_score: recruiterMatchScore
      }

      if (review) {
        // Update review
        const { error } = await supabase
          .from('applicants')
          .update(payload)
          .eq('id', review.id)

        if (error) throw error
      } else {
        // Insert review
        const { error } = await supabase
          .from('applicants')
          .insert(payload)

        if (error) throw error
      }

      toast.success('Candidate evaluation saved!')
      loadData()
      setIsDrawerOpen(false)
    } catch (e: any) {
      toast.error('Failed to save evaluation: ' + e.message)
    } finally {
      setEvaluationSaving(false)
    }
  }

  // Schedule interview quick form
  const handleQuickSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCandidate || !interviewDate) {
      toast.error('Please specify interview date')
      return
    }

    try {
      setScheduleSubmitting(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const newInterview = {
        user_id: selectedCandidate.user_id,
        company: selectedCandidate.internships?.title || 'Our Company',
        role: selectedCandidate.internships?.title || 'Intern',
        round: interviewRound,
        meeting_link: meetingLink || null,
        platform: platform || null,
        mode: 'Virtual',
        status: 'Upcoming',
        interview_date: new Date(interviewDate).toISOString()
      }

      const { data, error } = await supabase
        .from('interviews')
        .insert(newInterview)
        .select()
        .single()

      if (error) throw error

      // Add student notification
      await supabase.from('notifications').insert({
        user_id: selectedCandidate.user_id,
        title: 'Interview Scheduled',
        body: `Your interview for ${selectedCandidate.internships?.title} has been scheduled on ${new Date(interviewDate).toLocaleString()}.`,
        type: 'interview_tomorrow'
      })

      // Add checklist items automatically for them
      const defaults = [
        { user_id: selectedCandidate.user_id, interview_id: data.id, item: 'Research company & values', completed: false },
        { user_id: selectedCandidate.user_id, interview_id: data.id, item: 'Review resume & projects', completed: false },
        { user_id: selectedCandidate.user_id, interview_id: data.id, item: 'Practice core role skills', completed: false }
      ]
      await supabase.from('checklists').insert(defaults)

      toast.success('Interview scheduled and student notified!')
      setIsScheduleOpen(false)
      setInterviewDate('')
      setMeetingLink('')
    } catch (e: any) {
      toast.error('Failed to schedule interview: ' + e.message)
    } finally {
      setScheduleSubmitting(false)
    }
  }

  // Filtering Candidates
  const filteredCandidates = candidates.filter((c) => {
    const matchesJob = selectedJobId === 'All' || c.internship_id === selectedJobId
    const matchesSearch = c.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.profiles?.university?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.profiles?.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))

    return matchesJob && matchesSearch
  })

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Users className="h-7 w-7 text-purple-500" />
            Applicant pipeline Board
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Drag candidates across recruitment stages, evaluate profile details, write notes, and schedule rounds.
          </p>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-slate-900/30 border border-white/5 p-4 rounded-xl backdrop-blur-md flex flex-col sm:flex-row gap-4 justify-between items-center">
        {/* Job Listings selector */}
        <div className="flex items-center gap-2 text-xs text-slate-400 w-full sm:w-auto">
          <span>Filter by Opening:</span>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="bg-slate-950 border border-white/5 rounded-lg px-2.5 py-1.5 text-slate-350 focus:outline-none text-xs w-full sm:max-w-xs focus:border-blue-500"
          >
            <option value="All">All Internships</option>
            {internships.map((job) => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search name, university, skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-white/5 focus:border-white/10 rounded-lg pl-9 pr-4 py-2 text-slate-200 placeholder:text-slate-500 text-xs focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* KANBAN BOARD */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : candidates.length === 0 ? (
        <Card className="bg-slate-900/20 border-white/5 p-12 text-center">
          <Users className="h-10 w-10 text-slate-650 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-semibold">No candidates cataloged</p>
          <p className="text-slate-500 text-xs mt-1">Publish listings to receive applicant pipelines.</p>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950/50">
          {COLUMNS.map((col) => {
            const colCandidates = filteredCandidates.filter(c => {
              if (col.id === 'Online Assessment') return c.status === 'Online Assessment'
              return c.status === col.id
            })

            return (
              <div 
                key={col.id} 
                className="w-80 shrink-0 bg-slate-950/40 border border-white/5 rounded-2xl flex flex-col max-h-[70vh] relative overflow-hidden backdrop-blur-md"
              >
                {/* Column Header */}
                <div className={`p-4 border-b border-white/5 bg-gradient-to-b ${col.color} flex justify-between items-center`}>
                  <span className="font-extrabold text-xs tracking-wider uppercase">{col.title}</span>
                  <Badge variant="outline" className="border-white/5 bg-slate-950 text-[9px] font-mono">
                    {colCandidates.length}
                  </Badge>
                </div>

                {/* Column Body Cards list */}
                <div className="p-3 overflow-y-auto space-y-3 flex-1 scrollbar-thin scrollbar-thumb-slate-850">
                  {colCandidates.length === 0 ? (
                    <div className="text-center py-10 text-[10px] text-slate-600 italic">No candidates here</div>
                  ) : (
                    colCandidates.map((cand) => {
                      const review = cand.applicants?.[0]
                      const matchPct = review?.match_score || 75
                      const rating = review?.rating || 0

                      return (
                        <div 
                          key={cand.id}
                          onClick={() => openEvaluationDrawer(cand)}
                          className="p-4 bg-slate-900/60 border border-white/5 hover:border-white/10 rounded-xl cursor-pointer hover:bg-slate-900 transition-all duration-200 space-y-3 group"
                        >
                          <div className="flex justify-between items-start gap-1">
                            <div>
                              <h4 className="font-bold text-xs text-slate-100 group-hover:text-blue-450 transition-colors leading-tight">
                                {cand.profiles?.full_name || 'Candidate'}
                              </h4>
                              <p className="text-[9px] text-slate-500 truncate max-w-[180px] mt-1">
                                {cand.profiles?.university || 'University'}
                              </p>
                            </div>
                            <span className="text-[9px] font-bold font-mono text-emerald-400 bg-emerald-500/5 border border-emerald-500/15 px-1.5 py-0.5 rounded shrink-0">
                              {matchPct}% Match
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-[9px] text-slate-500 pt-2.5 border-t border-white/5 font-mono">
                            <span className="truncate max-w-[140px]">{cand.internships?.title}</span>
                            <span>{new Date(cand.applied_date).toLocaleDateString()}</span>
                          </div>

                          {/* Quick pipeline move action buttons */}
                          <div className="flex justify-end gap-1.5 pt-1.5 border-t border-white/5 opacity-40 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            {col.id !== 'Applied' && (
                              <button 
                                onClick={() => {
                                  const prevColIdx = COLUMNS.findIndex(c => c.id === col.id) - 1
                                  if (prevColIdx >= 0) moveStatus(cand.id, col.id, COLUMNS[prevColIdx].id)
                                }}
                                className="p-1 border border-white/5 rounded bg-slate-950 text-slate-500 hover:text-white"
                              >
                                <ArrowLeft className="h-3 w-3" />
                              </button>
                            )}
                            {col.id !== 'Rejected' && col.id !== 'Offer' && (
                              <button 
                                onClick={() => {
                                  const nextColIdx = COLUMNS.findIndex(c => c.id === col.id) + 1
                                  if (nextColIdx < COLUMNS.length) moveStatus(cand.id, col.id, COLUMNS[nextColIdx].id)
                                }}
                                className="p-1 border border-white/5 rounded bg-slate-950 text-slate-500 hover:text-white"
                              >
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* STUDENT EVALUATION DRAWER */}
      <AnimatePresence>
        {isDrawerOpen && selectedCandidate && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Slide-over Drawer Frame */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="bg-slate-950 border-l border-white/10 w-full max-w-lg h-full z-50 shadow-2xl relative flex flex-col justify-between text-slate-100"
            >
              <div className="absolute top-0 left-0 w-[150px] h-[150px] bg-gradient-to-br from-purple-500/5 to-transparent rounded-full blur-[40px] pointer-events-none" />

              {/* Drawer Header */}
              <div className="p-6 border-b border-white/5 flex justify-between items-start shrink-0">
                <div>
                  <h3 className="text-md font-extrabold text-white">{selectedCandidate.profiles?.full_name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedCandidate.profiles?.degree} • Class of {selectedCandidate.profiles?.graduation_year}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">{selectedCandidate.profiles?.university}</p>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Body content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
                {/* Social & Resume Links */}
                <div className="grid grid-cols-2 gap-3">
                  {selectedCandidate.profiles?.resume_url ? (
                    <a 
                      href={selectedCandidate.profiles.resume_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 p-2 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-semibold"
                    >
                      <FileText className="h-4 w-4" />
                      View Resume
                    </a>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 p-2 bg-slate-900/50 border border-white/5 text-slate-500 rounded-lg text-xs italic">
                      No Resume Uploaded
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2">
                    {selectedCandidate.profiles?.linkedin_url && (
                      <a href={selectedCandidate.profiles.linkedin_url} target="_blank" className="p-2 border border-white/5 hover:border-white/10 rounded-lg text-slate-400 hover:text-white bg-slate-900/50">
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                    {selectedCandidate.profiles?.github_url && (
                      <a href={selectedCandidate.profiles.github_url} target="_blank" className="p-2 border border-white/5 hover:border-white/10 rounded-lg text-slate-400 hover:text-white bg-slate-900/50">
                        <Github className="h-4 w-4" />
                      </a>
                    )}
                    {selectedCandidate.profiles?.portfolio_url && (
                      <a href={selectedCandidate.profiles.portfolio_url} target="_blank" className="p-2 border border-white/5 hover:border-white/10 rounded-lg text-slate-400 hover:text-white bg-slate-900/50">
                        <Globe className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Candidate Skills */}
                <div className="space-y-2">
                  <h4 className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">Candidate Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCandidate.profiles?.skills?.length > 0 ? (
                      selectedCandidate.profiles.skills.map((s, idx) => (
                        <Badge key={idx} variant="outline" className="border-white/5 bg-slate-900/50 text-slate-350 text-[10px] py-0.5">
                          {s}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 italic">No skills listed.</span>
                    )}
                  </div>
                </div>

                {/* Student Achievements */}
                <div className="space-y-2">
                  <h4 className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">Achievements</h4>
                  {studentAchievements.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No achievements unlocked yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {studentAchievements.map((ach) => (
                        <Badge key={ach.id} className="bg-yellow-500/10 border border-yellow-500/25 text-yellow-500 text-[9px] font-mono py-0.5 flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          {ach.badge_type}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* RECRUITER EVALUATION SECTION */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Hiring Assessment</h4>
                  
                  {/* Match Score slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">Match score suitability</span>
                      <span className="font-mono text-emerald-400 font-bold">{recruiterMatchScore}%</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="100"
                      value={recruiterMatchScore}
                      onChange={(e) => setRecruiterMatchScore(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* Rating Selector */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-400 block">Candidate Rating</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRecruiterRating(star)}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star className={`h-5 w-5 ${
                            star <= recruiterRating ? 'text-yellow-500 fill-current' : 'text-slate-650'
                          }`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recruiter Evaluation Notes */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-400 block">Interview Evaluation Notes</span>
                    <textarea
                      placeholder="Write private feedback about candidate (e.g. Good DSA fundamentals, weak Redux knowledge)..."
                      value={recruiterNotes}
                      onChange={(e) => setRecruiterNotes(e.target.value)}
                      rows={4}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-6 border-t border-white/5 bg-slate-950/40 space-y-3 shrink-0">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => setIsScheduleOpen(true)}
                    type="button"
                    variant="outline"
                    className="border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400 font-semibold text-xs py-2 flex items-center justify-center gap-1.5"
                  >
                    <Video className="h-4 w-4" />
                    Schedule Interview
                  </Button>
                  <Button
                    onClick={() => {
                      router.push('/recruiter/messages')
                      setIsDrawerOpen(false)
                    }}
                    type="button"
                    variant="outline"
                    className="border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 text-purple-400 font-semibold text-xs py-2 flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Chat Candidate
                  </Button>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsDrawerOpen(false)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveEvaluation}
                    disabled={evaluationSaving}
                    className="bg-gradient-to-r from-purple-600 to-pink-650 hover:from-purple-500 hover:to-pink-550 text-white font-bold text-xs px-4"
                  >
                    {evaluationSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Evaluation'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK SCHEDULE MODAL */}
      <AnimatePresence>
        {isScheduleOpen && selectedCandidate && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsScheduleOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-950 border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl z-50 text-slate-100 flex flex-col gap-4 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-gradient-to-bl from-amber-500/5 to-transparent rounded-full blur-[30px] pointer-events-none" />

              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Video className="h-4.5 w-4.5 text-amber-500" />
                  Schedule Interview
                </h3>
                <button onClick={() => setIsScheduleOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleQuickSchedule} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Candidate</label>
                  <input
                    type="text"
                    disabled
                    value={selectedCandidate.profiles?.full_name}
                    className="w-full bg-slate-900/50 border border-white/5 rounded-lg p-2.5 text-slate-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Round (Type)</label>
                  <select
                    value={interviewRound}
                    onChange={(e) => setInterviewRound(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 focus:outline-none"
                  >
                    <option>Technical</option>
                    <option>HR</option>
                    <option>Behavioral</option>
                    <option>System Design</option>
                    <option>Online Assessment</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2 text-slate-100 focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Meeting Link (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/abc-defg-hij"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsScheduleOpen(false)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={scheduleSubmitting}
                    className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs px-4"
                  >
                    {scheduleSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Interview'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
