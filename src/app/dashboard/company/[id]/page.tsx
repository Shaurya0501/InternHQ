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
  Loader2
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

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
        const metadata = getCompanyMetadata(companyNameNormalized)
        setCompany(metadata)

        // 2. Fetch User Profile for Match Score
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setUserProfile(profile)

        // 3. Check Follow State
        const { data: followRecord } = await supabase
          .from('company_follows')
          .select('id')
          .eq('user_id', user.id)
          .ilike('company_name', metadata.name)
          .maybeSingle()
        setIsFollowing(!!followRecord)

        // 4. Fetch open internships for this company
        // Check local DB first, then fallback to API search
        const { data: localJobs } = await supabase
          .from('internships')
          .select('*')
          .ilike('company_name', metadata.name)
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

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Back Button */}
      <button 
        onClick={() => router.back()} 
        className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-xs font-semibold"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </button>

      {/* Hero Banner Header */}
      <Card className="relative overflow-hidden bg-slate-900/40 border-white/5 p-6 md:p-8 backdrop-blur-md">
        <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-gradient-to-bl from-blue-500/5 to-purple-500/5 rounded-full blur-[70px] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
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
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-slate-500" /> {company.locations[0]}</span>
                <span className="text-slate-700">•</span>
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 hover:underline">
                  <Globe className="h-3.5 w-3.5 text-blue-400" /> {company.website.replace('https://', '')} <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Follow Button */}
          <Button
            onClick={handleFollowToggle}
            disabled={followLoading}
            className={`w-full md:w-auto font-bold text-xs px-6 py-2.5 rounded-lg border flex items-center justify-center gap-1.5 transition-all duration-300 ${
              isFollowing
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 group/btn'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-transparent text-white'
            }`}
          >
            {followLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isFollowing ? (
              <>
                <Heart className="h-4 w-4 fill-current group-hover/btn:hidden" />
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
      </Card>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Details & Process (spans 2) */}
        <div className="lg:col-span-2 space-y-8">
          {/* About Card */}
          <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <h3 className="font-extrabold text-sm text-slate-200 border-b border-white/5 pb-2 mb-4">About {company.name}</h3>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">{company.about}</p>
          </Card>

          {/* Tech Stack Card */}
          <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <h3 className="font-extrabold text-sm text-slate-200 border-b border-white/5 pb-2 mb-4">Technology Stack</h3>
            <div className="flex flex-wrap gap-2">
              {company.techStack.map((tech) => (
                <span 
                  key={tech}
                  className="px-3 py-1 bg-slate-950 border border-white/5 text-slate-300 text-xs font-mono rounded-lg hover:border-blue-500/20 hover:text-white transition-all duration-300"
                >
                  {tech}
                </span>
              ))}
            </div>
          </Card>

          {/* Hiring Process Card */}
          <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <h3 className="font-extrabold text-sm text-slate-200 border-b border-white/5 pb-2 mb-4">Hiring Process</h3>
            <div className="relative pl-6 border-l border-white/5 space-y-6 ml-2 mt-4">
              {company.hiringProcess.map((step, idx) => (
                <div key={idx} className="relative text-xs md:text-sm">
                  {/* Step Dot */}
                  <span className="absolute -left-[30px] top-1.5 h-4 w-4 rounded-full bg-blue-600/20 border border-blue-500 flex items-center justify-center text-[9px] font-mono text-blue-400 font-bold">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-200">Round {idx + 1}</h4>
                    <p className="text-slate-400 text-xs mt-1 leading-normal">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Open Jobs & Apps (spans 1) */}
        <div className="space-y-8">
          
          {/* Open Opportunities */}
          <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2 border-b border-white/5 pb-2 mb-4">
              <Briefcase className="h-4.5 w-4.5 text-blue-500" /> Open Internships ({openJobs.length})
            </h3>
            {openJobs.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">No open listings indexed.</p>
            ) : (
              <div className="space-y-4">
                {openJobs.map((job) => {
                  const matchData = calculateMatch(job.skills)
                  return (
                    <div 
                      key={job.id} 
                      onClick={() => router.push('/dashboard/internships')}
                      className="bg-slate-950/40 border border-white/5 hover:border-white/10 p-4 rounded-xl cursor-pointer hover:bg-slate-900/20 transition-all duration-300 flex flex-col justify-between gap-3 group"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="font-bold text-xs text-slate-200 group-hover:text-white truncate pr-1">
                            {job.role}
                          </h4>
                          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            {matchData.score}% Match
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-500 flex items-center gap-0.5 mt-1 font-mono">
                          <MapPin className="h-3 w-3" /> {job.location || 'Remote'}
                        </p>
                      </div>

                      {/* Skills match breakdown */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {matchData.has.slice(0, 3).map((s, idx) => (
                          <span key={idx} className="text-[8px] bg-emerald-500/5 text-emerald-400 px-1 rounded">✓ {s}</span>
                        ))}
                        {matchData.missing.slice(0, 2).map((s, idx) => (
                          <span key={idx} className="text-[8px] bg-rose-500/5 text-rose-400 px-1 rounded">✗ {s}</span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Previous Applications to this Company */}
          <Card className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2 border-b border-white/5 pb-2 mb-4">
              <CheckCircle2 className="h-4.5 w-4.5 text-blue-500" /> Previous Processes ({prevApps.length})
            </h3>
            {prevApps.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">No history with this company.</p>
            ) : (
              <div className="space-y-3">
                {prevApps.map((app) => (
                  <div key={app.id} className="flex justify-between items-center text-xs p-2 rounded bg-slate-950/40 border border-white/5">
                    <div>
                      <p className="font-bold text-slate-300">{app.internships?.role}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">
                        {new Date(app.applied_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-mono py-0 scale-95 uppercase">
                      {app.status}
                    </Badge>
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
