'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Plus,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ClipboardList,
  CheckSquare,
  AlertCircle,
  TrendingUp,
  X,
  Share2,
  Trash2,
  Loader2,
  Users
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface Interview {
  id: string
  company: string
  role: string
  round: string
  interviewer_name?: string
  meeting_link?: string
  platform?: string
  notes?: string
  mode: 'Virtual' | 'In-Person' | 'Phone'
  status: 'Upcoming' | 'Completed' | 'Cancelled' | 'Missed'
  outcome: 'Pending' | 'Offer' | 'Rejected' | 'Next Round'
  follow_up_notes?: string
  interview_date: string
  created_at: string
}

interface ChecklistItem {
  id: string
  item: string
  completed: boolean
}

export default function InterviewHubPage() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'All' | 'Upcoming' | 'Completed' | 'Cancelled' | 'Missed'>('All')

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)

  // Add Form State
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [round, setRound] = useState('Technical')
  const [interviewerName, setInterviewerName] = useState('')
  const [meetingLink, setMeetingLink] = useState('')
  const [platform, setPlatform] = useState('Google Meet')
  const [notes, setNotes] = useState('')
  const [mode, setMode] = useState<'Virtual' | 'In-Person' | 'Phone'>('Virtual')
  const [interviewDate, setInterviewDate] = useState('')
  const [status, setStatus] = useState<'Upcoming' | 'Completed' | 'Cancelled' | 'Missed'>('Upcoming')
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Checklist State inside details modal
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [checklistLoading, setChecklistLoading] = useState(false)

  // Details Outcomes State
  const [outcome, setOutcome] = useState<'Pending' | 'Offer' | 'Rejected' | 'Next Round'>('Pending')
  const [followUpNotes, setFollowUpNotes] = useState('')
  const [detailsSubmitting, setDetailsSubmitting] = useState(false)

  // Share Experience Form State
  const [shareProcess, setShareProcess] = useState('')
  const [shareQuestions, setShareQuestions] = useState('')
  const [shareDifficulty, setShareDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium')
  const [shareOutcome, setShareOutcome] = useState('Offered')
  const [shareTips, setShareTips] = useState('')
  const [shareAnonymous, setShareAnonymous] = useState(false)
  const [sharePublic, setSharePublic] = useState(true)
  const [shareSubmitting, setShareSubmitting] = useState(false)

  const supabase = createClient()

  const fetchInterviews = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('user_id', user.id)
        .order('interview_date', { ascending: true })

      if (error) throw error
      setInterviews(data || [])
    } catch (e: any) {
      toast.error('Failed to load interviews: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInterviews()
  }, [])

  const handleAddInterview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company || !role || !interviewDate) {
      toast.error('Please fill in required fields')
      return
    }

    try {
      setFormSubmitting(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const newInterview = {
        user_id: user.id,
        company,
        role,
        round,
        interviewer_name: interviewerName || null,
        meeting_link: meetingLink || null,
        platform: platform || null,
        notes: notes || null,
        mode,
        status,
        outcome: 'Pending',
        interview_date: new Date(interviewDate).toISOString()
      }

      const { data, error } = await supabase
        .from('interviews')
        .insert(newInterview)
        .select()
        .single()

      if (error) throw error

      toast.success('Interview scheduled successfully!')
      
      // Auto-create some default checklist items
      const defaults = [
        { user_id: user.id, interview_id: data.id, item: 'Research company & values', completed: false },
        { user_id: user.id, interview_id: data.id, item: 'Review resume & project details', completed: false },
        { user_id: user.id, interview_id: data.id, item: 'Practice core role skills / questions', completed: false },
        { user_id: user.id, interview_id: data.id, item: 'Prepare questions for the interviewer', completed: false }
      ]
      await supabase.from('checklists').insert(defaults)

      // Refresh list
      fetchInterviews()
      setIsAddOpen(false)
      resetAddForm()
    } catch (e: any) {
      toast.error('Error scheduling interview: ' + e.message)
    } finally {
      setFormSubmitting(false)
    }
  }

  const resetAddForm = () => {
    setCompany('')
    setRole('')
    setRound('Technical')
    setInterviewerName('')
    setMeetingLink('')
    setPlatform('Google Meet')
    setNotes('')
    setMode('Virtual')
    setInterviewDate('')
    setStatus('Upcoming')
  }

  const openDetails = async (interview: Interview) => {
    setSelectedInterview(interview)
    setOutcome(interview.outcome)
    setFollowUpNotes(interview.follow_up_notes || '')
    setIsDetailsOpen(true)
    
    // Fetch Checklist Items
    try {
      setChecklistLoading(true)
      const { data, error } = await supabase
        .from('checklists')
        .select('*')
        .eq('interview_id', interview.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setChecklist(data || [])
    } catch (e: any) {
      toast.error('Failed to load checklist: ' + e.message)
    } finally {
      setChecklistLoading(false)
    }
  }

  const handleAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChecklistItem.trim() || !selectedInterview) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const newItem = {
        user_id: user.id,
        interview_id: selectedInterview.id,
        item: newChecklistItem.trim(),
        completed: false
      }

      const { data, error } = await supabase
        .from('checklists')
        .insert(newItem)
        .select()
        .single()

      if (error) throw error
      setChecklist(prev => [...prev, data])
      setNewChecklistItem('')
    } catch (e: any) {
      toast.error('Failed to add checklist item: ' + e.message)
    }
  }

  const handleToggleChecklist = async (id: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('checklists')
        .update({ completed: !completed })
        .eq('id', id)

      if (error) throw error
      setChecklist(prev =>
        prev.map(item => item.id === id ? { ...item, completed: !completed } : item)
      )
    } catch (e: any) {
      toast.error('Failed to update checklist item: ' + e.message)
    }
  }

  const handleDeleteChecklistItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('checklists')
        .delete()
        .eq('id', id)

      if (error) throw error
      setChecklist(prev => prev.filter(item => item.id !== id))
    } catch (e: any) {
      toast.error('Failed to delete checklist item: ' + e.message)
    }
  }

  const handleSaveOutcomes = async () => {
    if (!selectedInterview) return

    try {
      setDetailsSubmitting(true)
      const isStatusChange = selectedInterview.outcome !== outcome
      
      const updates = {
        outcome,
        follow_up_notes: followUpNotes || null,
        status: (outcome === 'Offer' || outcome === 'Rejected') ? 'Completed' as const : selectedInterview.status,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('interviews')
        .update(updates)
        .eq('id', selectedInterview.id)

      if (error) throw error

      toast.success('Interview details updated!')
      fetchInterviews()
      setIsDetailsOpen(false)
    } catch (e: any) {
      toast.error('Failed to save changes: ' + e.message)
    } finally {
      setDetailsSubmitting(false)
    }
  }

  const handleShareExperience = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInterview || !shareProcess || !shareQuestions) {
      toast.error('Please fill in required fields')
      return
    }

    try {
      setShareSubmitting(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const experience = {
        user_id: user.id,
        company: selectedInterview.company,
        role: selectedInterview.role,
        interview_process: shareProcess,
        questions_asked: shareQuestions,
        difficulty: shareDifficulty,
        outcome: shareOutcome,
        preparation_tips: shareTips || null,
        is_anonymous: shareAnonymous,
        is_public: sharePublic
      }

      const { error } = await supabase
        .from('interview_experiences')
        .insert(experience)

      if (error) throw error

      toast.success('Interview experience shared successfully!')
      setIsShareOpen(false)
      resetShareForm()
    } catch (e: any) {
      toast.error('Error sharing experience: ' + e.message)
    } finally {
      setShareSubmitting(false)
    }
  }

  const resetShareForm = () => {
    setShareProcess('')
    setShareQuestions('')
    setShareDifficulty('Medium')
    setShareOutcome('Offered')
    setShareTips('')
    setShareAnonymous(false)
    setSharePublic(true)
  }

  // Filter & Search
  const filteredInterviews = interviews.filter(item => {
    const matchesSearch = item.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.round.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (activeTab === 'All') return matchesSearch
    return matchesSearch && item.status === activeTab
  })

  // Checklist Progress Helper
  const completedChecklistCount = checklist.filter(c => c.completed).length
  const checklistPct = checklist.length > 0 ? Math.round((completedChecklistCount / checklist.length) * 100) : 0

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Calendar className="h-7 w-7 text-blue-500" />
            Interview Hub
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Track upcoming interactions, manage custom prep checklists, and log feedback summaries.
          </p>
        </div>
        <Button 
          onClick={() => setIsAddOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs rounded-lg px-4 py-2.5 flex items-center gap-2 h-10 shadow-lg shadow-blue-500/10"
        >
          <Plus className="h-4 w-4" />
          Schedule Interview
        </Button>
      </div>

      {/* Grid Summary Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Scheduled', val: interviews.length, col: 'text-blue-400' },
          { label: 'Upcoming Rounds', val: interviews.filter(i => i.status === 'Upcoming').length, col: 'text-amber-400' },
          { label: 'Completed Rounds', val: interviews.filter(i => i.status === 'Completed').length, col: 'text-emerald-400' },
          { 
            label: 'Success Rate', 
            val: interviews.filter(i => i.status === 'Completed').length > 0 
              ? `${Math.round((interviews.filter(i => i.outcome === 'Offer' || i.outcome === 'Next Round').length / interviews.filter(i => i.status === 'Completed').length) * 100)}%` 
              : '0%', 
            col: 'text-purple-400' 
          }
        ].map((stat, i) => (
          <Card key={i} className="bg-slate-900/40 border-white/5 backdrop-blur-md">
            <CardContent className="p-4 flex flex-col justify-center">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{stat.label}</span>
              <span className={`text-2xl font-black mt-1 ${stat.col}`}>{stat.val}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/30 border border-white/5 p-4 rounded-xl backdrop-blur-md">
        {/* Filter Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-white/5 overflow-x-auto w-full sm:w-auto scrollbar-none">
          {(['All', 'Upcoming', 'Completed', 'Cancelled', 'Missed'] as const).map((tab) => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  isActive 
                    ? 'bg-slate-900 border border-white/10 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by company or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-white/5 focus:border-white/10 rounded-lg pl-9 pr-4 py-2 text-slate-200 placeholder:text-slate-500 text-xs focus:outline-none focus:ring-0 transition-colors"
          />
        </div>
      </div>

      {/* Main Interviews List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : filteredInterviews.length === 0 ? (
        <Card className="bg-slate-900/20 border-white/5 p-12 text-center">
          <Calendar className="h-10 w-10 text-slate-650 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-semibold">No interviews indexed</p>
          <p className="text-slate-500 text-xs mt-1">Schedule a round or adjust filters to view updates.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredInterviews.map((item) => {
              const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                item.company
              )}&backgroundColor=0f172a,1e293b,334155`

              const dateObj = new Date(item.interview_date)
              const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
              const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

              // Status badge details
              const statusBadges = {
                Upcoming: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
                Completed: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                Cancelled: 'bg-rose-500/10 border-rose-500/20 text-rose-450',
                Missed: 'bg-slate-500/10 border-slate-500/20 text-slate-400'
              }

              // Outcome badge details
              const outcomeBadges = {
                Pending: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
                Offer: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-bold',
                Rejected: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
                'Next Round': 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => openDetails(item)}
                  className="bg-slate-900/40 border border-white/5 hover:border-white/10 p-5 rounded-xl backdrop-blur-md cursor-pointer hover:bg-slate-900/60 transition-all duration-300 flex flex-col justify-between h-48 group"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg overflow-hidden border border-white/10 bg-slate-950 shrink-0 flex items-center justify-center">
                          <img src={defaultAvatar} alt="Logo" className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-white group-hover:text-blue-400 transition-colors">{item.company}</h3>
                          <p className="text-xs text-slate-400 font-medium truncate max-w-[200px] mt-0.5">{item.role}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge className={`text-[9px] font-mono py-0.5 uppercase scale-95 border ${statusBadges[item.status]}`}>
                          {item.status}
                        </Badge>
                        {item.status === 'Completed' && (
                          <Badge className={`text-[8px] font-mono py-0 scale-90 border ${outcomeBadges[item.outcome]}`}>
                            {item.outcome}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-mono">
                        <Calendar className="h-3.5 w-3.5 text-blue-500" />
                        <span>{dateStr}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-mono">
                        <Clock className="h-3.5 w-3.5 text-purple-500" />
                        <span>{timeStr}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-mono">
                        <Video className="h-3.5 w-3.5 text-amber-500" />
                        <span className="truncate">{item.round}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-mono">
                        <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                        <span>{item.mode}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <span className="text-[10px] text-blue-400 group-hover:text-blue-300 font-bold flex items-center gap-0.5 transition-colors">
                      Prep & Details <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* SCHEDULE INTERVIEW MODAL */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-950 border border-white/10 w-full max-w-xl rounded-2xl p-6 shadow-2xl z-50 text-slate-100 flex flex-col gap-4 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-gradient-to-bl from-blue-500/5 to-purple-500/5 rounded-full blur-[40px] pointer-events-none" />
              
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="text-md font-extrabold text-white flex items-center gap-2">
                  <Calendar className="h-4.5 w-4.5 text-blue-500" />
                  Schedule New Interview
                </h3>
                <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddInterview} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Company *</label>
                    <input
                      type="text"
                      placeholder="e.g. Swiggy"
                      required
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Role *</label>
                    <input
                      type="text"
                      placeholder="e.g. Software Engineer Intern"
                      required
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Round (Type) *</label>
                    <select
                      value={round}
                      onChange={(e) => setRound(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors"
                    >
                      <option>Technical</option>
                      <option>HR</option>
                      <option>Behavioral</option>
                      <option>System Design</option>
                      <option>Managerial</option>
                      <option>Online Assessment</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date & Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={interviewDate}
                      onChange={(e) => setInterviewDate(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2 text-slate-100 text-xs focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mode *</label>
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value as any)}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors"
                    >
                      <option value="Virtual">Virtual</option>
                      <option value="In-Person">In-Person</option>
                      <option value="Phone">Phone</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Platform</label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      disabled={mode !== 'Virtual'}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors disabled:opacity-50"
                    >
                      <option>Google Meet</option>
                      <option>Zoom</option>
                      <option>Microsoft Teams</option>
                      <option>Webex</option>
                      <option>Phone Call</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status *</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors"
                    >
                      <option value="Upcoming">Upcoming</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Missed">Missed</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Interviewer Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe (Engineering Manager)"
                    value={interviewerName}
                    onChange={(e) => setInterviewerName(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Meeting Link (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/abc-defg-hij"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    disabled={mode !== 'Virtual'}
                    className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Notes / Syllabus</label>
                  <textarea
                    placeholder="Provide any description or focus areas (e.g. Focus on Redux, Web sockets, and System design...)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors resize-none"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsAddOpen(false)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={formSubmitting}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs px-4"
                  >
                    {formSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Schedule'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INTERVIEW DETAILS & PREPARATION DRAWER/MODAL */}
      <AnimatePresence>
        {isDetailsOpen && selectedInterview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailsOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-950 border border-white/10 w-full max-w-2xl rounded-2xl p-6 shadow-2xl z-50 text-slate-100 flex flex-col gap-5 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-gradient-to-bl from-blue-500/5 to-purple-500/5 rounded-full blur-[50px] pointer-events-none" />

              <div className="flex justify-between items-start border-b border-white/5 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-white">{selectedInterview.company}</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">{selectedInterview.role} • {selectedInterview.round} Round</p>
                </div>
                <button onClick={() => setIsDetailsOpen(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                {/* Left Side: General Details & Checklist */}
                <div className="space-y-5">
                  <div>
                    <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Round Details</h4>
                    <div className="bg-slate-900/50 border border-white/5 p-3 rounded-lg space-y-2 text-xs">
                      {selectedInterview.interviewer_name && (
                        <p className="text-slate-350"><span className="text-slate-500">Interviewer:</span> {selectedInterview.interviewer_name}</p>
                      )}
                      <p className="text-slate-350"><span className="text-slate-500">Scheduled:</span> {new Date(selectedInterview.interview_date).toLocaleString()}</p>
                      <p className="text-slate-350"><span className="text-slate-500">Mode:</span> {selectedInterview.mode} {selectedInterview.platform ? `(${selectedInterview.platform})` : ''}</p>
                      {selectedInterview.meeting_link && (
                        <a 
                          href={selectedInterview.meeting_link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-400 hover:underline flex items-center gap-1 mt-1 font-mono text-[10px] w-fit"
                        >
                          Join Meeting <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {selectedInterview.notes && (
                        <div className="mt-2 pt-2 border-t border-white/5 text-slate-450 italic">
                          "{selectedInterview.notes}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PREPARATION CHECKLIST SECTION */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <CheckSquare className="h-4 w-4 text-blue-500" />
                        Prep Checklist
                      </h4>
                      <Badge className="bg-blue-500/10 text-blue-400 text-[9px] border border-blue-500/20 font-mono">
                        {checklistPct}% Ready
                      </Badge>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                        style={{ width: `${checklistPct}%` }}
                      />
                    </div>

                    {/* Checklist Add Form */}
                    <form onSubmit={handleAddChecklistItem} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add prep item (e.g. revise Redux)..."
                        value={newChecklistItem}
                        onChange={(e) => setNewChecklistItem(e.target.value)}
                        className="flex-1 bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg px-3 py-1.5 text-slate-200 placeholder:text-slate-500 text-xs focus:outline-none"
                      />
                      <Button type="submit" size="sm" className="bg-slate-900 border border-white/5 text-slate-300 px-3 hover:bg-slate-800">
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </form>

                    {/* Checklist Items list */}
                    {checklistLoading ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 text-blue-500 animate-spin" /></div>
                    ) : checklist.length === 0 ? (
                      <p className="text-[10px] text-slate-650 italic text-center py-2">No checklist items created yet.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                        {checklist.map((item) => (
                          <div 
                            key={item.id} 
                            className="flex justify-between items-center gap-2 p-2 bg-slate-900/30 border border-white/5 rounded-lg text-xs"
                          >
                            <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={item.completed}
                                onChange={() => handleToggleChecklist(item.id, item.completed)}
                                className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-0 focus:ring-offset-0 h-3.5 w-3.5 cursor-pointer"
                              />
                              <span className={`truncate leading-none ${item.completed ? 'line-through text-slate-500' : 'text-slate-350'}`}>
                                {item.item}
                              </span>
                            </label>
                            <button 
                              onClick={() => handleDeleteChecklistItem(item.id)}
                              className="text-slate-650 hover:text-rose-400 p-0.5 shrink-0 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Outcome Log & Follow-up */}
                <div className="space-y-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Log Outcome & Feedback</h4>
                    
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-slate-400 font-semibold">Outcome Status</label>
                      <select
                        value={outcome}
                        onChange={(e) => setOutcome(e.target.value as any)}
                        className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors"
                      >
                        <option value="Pending">Pending Decision</option>
                        <option value="Offer">Offer Received 🎉</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Next Round">Next Round Scheduled</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] text-slate-400 font-semibold">Follow-up Notes / Interview Questions</label>
                      <textarea
                        placeholder="Log what questions were asked or how you want to follow up..."
                        value={followUpNotes}
                        onChange={(e) => setFollowUpNotes(e.target.value)}
                        rows={4}
                        className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-white/5">
                    {/* Share Experience Trigger Button */}
                    <Button
                      onClick={() => {
                        setIsDetailsOpen(false)
                        setIsShareOpen(true)
                      }}
                      type="button"
                      variant="outline"
                      className="w-full border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 font-semibold text-xs py-2 flex items-center justify-center gap-1.5"
                    >
                      <Share2 className="h-4 w-4" />
                      Share experience to community
                    </Button>

                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsDetailsOpen(false)}
                        className="text-slate-400 hover:text-white text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveOutcomes}
                        disabled={detailsSubmitting}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs px-4"
                      >
                        {detailsSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Updates'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SHARE COMMUNITY EXPERIENCE MODAL */}
      <AnimatePresence>
        {isShareOpen && selectedInterview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsShareOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-950 border border-white/10 w-full max-w-xl rounded-2xl p-6 shadow-2xl z-50 text-slate-100 flex flex-col gap-4 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-gradient-to-bl from-blue-500/5 to-purple-500/5 rounded-full blur-[40px] pointer-events-none" />

              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="text-md font-extrabold text-white flex items-center gap-2">
                  <Share2 className="h-4.5 w-4.5 text-blue-500" />
                  Share Interview Experience
                </h3>
                <button onClick={() => setIsShareOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="bg-blue-500/5 border border-blue-500/10 p-3 rounded-lg text-[11px] text-blue-400 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400 shrink-0" />
                <span>Sharing your experience helps other students prepare. You can toggle anonymity below.</span>
              </div>

              <form onSubmit={handleShareExperience} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Company</label>
                    <input
                      type="text"
                      disabled
                      value={selectedInterview.company}
                      className="w-full bg-slate-900/50 border border-white/5 rounded-lg p-2.5 text-slate-400 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Role</label>
                    <input
                      type="text"
                      disabled
                      value={selectedInterview.role}
                      className="w-full bg-slate-900/50 border border-white/5 rounded-lg p-2.5 text-slate-400 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Interview Process / Timeline *</label>
                  <textarea
                    required
                    placeholder="Describe the rounds (e.g. 1 coding test, 2 technical video calls, took 2 weeks)..."
                    value={shareProcess}
                    onChange={(e) => setShareProcess(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Questions Asked *</label>
                  <textarea
                    required
                    placeholder="What questions did they ask you? Include coding problems, tech questions, or HR queries..."
                    value={shareQuestions}
                    onChange={(e) => setShareQuestions(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Difficulty *</label>
                    <select
                      value={shareDifficulty}
                      onChange={(e) => setShareDifficulty(e.target.value as any)}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Outcome *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Offered / Rejected / Pending"
                      value={shareOutcome}
                      onChange={(e) => setShareOutcome(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Preparation Tips (Optional)</label>
                  <textarea
                    placeholder="Any advice for other students? Links to resources, topics to focus on..."
                    value={shareTips}
                    onChange={(e) => setShareTips(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors resize-none"
                  />
                </div>

                <div className="flex flex-wrap gap-6 items-center py-2 border-t border-b border-white/5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={shareAnonymous}
                      onChange={(e) => setShareAnonymous(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-0 focus:ring-offset-0 h-4 w-4 cursor-pointer"
                    />
                    <span>Post anonymously</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={sharePublic}
                      onChange={(e) => setSharePublic(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-0 focus:ring-offset-0 h-4 w-4 cursor-pointer"
                    />
                    <span>Visible to Community</span>
                  </label>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsShareOpen(false)
                      setIsDetailsOpen(true)
                    }}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={shareSubmitting}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs px-4"
                  >
                    {shareSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Experience'}
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
