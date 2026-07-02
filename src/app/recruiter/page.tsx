import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Briefcase,
  Users,
  Calendar,
  ChevronRight,
  Plus,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Award,
  CheckCircle,
  Video
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function RecruiterDashboard() {
  const supabase = await createClient()

  // Get current user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // 1. Fetch Recruiter & Company ID
  const { data: recruiter } = await supabase
    .from('recruiters')
    .select('*, companies(*)')
    .eq('id', user.id)
    .single()

  const companyId = recruiter.company_id
  const companyName = recruiter.companies?.name || 'Unnamed Company'

  // 2. Fetch Recruiter's Internships
  const { data: internships } = await supabase
    .from('internships')
    .select('id, title, status')
    .eq('recruiter_id', user.id)

  const activeJobsCount = internships?.filter(i => i.status === 'Published').length || 0

  // 3. Fetch Applications to Recruiter's Internships
  const jobIds = (internships || []).map(i => i.id)

  let applications: any[] = []
  if (jobIds.length > 0) {
    const { data: apps } = await supabase
      .from('applications')
      .select('*, internships(title), profiles(full_name, university, skills)')
      .in('internship_id', jobIds)
      .order('applied_date', { ascending: false })
    
    applications = apps || []
  }

  // 4. Fetch Upcoming Interviews scheduled by recruiter
  let scheduledInterviews: any[] = []
  if (jobIds.length > 0) {
    const { data: ivs } = await supabase
      .from('interviews')
      .select('*, profiles(full_name)')
      .eq('status', 'Upcoming')
      .order('interview_date', { ascending: true })
      .limit(4)
    
    scheduledInterviews = ivs || []
  }

  // Compute Pipeline Stages counts
  const stageCounts = {
    Applied: applications.filter(a => a.status === 'Applied').length,
    Screening: applications.filter(a => a.status === 'Screening').length,
    OA: applications.filter(a => a.status === 'Online Assessment').length,
    Interview: applications.filter(a => a.status === 'Interview').length,
    Offer: applications.filter(a => a.status === 'Offer').length,
    Rejected: applications.filter(a => a.status === 'Rejected').length
  }

  const recentApps = applications.slice(0, 4)

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header card banner */}
      <Card className="relative overflow-hidden bg-slate-950 border-white/10 p-6 md:p-8 backdrop-blur-md">
        <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-gradient-to-bl from-purple-500/10 to-pink-500/10 rounded-full blur-[90px] pointer-events-none" />
        
        <div className="max-w-3xl relative z-10 flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono w-fit">
            <TrendingUp className="h-4 w-4 animate-pulse" />
            Recruiter Command Console
          </div>
          
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Manage your hiring at {companyName}.
          </h2>
          <p className="text-slate-350 text-xs md:text-sm leading-relaxed max-w-xl">
            Create listings, evaluate student submissions using match scores, schedule candidate interviews, and chat in real-time.
          </p>

          <div className="flex flex-wrap gap-3 mt-4">
            <Link href="/recruiter/internships">
              <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-650 hover:from-purple-500 hover:to-pink-550 text-white font-semibold text-xs rounded-lg px-4 py-2 flex items-center gap-1.5 h-9">
                <Plus className="h-4 w-4" />
                Post Internship
              </Button>
            </Link>
            <Link href="/recruiter/applicants">
              <Button size="sm" className="bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-300 font-semibold text-xs rounded-lg px-4 py-2 flex items-center gap-1.5 h-9">
                <Users className="h-4 w-4" />
                Applicants Board
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Published Openings', val: activeJobsCount, col: 'text-purple-400', icon: <Briefcase className="h-4 w-4 text-purple-400" /> },
          { label: 'Total Candidates', val: applications.length, col: 'text-blue-400', icon: <Users className="h-4 w-4 text-blue-400" /> },
          { label: 'Interviewing', val: stageCounts.Interview, col: 'text-amber-400', icon: <Video className="h-4 w-4 text-amber-400" /> },
          { label: 'Offers Extended', val: stageCounts.Offer, col: 'text-emerald-400', icon: <CheckCircle className="h-4 w-4 text-emerald-400" /> }
        ].map((stat, i) => (
          <Card key={i} className="bg-slate-900/40 border-white/5 backdrop-blur-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">{stat.label}</span>
                <span className={`text-2xl font-black mt-1 block ${stat.col}`}>{stat.val}</span>
              </div>
              <div className="h-8 w-8 rounded-lg bg-slate-950/60 border border-white/5 flex items-center justify-center shrink-0">
                {stat.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grid panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column (spans 2) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Recent Applicants */}
          <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
              <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-blue-500" /> Recent Applicants
              </h3>
              <Link href="/recruiter/applicants" className="text-[11px] text-blue-400 hover:underline font-semibold flex items-center">
                All Applicants <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {recentApps.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-8 text-center">No internship applications received yet.</p>
            ) : (
              <div className="space-y-3.5">
                {recentApps.map((app) => (
                  <div key={app.id} className="p-3.5 bg-slate-950/40 border border-white/5 rounded-xl flex items-center justify-between text-xs gap-3">
                    <div>
                      <span className="block font-bold text-white text-[13px]">{app.profiles?.full_name || 'Student Candidate'}</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">{app.internships?.title} • {app.profiles?.university}</span>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 font-mono text-[10px]">
                      <span className="text-slate-500">Applied {new Date(app.applied_date).toLocaleDateString()}</span>
                      <Badge className="bg-purple-500/10 border border-purple-500/25 text-purple-400 font-bold text-[8px] scale-95 uppercase">
                        {app.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Hiring Pipeline stage counts */}
          <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <h3 className="font-extrabold text-sm text-slate-200 border-b border-white/5 pb-3 mb-4 flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-purple-400" /> Pipeline Stage Statistics
            </h3>

            <div className="space-y-3.5">
              {[
                { stage: 'Applied & Screening', val: stageCounts.Applied + stageCounts.Screening, color: 'bg-blue-500', total: applications.length },
                { stage: 'Online Assessments (OA)', val: stageCounts.OA, color: 'bg-purple-500', total: applications.length },
                { stage: 'Interview Processes', val: stageCounts.Interview, color: 'bg-amber-500', total: applications.length },
                { stage: 'Offers Extended', val: stageCounts.Offer, color: 'bg-emerald-500', total: applications.length },
                { stage: 'Rejections / Withdrawals', val: stageCounts.Rejected, color: 'bg-rose-500', total: applications.length }
              ].map((row, idx) => {
                const pct = row.total > 0 ? Math.round((row.val / row.total) * 100) : 0
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-350">{row.stage}</span>
                      <span className="font-mono text-slate-400 text-[10px]">{row.val} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className={`h-full transition-all duration-300 ${row.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

        </div>

        {/* Right column (spans 1) */}
        <div className="space-y-8">
          
          {/* Upcoming scheduled interviews */}
          <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
              <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-amber-500" /> Upcoming Interviews
              </h3>
              <Link href="/recruiter/interviews" className="text-[11px] text-blue-400 hover:underline font-semibold">
                Calendar
              </Link>
            </div>

            {scheduledInterviews.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center font-medium">No interviews scheduled.</p>
            ) : (
              <div className="space-y-3">
                {scheduledInterviews.map((iv) => (
                  <div key={iv.id} className="p-2.5 bg-slate-950/40 border border-white/5 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-start font-bold text-slate-200">
                      <span>{iv.profiles?.full_name || 'Candidate'}</span>
                      <Badge className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] font-mono uppercase scale-90">
                        {iv.round}
                      </Badge>
                    </div>
                    <p className="text-[9px] text-slate-500 font-mono">
                      {new Date(iv.interview_date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Time to hire stats */}
          <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <h3 className="font-extrabold text-sm text-slate-200 border-b border-white/5 pb-3 mb-4">Hiring Speed</h3>
            <div className="space-y-4">
              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl text-center">
                <span className="text-slate-550 text-[9px] uppercase font-bold tracking-wider block">Average Time-to-Hire</span>
                <span className="text-3xl font-black text-white mt-1 block">14 Days</span>
              </div>
              <p className="text-[10px] text-slate-500 text-center leading-normal">
                Time elapsed from candidate application to formal offer extension.
              </p>
            </div>
          </Card>

        </div>

      </div>
    </div>
  )
}
