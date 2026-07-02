'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCompanyMetadata, CompanyMetadata } from '@/lib/services/companies'
import { internshipApiService } from '@/lib/services/internship-api'
import { Internship, Application } from '@/types/internship'
import {
  Building2,
  Globe,
  MapPin,
  Heart,
  Briefcase,
  ArrowLeft,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  ExternalLink,
  CheckCircle,
  Clock,
  CheckCircle2,
  HelpCircle,
  Plus,
  Loader2,
  Users,
  Award,
  TrendingUp,
  BookOpen,
  ThumbsUp
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface CommunityExperience {
  id: string
  company: string
  role: string
  interview_process: string
  questions_asked: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  outcome: string
  preparation_tips?: string
  is_anonymous: boolean
  views_count: number
  helpful_votes: number
  created_at: string
  profiles?: {
    full_name: string
    university: string
  }
}

export default function CompanyProfilePage() {
  const params = useParams()
  const router = useRouter()
  const rawId = typeof params?.id === 'string' ? params.id : ''
  const companyNameNormalized = decodeURIComponent(rawId).replace(/-/g, ' ')
  
  const [company, setCompany] = useState<CompanyMetadata | null>(null)
  const [openJobs, setOpenJobs] = useState<Internship[]>([])
  const [prevApps, setPrevApps] = useState<Application[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)

  // Expanded Insights States
  const [experiences, setExperiences] = useState<CommunityExperience[]>([])
  const [followersCount, setFollowersCount] = useState(0)
  const [avgDifficulty, setAvgDifficulty] = useState('Medium')
  const [difficultyPct, setDifficultyPct] = useState(50) // 0 to 100
  const [expandedExperienceId, setExpandedExperienceId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (!rawId) return

    const loadCompanyData = async () => {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // 1. Resolve company metadata
        let metadata = getCompanyMetadata(companyNameNormalized)

        let dbCompany: any = null
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId)) {
          const { data: comp } = await supabase
            .from('companies')
            .select('*')
            .eq('id', rawId)
            .maybeSingle()
          dbCompany = comp
        } else {
          const { data: comp } = await supabase
            .from('companies')
            .select('*')
            .ilike('name', companyNameNormalized)
            .maybeSingle()
          dbCompany = comp
        }

        if (dbCompany) {
          metadata = {
            name: dbCompany.name,
            logoUrl: dbCompany.logo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(dbCompany.name)}`,
            website: dbCompany.website,
            about: dbCompany.about || 'Innovative recruiter-partner organization.',
            techStack: dbCompany.tech_stack || [],
            hiringProcess: ['Application screening', 'Skill Assessments', 'Technical Round interviews', 'Offer Formulation'],
            locations: ['Remote', 'India']
          }
        }
        setCompany(metadata)

        // 2. Fetch User Profile for Match Score
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setUserProfile(profile)

        // 3. Check Follow State & count total followers
        const { data: followRecord } = await supabase
          .from('company_follows')
          .select('id')
          .eq('user_id', user.id)
          .ilike('company_name', metadata.name)
          .maybeSingle()
        setIsFollowing(!!followRecord)

        const { count: followers } = await supabase
          .from('company_follows')
          .select('*', { count: 'exact', head: true })
          .ilike('company_name', metadata.name)
        setFollowersCount(followers || 0)

        // 4. Fetch open internships for this company
        const { data: localJobs } = await supabase
          .from('internships')
          .select('*')
          .or(`company_name.ilike.%${metadata.name}%,company_id.eq.${dbCompany ? dbCompany.id : '00000000-0000-0000-0000-000000000000'}`)
          .order('posted_date', { ascending: false })

        let jobs = localJobs || []
        if (jobs.length === 0) {
          const apiJobs = await internshipApiService.search(metadata.name)
          jobs = apiJobs.filter(j => j.company_name.toLowerCase().includes(metadata.name.toLowerCase()))
        }
        setOpenJobs(jobs)

        // 5. Fetch previous applications for this company
        const { data: applications } = await supabase
          .from('applications')
          .select('*, internships(*)')
          .eq('user_id', user.id)

        const filteredApps = (applications || []).filter((app: any) => 
          app.internships?.company_name.toLowerCase().includes(metadata.name.toLowerCase())
        )
        setPrevApps(filteredApps)

        // 6. Fetch Public Interview Experiences
        const { data: reviews } = await supabase
          .from('interview_experiences')
          .select(`
            *,
            profiles (
              full_name,
              university
            )
          `)
          .ilike('company', metadata.name)
          .eq('is_public', true)
          .order('created_at', { ascending: false })

        const reviewsList = reviews || []
        setExperiences(reviewsList)

        // Calculate Average Interview Difficulty
        if (reviewsList.length > 0) {
          let scoreSum = 0
          reviewsList.forEach(r => {
            if (r.difficulty === 'Easy') scoreSum += 33
            else if (r.difficulty === 'Medium') scoreSum += 66
            else scoreSum += 100
          })
          const averageScore = Math.round(scoreSum / reviewsList.length)
          setDifficultyPct(averageScore)
          
          if (averageScore < 45) setAvgDifficulty('Easy')
          else if (averageScore < 75) setAvgDifficulty('Medium')
          else setAvgDifficulty('Hard')
        } else {
          // Default estimation
          setAvgDifficulty('Medium')
          setDifficultyPct(55)
        }

      } catch (err: any) {
        toast.error('Failed to load company details: ' + err.message)
      } finally {
        setLoading(false)
      }
    }

    loadCompanyData()
  }, [rawId])

  const handleFollowToggle = async () => {
    if (!company) return
    setFollowLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthenticated session.')

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('company_follows')
          .delete()
          .eq('user_id', user.id)
          .ilike('company_name', company.name)

        if (error) throw error
        setIsFollowing(false)
        setFollowersCount(prev => Math.max(0, prev - 1))
        toast.success(`You unfollowed ${company.name}`)
      } else {
        // Follow
        const { error } = await supabase
          .from('company_follows')
          .insert({
            user_id: user.id,
            company_name: company.name
          })

        if (error) throw error
        setIsFollowing(true)
        setFollowersCount(prev => prev + 1)
        toast.success(`You are now following ${company.name}`)
        
        // Add follow notification
        await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            title: `Following ${company.name}`,
            body: `You will now receive alerts when new internships are posted at ${company.name}.`,
            type: 'company_post'
          })
      }
    } catch (err: any) {
      toast.error('Error toggling follow: ' + err.message)
    } finally {
      setFollowLoading(false)
    }
  }

  // Frontend match scoring helper
  const calculateMatch = (jobSkills: string[]) => {
    if (!userProfile?.skills || userProfile.skills.length === 0 || jobSkills.length === 0) {
      return { score: 60, has: [], missing: jobSkills }
    }
    const userSkillsLower = userProfile.skills.map((s: string) => s.toLowerCase())
    const has = jobSkills.filter(s => userSkillsLower.includes(s.toLowerCase()))
    const missing = jobSkills.filter(s => !userSkillsLower.includes(s.toLowerCase()))
    
    const pct = Math.round((has.length / jobSkills.length) * 40) + 50 // Base 50%
    return {
      score: Math.min(100, pct),
      has,
      missing
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="text-center py-20">
        <HelpCircle className="h-10 w-10 text-slate-500 mx-auto mb-2" />
        <h3 className="text-lg font-bold text-white">Company not found</h3>
        <Button onClick={() => router.back()} className="mt-4 bg-slate-900 border border-white/5 text-slate-300">
          Go Back
        </Button>
      </div>
    )
  }

  const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    company.name
  )}&backgroundColor=0f172a,1e293b,334155`

  // Aggregate required skills dynamically from open internship postings
  const aggregatedSkills = Array.from(
    new Set(openJobs.flatMap(job => job.skills))
  ).slice(0, 12)

  // Default timeline data based on company
  const hiringTimelineData = [
    { phase: 'Applications Open', period: 'July - August', desc: 'Summer internship roles open for early applications.' },
    { phase: 'Online Assessments', period: 'September', desc: 'Coding tests and technical screenings sent out.' },
    { phase: 'Technical Rounds', period: 'October', desc: 'Video calls focused on core skills, algorithms, and projects.' },
    { phase: 'Final Interviews', period: 'November', desc: 'Hiring manager fitment and final offers extended.' }
  ]

  const difficultyColors: Record<string, string> = {
    Easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
    Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
    Hard: 'text-rose-400 bg-rose-500/10 border-rose-500/25'
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Back Button */}
      <button 
        onClick={() => router.back()} 
        className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-xs font-semibold"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Hero Banner Header */}
      <Card className="relative overflow-hidden bg-slate-900/40 border-white/5 p-6 md:p-8 backdrop-blur-md">
        <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-gradient-to-bl from-blue-500/5 to-purple-500/5 rounded-full blur-[70px] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10 w-full">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl overflow-hidden border border-white/10 bg-slate-950 flex-shrink-0 flex items-center justify-center">
              <img 
                src={company.logoUrl || defaultAvatar} 
                alt={`${company.name} logo`} 
                className="h-full w-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = defaultAvatar }}
              />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{company.name}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1.5">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-slate-500" /> {company.locations[0]}</span>
                <span className="text-slate-700">•</span>
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 hover:underline">
                  <Globe className="h-3.5 w-3.5 text-blue-400" /> {company.website.replace('https://', '')} <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Followers and actions panel */}
          <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
            <div className="bg-slate-950/40 border border-white/5 px-4 py-2 rounded-xl text-center font-mono flex items-center gap-2 shrink-0">
              <Users className="h-4 w-4 text-purple-400" />
              <div className="text-left">
                <span className="block text-xs font-bold text-slate-200">{followersCount}</span>
                <span className="block text-[8px] text-slate-500 uppercase font-semibold">Following</span>
              </div>
            </div>

            <Button
              onClick={handleFollowToggle}
              disabled={followLoading}
              className={`flex-1 md:flex-initial font-bold text-xs px-6 py-3 rounded-xl border flex items-center justify-center gap-1.5 transition-all duration-300 ${
                isFollowing
                  ? 'bg-blue-500/10 border-blue-500/25 text-blue-400 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 group/btn'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-transparent text-white'
              }`}
            >
              {followLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isFollowing ? (
                <>
                  <Heart className="h-4 w-4 fill-current group-hover/btn:hidden text-blue-400" />
                  <span className="group-hover/btn:hidden">Following</span>
                  <span className="hidden group-hover/btn:inline">Unfollow</span>
                </>
              ) : (
                <>
                  <Heart className="h-4 w-4" />
                  <span>Follow Company</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Details, Timeline, Reviews (spans 2) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* About Card */}
          <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <h3 className="font-extrabold text-sm text-slate-200 border-b border-white/5 pb-2 mb-4">About {company.name}</h3>
            <p className="text-slate-350 text-xs md:text-sm leading-relaxed">{company.about}</p>
          </Card>

          {/* Hiring Timeline Insights */}
          <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <h3 className="font-extrabold text-sm text-slate-200 border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-blue-500" />
              Recruitment Timeline
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
              {hiringTimelineData.map((t, idx) => (
                <div key={idx} className="bg-slate-950/40 border border-white/5 p-3 rounded-lg flex flex-col justify-between h-28 relative">
                  <div>
                    <span className="absolute top-2 right-2 text-[10px] font-mono text-slate-600 font-bold">0{idx+1}</span>
                    <span className="block text-[10px] font-bold text-slate-300 leading-tight pr-5">{t.phase}</span>
                    <span className="block text-[9px] text-blue-400 font-mono mt-1">{t.period}</span>
                  </div>
                  <span className="block text-[8px] text-slate-500 leading-normal mt-2">{t.desc}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Community Interview Reviews */}
          <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-4">
              <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                <BookOpen className="h-4.5 w-4.5 text-purple-500" />
                Community Interview Experiences ({experiences.length})
              </h3>
            </div>

            {experiences.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">
                No interview experiences posted yet. Share your experience to seed this profile.
              </p>
            ) : (
              <div className="space-y-3">
                {experiences.map((exp) => {
                  const isExpExpanded = expandedExperienceId === exp.id
                  const author = exp.is_anonymous ? 'Anonymous Swiggy Candidate' : exp.profiles?.full_name || 'Candidate'
                  const dateStr = new Date(exp.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                  
                  return (
                    <div 
                      key={exp.id} 
                      onClick={() => setExpandedExperienceId(isExpExpanded ? null : exp.id)}
                      className={`p-4 bg-slate-950/30 border rounded-lg hover:bg-slate-950/60 transition-all duration-150 cursor-pointer text-xs space-y-3 ${
                        isExpExpanded ? 'border-white/10 shadow-lg' : 'border-white/5'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-250">{exp.role}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">{author} • {dateStr}</p>
                        </div>
                        <Badge className={`text-[8px] font-mono py-0 scale-95 border ${difficultyColors[exp.difficulty] || 'text-slate-400 border-white/10'}`}>
                          {exp.difficulty}
                        </Badge>
                      </div>

                      {!isExpExpanded && (
                        <p className="text-slate-450 line-clamp-1 italic">"{exp.interview_process}"</p>
                      )}

                      <AnimatePresence>
                        {isExpExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-3 pt-3 border-t border-white/5 overflow-hidden text-slate-350 cursor-default"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div>
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Process</p>
                              <p className="mt-0.5 leading-relaxed">{exp.interview_process}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Questions Asked</p>
                              <p className="mt-0.5 leading-relaxed bg-slate-950 p-2.5 rounded font-mono text-[10px] whitespace-pre-wrap">{exp.questions_asked}</p>
                            </div>
                            {exp.preparation_tips && (
                              <div>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Prep Tips</p>
                                <p className="mt-0.5 leading-relaxed">{exp.preparation_tips}</p>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

        </div>

        {/* Right Column: Insights Stats, Skills, Tech Stack, Open Jobs */}
        <div className="space-y-8">
          
          {/* Interview Insights Panel */}
          <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <h3 className="font-extrabold text-sm text-slate-200 border-b border-white/5 pb-2 mb-4">Interview Insights</h3>
            
            <div className="space-y-4">
              {/* Difficulty Gauge */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Interview Difficulty</span>
                  <Badge className={`text-[9px] font-mono py-0 border ${difficultyColors[avgDifficulty] || 'text-slate-400 border-white/5'}`}>
                    {avgDifficulty}
                  </Badge>
                </div>
                
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      avgDifficulty === 'Easy' ? 'bg-emerald-500' : avgDifficulty === 'Medium' ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${difficultyPct}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-500 block leading-tight">Dynamic rating based on student feedback scores.</span>
              </div>

              {/* Total Listings */}
              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 font-mono text-center">
                <div className="bg-slate-950/40 p-2.5 rounded-lg border border-white/5">
                  <span className="block text-slate-550 text-[8px] uppercase font-bold tracking-wider">Active Jobs</span>
                  <span className="block text-sm font-black text-white mt-0.5">{openJobs.length}</span>
                </div>
                <div className="bg-slate-950/40 p-2.5 rounded-lg border border-white/5">
                  <span className="block text-slate-550 text-[8px] uppercase font-bold tracking-wider">Avg Process</span>
                  <span className="block text-sm font-black text-white mt-0.5">2-3 wks</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Required Skills from Jobs */}
          <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <h3 className="font-extrabold text-sm text-slate-200 border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
              <Award className="h-4.5 w-4.5 text-blue-500" />
              Required Skills
            </h3>
            {aggregatedSkills.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No active postings to extract skills.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {aggregatedSkills.map((skill) => (
                  <Badge key={skill} variant="outline" className="border-white/5 bg-slate-950 text-slate-400 text-[9px] hover:text-white transition-colors py-0.5">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </Card>

          {/* Popular Technologies at Company */}
          <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <h3 className="font-extrabold text-sm text-slate-200 border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
              <Layers className="h-4.5 w-4.5 text-blue-400" />
              Popular Technologies
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {company.techStack.map((tech) => (
                <span 
                  key={tech}
                  className="px-2 py-0.5 bg-slate-950 border border-white/5 text-slate-400 text-[10px] font-mono rounded-lg hover:border-blue-500/20 hover:text-white transition-all duration-200"
                >
                  {tech}
                </span>
              ))}
            </div>
          </Card>

          {/* Open Opportunities */}
          <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2 border-b border-white/5 pb-2 mb-4">
              <Briefcase className="h-4.5 w-4.5 text-blue-500" /> Open Internships ({openJobs.length})
            </h3>
            {openJobs.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">No open listings indexed.</p>
            ) : (
              <div className="space-y-3">
                {openJobs.slice(0, 3).map((job) => {
                  const matchData = calculateMatch(job.skills)
                  return (
                    <div 
                      key={job.id} 
                      onClick={() => router.push('/dashboard/internships')}
                      className="bg-slate-950/40 border border-white/5 hover:border-white/10 p-3 rounded-lg cursor-pointer hover:bg-slate-900/20 transition-all duration-150 flex flex-col justify-between gap-2.5 group"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="font-bold text-[11px] text-slate-200 group-hover:text-white truncate pr-1">
                            {job.role}
                          </h4>
                          <span className="text-[8px] font-mono font-bold text-emerald-400 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/15">
                            {matchData.score}% Match
                          </span>
                        </div>
                        <p className="text-[8px] text-slate-500 flex items-center gap-0.5 mt-0.5 font-mono">
                          <MapPin className="h-3.5 w-3.5" /> {job.location || 'Remote'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  )
}
