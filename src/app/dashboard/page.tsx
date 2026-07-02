import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Sparkles,
  Calendar,
  Video,
  CheckCircle2,
  Code,
  Target,
  Trophy,
  HelpCircle,
  Clock,
  Briefcase,
  MapPin,
  ExternalLink,
  ChevronRight,
  Plus,
  Compass,
  ArrowUpRight,
  TrendingUp,
  Award,
  Users,
  BookOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DashboardSyncButton } from '@/components/dashboard/dashboard-sync-button'

// Achievement templates
const BADGES = [
  { type: 'Profile Complete', icon: '👤', title: 'Profile Complete' },
  { type: 'Resume Uploaded', icon: '📄', title: 'Resume Uploaded' },
  { type: 'First Application', icon: '🚀', title: 'First Application' },
  { type: '10 Applications', icon: '💼', title: 'Pipeline Builder' },
  { type: 'First Interview', icon: '🎤', title: 'First Interview' },
  { type: 'Interview Ready', icon: '🎯', title: 'Interview Ready' },
  { type: 'First Offer', icon: '🏆', title: 'First Offer' }
]

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Get current user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Fetch profile details
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] || 'Candidate'

  // Query Google OAuth token for sync button
  const { data: oauthToken } = await supabase
    .from('oauth_tokens')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  const isGoogleConnected = !!oauthToken

  // 1. Query Upcoming Interviews
  const { data: upcomingInterviews } = await supabase
    .from('interviews')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'Upcoming')
    .order('interview_date', { ascending: true })
    .limit(3)

  // 2. Query Preparation Checklist Progress
  // We fetch checklists and group them by interview to compute percentage completion
  const { data: checklists } = await supabase
    .from('checklists')
    .select('*, interviews(company, role, round)')
    .eq('user_id', user.id)

  const prepProgressMap: Record<string, { company: string, role: string, round: string, total: number, completed: number }> = {}
  checklists?.forEach((item: any) => {
    if (!item.interviews) return
    const id = item.interview_id
    if (!prepProgressMap[id]) {
      prepProgressMap[id] = {
        company: item.interviews.company,
        role: item.interviews.role,
        round: item.interviews.round,
        total: 0,
        completed: 0
      }
    }
    prepProgressMap[id].total += 1
    if (item.completed) {
      prepProgressMap[id].completed += 1
    }
  })
  const prepProgressList = Object.entries(prepProgressMap).map(([id, info]) => ({
    id,
    ...info,
    pct: info.total > 0 ? Math.round((info.completed / info.total) * 100) : 0
  })).slice(0, 3)

  // 3. Query Skill Progress (React, Next.js, Java, Python, DSA, SQL, Docker, Git)
  const { data: skills } = await supabase
    .from('skills')
    .select('*')
    .eq('user_id', user.id)
    .order('progress', { ascending: false })
    .limit(4)

  // 4. Query Career Goals
  const { data: goals } = await supabase
    .from('career_goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(3)

  // 5. Query Recent Interview Experiences from Community Feed
  const { data: recentExperiences } = await supabase
    .from('interview_experiences')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(3)

  // 6. Query Unlocked Achievements
  const { data: userAchievements } = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', user.id)

  const unlockedTypes = new Set((userAchievements || []).map(a => a.badge_type))

  // 7. Query Question Bank Summary (Count categories)
  const { data: questions } = await supabase
    .from('interview_questions')
    .select('category')
    .eq('user_id', user.id)

  const questionStats = {
    total: questions?.length || 0,
    technical: questions?.filter(q => q.category === 'Technical' || q.category === 'Coding').length || 0,
    systemDesign: questions?.filter(q => q.category === 'System Design').length || 0,
    behavioral: questions?.filter(q => q.category === 'Behavioral' || q.category === 'HR').length || 0
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Welcome Card Banner */}
      <Card className="relative overflow-hidden bg-slate-950 border-white/10 p-6 md:p-8 backdrop-blur-md">
        <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-gradient-to-bl from-blue-500/10 to-purple-500/10 rounded-full blur-[90px] pointer-events-none" />
        
        <div className="max-w-3xl relative z-10 flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono w-fit">
            <Sparkles className="h-4 w-4 animate-pulse" />
            Interview Preparation Dashboard
          </div>
          
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Welcome back, {firstName}.
          </h2>
          <p className="text-slate-350 text-xs md:text-sm leading-relaxed max-w-xl">
            Track your scheduled interviews, catalog core coding questions, configure your readiness metrics, and review community interview profiles.
          </p>

          <div className="flex flex-wrap gap-3 mt-4">
            <Link href="/dashboard/interviews">
              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-xs rounded-lg px-4 py-2 flex items-center gap-1.5 h-9">
                <Video className="h-4 w-4" />
                Interviews Console
              </Button>
            </Link>
            <Link href="/dashboard/questions">
              <Button size="sm" className="bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-300 font-semibold text-xs rounded-lg px-4 py-2 flex items-center gap-1.5 h-9">
                <BookOpen className="h-4 w-4" />
                Review Questions
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Sync Status Header */}
      <DashboardSyncButton isGoogleConnected={isGoogleConnected} />

      {/* Main Content Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (spans 2) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Upcoming Interviews Widget */}
          <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
              <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-blue-500" /> Upcoming Interviews
              </h3>
              <Link href="/dashboard/interviews" className="text-[11px] text-blue-400 hover:underline font-semibold flex items-center">
                Manage Hub <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {!upcomingInterviews || upcomingInterviews.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center font-medium">
                No interviews scheduled. Go to the Interview Hub to schedule one.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingInterviews.map((evt) => {
                  const dateStr = new Date(evt.interview_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                  const timeStr = new Date(evt.interview_date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                  return (
                    <div key={evt.id} className="p-3 bg-slate-950/40 border border-white/5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-[13px]">{evt.company}</span>
                          <Badge className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-mono uppercase">
                            {evt.round}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">{evt.role}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 font-mono text-[10px] text-slate-400">
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-blue-400" /> {dateStr} at {timeStr}</span>
                        {evt.meeting_link && (
                          <a href={evt.meeting_link} target="_blank" rel="noopener noreferrer" className="text-blue-450 hover:underline flex items-center gap-0.5">
                            Join <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Preparation Progress Widget */}
          <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
              <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" /> Preparation Progress
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Checklists Tracker</span>
            </div>

            {prepProgressList.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center font-medium">
                No active checklists. Add checklist items inside scheduled interviews.
              </p>
            ) : (
              <div className="space-y-4">
                {prepProgressList.map((item) => (
                  <div key={item.id} className="space-y-2">
                    <div className="flex justify-between text-xs items-center">
                      <div>
                        <span className="font-bold text-slate-200">{item.company}</span>
                        <span className="text-[10px] text-slate-550 ml-2">({item.round})</span>
                      </div>
                      <span className="font-mono text-slate-400 text-[10px]">{item.completed}/{item.total} Done ({item.pct}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-300"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Skill Progress Widget */}
          <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
              <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                <Code className="h-4.5 w-4.5 text-blue-400" /> Language & Stack Proficiencies
              </h3>
              <Link href="/dashboard/skills" className="text-[11px] text-blue-400 hover:underline font-semibold flex items-center">
                Skills Console <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {!skills || skills.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center font-medium">
                No skills tracking initiated.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {skills.map((skill) => (
                  <div key={skill.id} className="p-3 bg-slate-950/40 border border-white/5 rounded-xl space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-350">{skill.skill_name}</span>
                      <span className="font-mono text-[10px] text-slate-400">{skill.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${skill.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>

        {/* Right Column (spans 1) */}
        <div className="space-y-8">
          
          {/* Question Bank Summary Widget */}
          <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
              <HelpCircle className="h-4.5 w-4.5 text-amber-500" /> Question Bank Summary
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                <div className="text-left">
                  <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Total Questions</span>
                  <span className="block text-2xl font-black text-white mt-0.5">{questionStats.total}</span>
                </div>
                <Link href="/dashboard/questions">
                  <Button size="sm" className="bg-slate-900 border border-white/5 text-slate-350 text-[10px] font-bold py-1 px-3.5 h-8">
                    View Bank
                  </Button>
                </Link>
              </div>

              <div className="space-y-2.5 text-xs text-slate-450">
                <div className="flex justify-between">
                  <span>Technical & Coding</span>
                  <span className="font-mono text-slate-300 font-bold">{questionStats.technical}</span>
                </div>
                <div className="flex justify-between">
                  <span>System Design</span>
                  <span className="font-mono text-slate-300 font-bold">{questionStats.systemDesign}</span>
                </div>
                <div className="flex justify-between">
                  <span>HR & Behavioral</span>
                  <span className="font-mono text-slate-300 font-bold">{questionStats.behavioral}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Career Goals Widget */}
          <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
              <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                <Target className="h-4.5 w-4.5 text-purple-400" /> Career Goals
              </h3>
              <Link href="/dashboard/skills" className="text-[11px] text-blue-400 hover:underline font-semibold">
                Manage
              </Link>
            </div>
            
            {!goals || goals.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">No career goals set.</p>
            ) : (
              <div className="space-y-3.5">
                {goals.map((g) => {
                  const pct = Math.min(100, Math.round((g.current_value / g.target_value) * 100))
                  return (
                    <div key={g.id} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-bold truncate max-w-[150px]">{g.title}</span>
                        <span className="font-mono text-[9px] text-slate-500">{g.current_value}/{g.target_value}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${g.is_completed ? 'bg-emerald-500' : 'bg-purple-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Achievements Cabinet Widget */}
          <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
              <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                <Trophy className="h-4.5 w-4.5 text-yellow-500" /> Trophy Cabinet
              </h3>
              <Badge className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/25 text-[8px] font-mono py-0 scale-90">
                {userAchievements?.length || 0} Unlocked
              </Badge>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {BADGES.map((b) => {
                const isUnlocked = unlockedTypes.has(b.type)
                return (
                  <div 
                    key={b.type} 
                    title={`${b.title} (${isUnlocked ? 'Unlocked' : 'Locked'})`}
                    className={`h-11 rounded-lg flex items-center justify-center text-lg relative ${
                      isUnlocked 
                        ? 'bg-slate-950 border border-white/10 shadow shadow-yellow-500/5' 
                        : 'bg-slate-950/20 border border-white/5 opacity-30'
                    }`}
                  >
                    {b.icon}
                    {isUnlocked && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 bg-emerald-500 rounded-full" />
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Recent Experiences Widget */}
          <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
              <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-purple-400" /> Recent Experiences
              </h3>
              <Link href="/community/interviews" className="text-[11px] text-blue-400 hover:underline font-semibold">
                Feed
              </Link>
            </div>

            {!recentExperiences || recentExperiences.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center font-medium">No experience reviews shared.</p>
            ) : (
              <div className="space-y-3">
                {recentExperiences.map((exp) => (
                  <div key={exp.id} className="p-2.5 bg-slate-950/40 border border-white/5 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-start font-bold text-slate-200">
                      <span>{exp.company}</span>
                      <span className="text-[8px] font-mono text-slate-500">
                        {exp.difficulty}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-450 truncate pr-1">{exp.role} ({exp.outcome})</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>

      </div>
    </div>
  )
}
