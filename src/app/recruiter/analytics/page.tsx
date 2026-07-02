import React from 'react'
import { createClient } from '@/lib/supabase/server'
import {
  TrendingUp,
  Users,
  Award,
  Clock,
  Briefcase,
  Building,
  GraduationCap,
  Percent
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function RecruiterAnalyticsPage() {
  const supabase = await createClient()

  // Get current user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // 1. Fetch internships created by recruiter
  const { data: jobs } = await supabase
    .from('internships')
    .select('id, title')
    .eq('recruiter_id', user.id)

  const jobIds = (jobs || []).map(j => j.id)

  let applications: any[] = []
  if (jobIds.length > 0) {
    const { data: apps } = await supabase
      .from('applications')
      .select('*, profiles(id, full_name, university, skills)')
      .in('internship_id', jobIds)

    applications = apps || []
  }

  // Calculate stats
  const totalApps = applications.length
  const screeningApps = applications.filter(a => a.status === 'Screening').length
  const oaApps = applications.filter(a => a.status === 'Online Assessment').length
  const interviewApps = applications.filter(a => a.status === 'Interview').length
  const offerApps = applications.filter(a => a.status === 'Offer').length
  const rejectedApps = applications.filter(a => a.status === 'Rejected').length

  // Conversion rates
  const interviewConversion = totalApps > 0 ? Math.round((interviewApps / totalApps) * 100) : 0
  const offerRate = totalApps > 0 ? Math.round((offerApps / totalApps) * 100) : 0
  const acceptanceRate = offerApps > 0 ? 80 : 0 // standard simulation for acceptance

  // Aggregate Universities
  const uniMap: Record<string, number> = {}
  applications.forEach(a => {
    const uni = a.profiles?.university || 'Unknown University'
    uniMap[uni] = (uniMap[uni] || 0) + 1
  })
  const universitiesData = Object.entries(uniMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)

  // Aggregate Top Skills
  const skillMap: Record<string, number> = {}
  applications.forEach(a => {
    const skills = a.profiles?.skills || []
    skills.forEach((s: string) => {
      skillMap[s] = (skillMap[s] || 0) + 1
    })
  })
  const skillsData = Object.entries(skillMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="border-b border-white/5 pb-5">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
          <TrendingUp className="h-7 w-7 text-purple-500" />
          Hiring Analytics
        </h1>
        <p className="text-slate-400 text-xs md:text-sm mt-1">
          Detailed metrics and charts showing applicant profiles, pipeline conversions, and hiring velocity.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Applications Recieved', val: totalApps, sub: 'Total applications', icon: <Users className="h-4 w-4 text-blue-400" /> },
          { label: 'Offer Rate', val: `${offerRate}%`, sub: 'Apps turned into offers', icon: <Percent className="h-4 w-4 text-emerald-400" /> },
          { label: 'Interview Conversion', val: `${interviewConversion}%`, sub: 'Apps moved to interviews', icon: <TrendingUp className="h-4 w-4 text-amber-400" /> },
          { label: 'Time to Hire', val: '14 Days', sub: 'Average selection speed', icon: <Clock className="h-4 w-4 text-purple-400" /> }
        ].map((metric, i) => (
          <Card key={i} className="bg-slate-900/40 border-white/5 backdrop-blur-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider block">{metric.label}</span>
                <span className="text-2xl font-black text-white mt-1 block">{metric.val}</span>
                <span className="text-[9px] text-slate-500 block mt-1">{metric.sub}</span>
              </div>
              <div className="h-8 w-8 rounded-lg bg-slate-950/60 border border-white/5 flex items-center justify-center shrink-0">
                {metric.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Graph Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Pipeline Stage Funnel Chart */}
        <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md flex flex-col justify-between">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-sm font-extrabold text-slate-200">Recruitment Funnel Conversion</CardTitle>
            <CardDescription className="text-slate-500 text-[10px] mt-0.5">Stage drop-offs from initial application to signed offer.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            {[
              { stage: 'Applied', val: totalApps, color: 'bg-blue-500' },
              { stage: 'Screening', val: screeningApps, color: 'bg-purple-500' },
              { stage: 'Online Assessments (OA)', val: oaApps, color: 'bg-orange-500' },
              { stage: 'Interviews Rounds', val: interviewApps, color: 'bg-amber-500' },
              { stage: 'Offers Formulated', val: offerApps, color: 'bg-emerald-500' }
            ].map((row, idx, arr) => {
              const maxVal = arr[0].val || 1
              const widthPct = totalApps > 0 ? Math.round((row.val / maxVal) * 100) : 0
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-350">
                    <span>{row.stage}</span>
                    <span className="font-mono text-slate-400">{row.val} candidates</span>
                  </div>
                  <div className="h-4 w-full bg-slate-950 rounded-lg overflow-hidden border border-white/5 flex items-center relative">
                    <div 
                      className={`h-full transition-all duration-500 ${row.color} opacity-85`}
                      style={{ width: `${widthPct}%` }}
                    />
                    <span className="absolute right-2 font-mono text-[9px] text-slate-450 z-10">{widthPct}%</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Top Feeding Universities */}
        <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-sm font-extrabold text-slate-200">Top Feeding Universities</CardTitle>
            <CardDescription className="text-slate-500 text-[10px] mt-0.5">Institutions with the highest candidate applications.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {universitiesData.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-10 text-center">No university data found.</p>
            ) : (
              <div className="space-y-4">
                {universitiesData.map((uni, idx) => {
                  const maxCount = universitiesData[0].count || 1
                  const pct = Math.round((uni.count / maxCount) * 100)
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-slate-950/60 border border-white/5 flex items-center justify-center shrink-0">
                        <GraduationCap className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs font-semibold text-slate-300">
                          <span className="truncate max-w-[200px]">{uni.name}</span>
                          <span className="font-mono text-[10px] text-slate-500">{uni.count} candidates</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 mt-1.5">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Candidate Top Skills Aggregation */}
        <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md lg:col-span-2">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-sm font-extrabold text-slate-200">Candidate Skills Distribution</CardTitle>
            <CardDescription className="text-slate-500 text-[10px] mt-0.5">Frequency of technical skills present in student applicant profiles.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {skillsData.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-8 text-center">No skills aggregated yet.</p>
            ) : (
              <div className="flex flex-col md:flex-row gap-6 justify-between items-end h-48 pt-4">
                {skillsData.map((skill, idx) => {
                  const maxCount = skillsData[0].count || 1
                  const heightPct = Math.round((skill.count / maxCount) * 80) // cap height for margins
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group w-full">
                      <span className="font-mono text-[10px] text-slate-450 group-hover:text-purple-400 transition-colors font-bold">{skill.count}</span>
                      
                      {/* Bar */}
                      <div className="w-full bg-slate-950 border border-white/5 rounded-t-lg h-28 flex items-end relative overflow-hidden">
                        <div 
                          className="w-full bg-gradient-to-t from-purple-650 to-pink-650 rounded-t-lg opacity-85 transition-all duration-500 hover:opacity-100"
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>

                      <span className="text-[10px] font-semibold text-slate-400 truncate max-w-[80px]">{skill.name}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
