import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Sparkles,
  ClipboardList,
  CheckCircle2,
  Calendar,
  TrendingUp,
  FileCode,
  ArrowUpRight,
  Plus,
  Terminal,
  Activity,
  Bookmark,
  MapPin,
  Clock,
  Briefcase,
  UserCheck,
  Building,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CommandTrigger } from '@/components/dashboard/command-trigger'
import { Badge } from '@/components/ui/badge'
import { internshipApiService } from '@/lib/services/internship-api'
import { RecentlyViewedJobs } from '@/components/dashboard/recently-viewed'

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

  const { data: skillProfile } = await supabase
    .from('skill_profile')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const firstName = profile?.full_name?.split(' ')[0] || 'Candidate'

  // Query resumes, documents, followed companies, applications
  const { data: resumes } = await supabase.from('resumes').select('*').eq('user_id', user.id)
  const { data: documents } = await supabase.from('documents').select('*').eq('user_id', user.id)
  const { data: follows } = await supabase.from('company_follows').select('*').eq('user_id', user.id)
  const { data: applications } = await supabase
    .from('applications')
    .select('*, internships(*)')
    .eq('user_id', user.id)

  // Calculate Resume/Profile completion rate
  const profileComplete = (profile?.full_name && profile?.university) ? 20 : 0
  const skillsComplete = (skillProfile?.skills && skillProfile.skills.length > 0) ? 20 : 0
  const rolesComplete = (skillProfile?.preferred_roles && skillProfile.preferred_roles.length > 0) ? 20 : 0
  const resumesComplete = (resumes && resumes.length > 0) ? 20 : 0
  const docsComplete = (documents && documents.length > 0) ? 20 : 0
  const completionRate = profileComplete + skillsComplete + rolesComplete + resumesComplete + docsComplete

  // Calculate applications this week
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const appsThisWeek = applications?.filter(app => new Date(app.applied_date) >= oneWeekAgo).length || 0

  // Fetch Live opportunities & run matching engine on server
  let liveJobs = await internshipApiService.search()
  
  // Server-side Match Score calculations
  const calculateMatch = (job: any) => {
    const skills = skillProfile?.skills || profile?.skills || []
    const preferredRoles = skillProfile?.preferred_roles || profile?.preferred_roles || []
    const preferredLocations = skillProfile?.preferred_locations || profile?.preferred_locations || []
    const remotePref = skillProfile?.remote_preference || 'any'
    const techStack = skillProfile?.preferred_tech_stack || []

    const jobSkills = job.skills.map((s: string) => s.toLowerCase())
    const userSkillsLower = skills.map((s: string) => s.toLowerCase())
    const techStackLower = techStack.map((t: string) => t.toLowerCase())

    let score = 40

    const reasons: string[] = []

    if (job.skills.length > 0) {
      const matched = job.skills.filter((s: string) => userSkillsLower.includes(s.toLowerCase()))
      const skillMatchPct = matched.length / job.skills.length
      score += Math.round(skillMatchPct * 25)
      if (matched.length > 0) reasons.push(`Matches your skills (${matched.slice(0, 1).join(', ')})`)
    }

    if (techStack.length > 0 && job.skills.length > 0) {
      const matchedStack = job.skills.filter((s: string) => techStackLower.includes(s.toLowerCase()))
      if (matchedStack.length > 0) {
        score += 15
        reasons.push('Fits preferred tech stack')
      }
    }

    const roleLower = job.role.toLowerCase()
    for (const r of preferredRoles) {
      if (roleLower.includes(r.toLowerCase())) {
        score += 15
        reasons.push(`Direct fit for ${r} role`)
        break
      }
    }

    const jobLoc = (job.location || '').toLowerCase()
    const isJobRemote = job.location_type === 'remote' || jobLoc.includes('remote')
    if (remotePref === 'remote' && isJobRemote) {
      score += 15
      reasons.push('Matches remote work preference')
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      reasons
    }
  }

  // Scored active roles
  const scoredJobs = liveJobs.map(job => {
    const match = calculateMatch(job)
    return { job, ...match }
  }).sort((a, b) => b.score - a.score)

  const topMatch = scoredJobs[0]
  const recommendedJobs = scoredJobs.slice(0, 3)

  // Upcoming Deadlines (with actual dates)
  const upcomingDeadlines = liveJobs
    .filter(job => job.application_deadline && new Date(job.application_deadline) > new Date())
    .sort((a,b) => new Date(a.application_deadline!).getTime() - new Date(b.application_deadline!).getTime())
    .slice(0, 3)

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      {/* Welcome Card Banner */}
      <Card className="relative overflow-hidden bg-slate-950 border-white/10 p-8 md:p-10 backdrop-blur-md">
        <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-gradient-to-bl from-blue-500/10 to-purple-500/10 rounded-full blur-[90px] pointer-events-none" />
        
        <div className="max-w-3xl relative z-10 flex flex-col gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono w-fit">
            <Sparkles className="h-4.5 w-4.5 animate-pulse" />
            Career Intelligence Portal
          </div>
          
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Welcome back, {firstName}.
          </h2>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            Audit your resume vault, examine skill gap suitability scores, followed company trackers, and automate your application pipelines.
          </p>

          <div className="flex flex-wrap gap-4 mt-6">
            <Link href="/dashboard/internships">
              <Button size="default" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-sm rounded-lg px-5 py-2.5 flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Discover Opportunities
              </Button>
            </Link>
            <CommandTrigger />
          </div>
        </div>
      </Card>

      {/* Stats Matrix Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Resume Completion */}
        <Card className="bg-slate-900/40 border-white/5 p-6 flex items-center justify-between gap-6 backdrop-blur-md relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="space-y-1.5">
            <span className="text-xs uppercase font-bold tracking-widest text-slate-500">Vault Completion</span>
            <h3 className="text-3xl font-extrabold text-white font-mono">{completionRate}%</h3>
            <p className="text-xs text-slate-500 mt-1">Profile completeness rank</p>
          </div>
          {/* Circular progress SVG */}
          <div className="relative h-16 w-16 shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="28" className="stroke-slate-800 fill-transparent" strokeWidth="4" />
              <circle cx="32" cy="32" r="28" className="stroke-blue-500 fill-transparent transition-all duration-500" strokeWidth="4" 
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - completionRate / 100)}`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-350 font-mono font-bold">{completionRate}%</span>
          </div>
        </Card>

        {/* Apps This Week */}
        <Card className="bg-slate-900/40 border-white/5 p-6 flex flex-col justify-between gap-4 backdrop-blur-md relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase font-bold tracking-widest text-slate-500">Apps This Week</span>
            <span className="p-1.5 bg-white/5 rounded-lg text-blue-400"><Activity className="h-5 w-5" /></span>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-white font-mono">{appsThisWeek}</h3>
            <p className="text-xs text-slate-500">Processes tracked in last 7d</p>
          </div>
        </Card>

        {/* Followed Companies */}
        <Card className="bg-slate-900/40 border-white/5 p-6 flex flex-col justify-between gap-4 backdrop-blur-md relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase font-bold tracking-widest text-slate-500">Following</span>
            <span className="p-1.5 bg-white/5 rounded-lg text-pink-400"><Building className="h-5 w-5" /></span>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-white font-mono">{follows?.length || 0}</h3>
            <p className="text-xs text-slate-500">Monitored corporate registries</p>
          </div>
        </Card>

        {/* Total Bookmarks */}
        <Card className="bg-slate-900/40 border-white/5 p-6 flex flex-col justify-between gap-4 backdrop-blur-md relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase font-bold tracking-widest text-slate-500">Bookmarks</span>
            <span className="p-1.5 bg-white/5 rounded-lg text-purple-400"><Bookmark className="h-5 w-5" /></span>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-white font-mono">{applications?.filter(a => a.status === 'Saved').length || 0}</h3>
            <p className="text-xs text-slate-500">Saved items in catalog</p>
          </div>
        </Card>
      </div>

      {/* Main Content Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Left Column (spans 2) */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Top Match Today */}
          {topMatch && (
            <Card className="bg-slate-900/30 border border-blue-500/10 p-8 backdrop-blur-md relative overflow-hidden group hover:border-blue-500/20 transition-all duration-300">
              <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-full blur-[70px] pointer-events-none" />
              
              <div className="flex justify-between items-start gap-6">
                <div className="space-y-5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono uppercase font-bold tracking-wide">
                    <Sparkles className="h-3.5 w-3.5" /> Top Match Today
                  </div>
                  
                  <div>
                    <h3 className="text-xl md:text-3xl font-extrabold text-white line-clamp-1">{topMatch.job.role}</h3>
                    <p className="text-sm md:text-base text-slate-400 font-medium mt-1.5">{topMatch.job.company_name} • {topMatch.job.location}</p>
                  </div>

                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {topMatch.reasons.map((r, idx) => (
                      <span key={idx} className="text-xs text-slate-300 font-mono bg-slate-950 px-3 py-1 rounded border border-white/5">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center shrink-0">
                  <span className="text-4xl font-extrabold text-emerald-400 font-mono">{topMatch.score}%</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 mt-1.5">Match Rating</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
                <Link href="/dashboard/internships">
                  <Button size="default" className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5">
                    Audit Suitability <ArrowUpRight className="ml-1.5 h-4.5 w-4.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          {/* Recommended Opportunities */}
          <Card className="bg-slate-900/30 border-white/5 p-8 backdrop-blur-md">
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-3">
              <h3 className="font-extrabold text-base text-slate-200 flex items-center gap-2.5">
                <Sparkles className="h-5.5 w-5.5 text-blue-500" /> Recommended For You
              </h3>
              <Link href="/dashboard/internships" className="text-xs text-blue-400 hover:underline">
                View All
              </Link>
            </div>

            {recommendedJobs.length === 0 ? (
              <div className="text-center py-10 text-sm text-slate-500">
                Setup your Career Profile settings to load matches.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {recommendedJobs.map(({ job, score }) => {
                  const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                    job.company_name
                  )}&backgroundColor=0f172a,1e293b,334155`

                  return (
                    <div 
                      key={job.id} 
                      className="bg-slate-950/40 border border-white/5 p-5 rounded-xl flex flex-col justify-between hover:border-white/10 transition-colors h-full gap-4"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="h-8.5 w-8.5 rounded overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                            <img src={job.company_logo || defaultAvatar} alt="Logo" className="h-full w-full object-cover" />
                          </div>
                          <Badge className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono">
                            {score}% Match
                          </Badge>
                        </div>
                        
                        <div>
                          <p className="font-bold text-sm text-white line-clamp-1">{job.role}</p>
                          <p className="text-xs text-slate-400 truncate mt-1">{job.company_name}</p>
                          <p className="text-xs text-slate-500 font-mono mt-1.5 flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location || 'Remote'}</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/5 flex justify-end">
                        <Link href={`/dashboard/company/${encodeURIComponent(job.company_name)}`}>
                          <Button size="icon-sm" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-white">
                            <ArrowUpRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column (spans 1) */}
        <div className="space-y-10">
          
          {/* Followed Companies */}
          <Card className="bg-slate-900/30 border-white/5 p-8 backdrop-blur-md">
            <h3 className="font-extrabold text-base text-slate-200 border-b border-white/5 pb-3 mb-6">
              Companies Followed
            </h3>
            {follows && follows.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">No followed company profiles.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {follows?.map((f) => (
                  <Link 
                    key={f.id} 
                    href={`/dashboard/company/${encodeURIComponent(f.company_name.toLowerCase().replace(/\s+/g, '-'))}`}
                    className="p-3 rounded bg-slate-950/40 border border-white/5 text-center hover:border-white/10 transition-colors text-xs font-bold text-slate-300 block truncate"
                  >
                    {f.company_name}
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Upcoming Deadlines */}
          <Card className="bg-slate-900/30 border-white/5 p-8 backdrop-blur-md">
            <h3 className="font-extrabold text-base text-slate-200 flex items-center gap-2.5 border-b border-white/5 pb-3 mb-6">
              <Clock className="h-5 w-5 text-rose-500" /> Upcoming Deadlines
            </h3>
            {upcomingDeadlines.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center font-medium">No deadlines recorded.</p>
            ) : (
              <div className="space-y-4">
                {upcomingDeadlines.map((job) => {
                  const daysLeft = Math.ceil(
                    (new Date(job.application_deadline!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  )
                  return (
                    <div key={job.id} className="flex justify-between items-center text-sm">
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="font-bold text-slate-200 truncate">{job.role}</p>
                        <p className="text-xs text-slate-400 mt-1">{job.company_name}</p>
                      </div>
                      <Badge className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-mono">
                        {daysLeft <= 0 ? 'Today' : `${daysLeft}d left`}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Recently Viewed */}
          <Card className="bg-slate-900/30 border-white/5 p-8 backdrop-blur-md">
            <h3 className="font-extrabold text-base text-slate-200 border-b border-white/5 pb-3 mb-6">
              Recently Viewed
            </h3>
            <RecentlyViewedJobs />
          </Card>

        </div>

      </div>
    </div>
  )
}
