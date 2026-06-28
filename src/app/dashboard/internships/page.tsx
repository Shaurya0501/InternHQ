'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search,
  Filter,
  ArrowUpDown,
  Bookmark,
  ExternalLink,
  MapPin,
  DollarSign,
  Briefcase,
  Calendar,
  Sparkles,
  Loader2,
  BookmarkCheck,
  CheckCircle,
  X,
  Compass,
  AlertCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Internship } from '@/types/internship'

export default function InternshipsDiscoveryPage() {
  const [jobs, setJobs] = useState<Internship[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [skillProfile, setSkillProfile] = useState<any>(null)
  const [resumes, setResumes] = useState<any[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<string>('')
  const [hoveredMatchJobId, setHoveredMatchJobId] = useState<string | null>(null)
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [locationType, setLocationType] = useState<string>('all')
  const [locationNameFilter, setLocationNameFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [stipendFilter, setStipendFilter] = useState<string>('all')
  const [experienceFilter, setExperienceFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>('newest')

  // Saved/Applied mappings
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set()) // Format: "source|external_id"
  const [savedDbIds, setSavedDbIds] = useState<Map<string, string>>(new Map()) // Format: "source|external_id" -> uuid
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set())

  // Modal States
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [activeApplyJob, setActiveApplyJob] = useState<Internship | null>(null)
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false)

  // Toggle Filters visibility
  const [showFilters, setShowFilters] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const initPage = async () => {
      try {
        setLoading(true)
        
        // 1. Fetch User Profile
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          setUserProfile(profile)

          // 2. Fetch Skill Profile
          const { data: sProfile } = await supabase
            .from('skill_profile')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()
          setSkillProfile(sProfile)

          // 3. Fetch Resumes
          const { data: resumeData } = await supabase
            .from('resumes')
            .select('*')
            .eq('user_id', user.id)
            .order('is_favorite', { ascending: false })
            .order('filename', { ascending: true })
          setResumes(resumeData || [])
          
          const fav = resumeData?.find(r => r.is_favorite)
          if (fav) {
            setSelectedResumeId(fav.id)
          } else if (resumeData && resumeData.length > 0) {
            setSelectedResumeId(resumeData[0].id)
          }

          // 4. Fetch User Bookmarks & Applications
          const { data: saved } = await supabase
            .from('saved_internships')
            .select('id, internship_id, internships(source, external_id)')
            .eq('user_id', user.id)
          
          const sKeys = new Set<string>()
          const sMap = new Map<string, string>()
          saved?.forEach((s: any) => {
            if (s.internships) {
              const key = `${s.internships.source}|${s.internships.external_id}`
              sKeys.add(key)
              sMap.set(key, s.id)
            }
          })
          setSavedKeys(sKeys)
          setSavedDbIds(sMap)

          const { data: applied } = await supabase
            .from('applications')
            .select('internship_id, internships(source, external_id)')
            .eq('user_id', user.id)

          const aKeys = new Set<string>()
          applied?.forEach((a: any) => {
            if (a.internships) {
              aKeys.add(`${a.internships.source}|${a.internships.external_id}`)
            }
          })
          setAppliedKeys(aKeys)
        }

        // 3. Fetch Live Jobs
        const res = await fetch('/api/internships')
        if (!res.ok) throw new Error('Failed to load opportunities.')
        const data = await res.json()
        setJobs(data)
      } catch (err: any) {
        toast.error(err.message || 'Error parsing live directory registry.')
      } finally {
        setLoading(false)
      }
    }

    initPage()
  }, [])

  // Handle Save / Unsave
  const handleSaveToggle = async (job: Internship) => {
    const key = `${job.source}|${job.external_id}`
    const isSaved = savedKeys.has(key)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('You must be logged in to save listings.')
        return
      }

      if (isSaved) {
        // Delete bookmark
        const dbId = savedDbIds.get(key)
        if (dbId) {
          const { error } = await supabase
            .from('saved_internships')
            .delete()
            .eq('id', dbId)
          
          if (error) throw error
          
          const newKeys = new Set(savedKeys)
          newKeys.delete(key)
          setSavedKeys(newKeys)
          toast.success('Removed from Saved Internships')
        }
      } else {
        // First upsert internship details into db
        const { data: dbInternship, error: internshipErr } = await supabase
          .from('internships')
          .upsert({
            external_id: job.external_id,
            source: job.source,
            company_name: job.company_name,
            company_logo: job.company_logo,
            role: job.role,
            location: job.location,
            location_type: job.location_type,
            stipend: job.stipend,
            skills: job.skills,
            url: job.url,
            posted_date: job.posted_date || new Date().toISOString()
          }, {
            onConflict: 'source,external_id'
          })
          .select()
          .single()

        if (internshipErr) throw internshipErr

        // Create saved_internships record
        const { data: savedRecord, error: savedErr } = await supabase
          .from('saved_internships')
          .insert({
            user_id: user.id,
            internship_id: dbInternship.id
          })
          .select()
          .single()

        if (savedErr) throw savedErr

        const newKeys = new Set(savedKeys)
        newKeys.add(key)
        setSavedKeys(newKeys)

        const newMap = new Map(savedDbIds)
        newMap.set(key, savedRecord.id)
        setSavedDbIds(newMap)
        
        toast.success('Added to Saved Internships')
      }
    } catch (err: any) {
      toast.error('Could not sync bookmark state: ' + err.message)
    }
  }

  // Handle Apply Redirect
  const handleApplyClick = (job: Internship) => {
    setActiveApplyJob(job)
    window.open(job.url, '_blank', 'noopener,noreferrer')
    setShowApplyModal(true)
  }

  // Confirm Application Submitted
  const handleConfirmApplication = async (submitted: boolean) => {
    if (!activeApplyJob) return
    
    if (submitted) {
      setIsSubmittingApplication(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Unauthorized session keys.')

        // 1. Upsert internship
        const { data: dbInternship, error: internshipErr } = await supabase
          .from('internships')
          .upsert({
            external_id: activeApplyJob.external_id,
            source: activeApplyJob.source,
            company_name: activeApplyJob.company_name,
            company_logo: activeApplyJob.company_logo,
            role: activeApplyJob.role,
            location: activeApplyJob.location,
            location_type: activeApplyJob.location_type,
            stipend: activeApplyJob.stipend,
            skills: activeApplyJob.skills,
            url: activeApplyJob.url,
            posted_date: activeApplyJob.posted_date || new Date().toISOString()
          }, {
            onConflict: 'source,external_id'
          })
          .select()
          .single()

        if (internshipErr) throw internshipErr

        // 2. Insert into Applications
        const { error: appErr } = await supabase
          .from('applications')
          .insert({
            user_id: user.id,
            internship_id: dbInternship.id,
            status: 'Applied',
            applied_date: new Date().toISOString(),
            resume_id: selectedResumeId || null,
            notes: `Applied to ${activeApplyJob.role} at ${activeApplyJob.company_name} via ${activeApplyJob.source}.`
          })

        if (appErr) {
          if (appErr.code === '23505') {
            toast.info('You have already applied to this internship!')
          } else {
            throw appErr
          }
        } else {
          // 3. Update resume last_used_at
          if (selectedResumeId) {
            await supabase
              .from('resumes')
              .update({ last_used_at: new Date().toISOString() })
              .eq('id', selectedResumeId)
          }

          toast.success(`Application indexed for ${activeApplyJob.company_name}!`)
          
          const newApplied = new Set(appliedKeys)
          newApplied.add(`${activeApplyJob.source}|${activeApplyJob.external_id}`)
          setAppliedKeys(newApplied)
        }
      } catch (err: any) {
        toast.error('Error logging application record: ' + err.message)
      } finally {
        setIsSubmittingApplication(false)
      }
    }
    
    setShowApplyModal(false)
    setActiveApplyJob(null)
  }

  // Helpers to get unique companies and skills from fetched list for filters
  const uniqueCompanies = Array.from(new Set(jobs.map(j => j.company_name))).sort()
  const uniqueSkills = Array.from(new Set(jobs.flatMap(j => j.skills))).sort()

  const handleSkillToggle = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill))
    } else {
      setSelectedSkills([...selectedSkills, skill])
    }
  }

  // Relevance Scoring Helper for Frontend Sorting
  const calculateMatch = (job: Internship) => {
    const skills = skillProfile?.skills || userProfile?.skills || []
    const preferredRoles = skillProfile?.preferred_roles || userProfile?.preferred_roles || []
    const preferredLocations = skillProfile?.preferred_locations || userProfile?.preferred_locations || []
    const remotePref = skillProfile?.remote_preference || 'any'
    const techStack = skillProfile?.preferred_tech_stack || []

    const jobSkills = job.skills.map(s => s.toLowerCase())
    const userSkillsLower = skills.map((s: string) => s.toLowerCase())
    const techStackLower = techStack.map((t: string) => t.toLowerCase())

    let score = 40 // Starting base score

    const reasons: string[] = []
    const hasSkills: string[] = []
    const missingSkills: string[] = []

    // 1. Skills Matching (Max 25 pts)
    if (job.skills.length > 0) {
      const matched = job.skills.filter(s => userSkillsLower.includes(s.toLowerCase()))
      const missing = job.skills.filter(s => !userSkillsLower.includes(s.toLowerCase()))
      hasSkills.push(...matched)
      missingSkills.push(...missing)

      const skillMatchPct = matched.length / job.skills.length
      score += Math.round(skillMatchPct * 25)
      
      if (matched.length > 0) {
        reasons.push(`Matches skills: ${matched.slice(0, 2).join(', ')}`)
      }
      if (missing.length > 0) {
        reasons.push(`Missing skills: ${missing.slice(0, 2).join(', ')}`)
      }
    }

    // 2. Tech Stack Matching (Max 15 pts)
    if (techStack.length > 0 && job.skills.length > 0) {
      const matchedStack = job.skills.filter(s => techStackLower.includes(s.toLowerCase()))
      if (matchedStack.length > 0) {
        score += 15
        reasons.push(`Strong preferred tech stack match (${matchedStack.slice(0, 2).join(', ')})`)
      }
    }

    // 3. Preferred Role Matching (Max 15 pts)
    const roleLower = job.role.toLowerCase()
    let roleMatched = false
    for (const r of preferredRoles) {
      if (roleLower.includes(r.toLowerCase())) {
        score += 15
        roleMatched = true
        reasons.push(`Perfect match for preferred role: ${r}`)
        break
      }
    }

    // 4. Remote & Location Matching (Max 15 pts)
    const jobLoc = (job.location || '').toLowerCase()
    const isJobRemote = job.location_type === 'remote' || jobLoc.includes('remote')
    
    let locationMatched = false
    for (const loc of preferredLocations) {
      if (jobLoc.includes(loc.toLowerCase())) {
        locationMatched = true
        break
      }
    }

    if (remotePref === 'remote' && isJobRemote) {
      score += 15
      reasons.push('Matches remote work preference')
    } else if (remotePref === 'hybrid' && job.location_type === 'hybrid') {
      score += 15
      reasons.push('Matches hybrid work preference')
    } else if (remotePref === 'onsite' && job.location_type === 'onsite') {
      score += 15
      reasons.push('Matches onsite work preference')
    } else if (locationMatched) {
      score += 10
      reasons.push('Located in preferred city')
    }

    const finalScore = Math.min(100, Math.max(0, score))
    return {
      score: finalScore,
      reasons,
      has: hasSkills,
      missing: missingSkills
    }
  }

  const calculateRelevanceScore = (job: Internship) => {
    return calculateMatch(job).score
  }

  // Filter and Sort implementation
  const filteredJobs = jobs.filter(job => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        job.role.toLowerCase().includes(query) ||
        job.company_name.toLowerCase().includes(query) ||
        job.location?.toLowerCase().includes(query) ||
        job.skills.some(s => s.toLowerCase().includes(query))
      if (!matchesSearch) return false
    }

    if (locationType !== 'all') {
      if (job.location_type !== locationType) return false
    }

    if (locationNameFilter) {
      const locQuery = locationNameFilter.toLowerCase()
      if (!job.location || !job.location.toLowerCase().includes(locQuery)) return false
    }

    if (sourceFilter !== 'all') {
      if (job.source !== sourceFilter) return false
    }

    if (stipendFilter === 'paid') {
      if (!job.stipend) return false
    }

    if (companyFilter !== 'all') {
      if (job.company_name !== companyFilter) return false
    }

    if (experienceFilter !== 'all') {
      const roleLower = job.role.toLowerCase()
      const isIntern = roleLower.includes('intern') || roleLower.includes('co-op') || roleLower.includes('undergrad')
      const isJunior = roleLower.includes('junior') || roleLower.includes('entry') || roleLower.includes('associate')
      
      if (experienceFilter === 'internship' && !isIntern) return false
      if (experienceFilter === 'junior' && !isJunior && isIntern) return false
      if (experienceFilter === 'mid_senior' && (isIntern || isJunior)) return false
    }

    if (dateFilter !== 'all') {
      if (!job.posted_date) return false
      const postedTime = new Date(job.posted_date).getTime()
      const diffHours = (Date.now() - postedTime) / (1000 * 60 * 60)
      if (dateFilter === '24h' && diffHours > 24) return false
      if (dateFilter === 'week' && diffHours > 24 * 7) return false
      if (dateFilter === 'month' && diffHours > 24 * 30) return false
    }

    if (selectedSkills.length > 0) {
      const hasSkill = selectedSkills.some(skill =>
        job.skills.some(s => s.toLowerCase() === skill.toLowerCase())
      )
      if (!hasSkill) return false
    }

    return true
  })

  // Sort
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (sortBy === 'newest') {
      const dateA = a.posted_date ? new Date(a.posted_date).getTime() : 0
      const dateB = b.posted_date ? new Date(b.posted_date).getTime() : 0
      return dateB - dateA
    }
    if (sortBy === 'alphabetical') {
      return a.role.localeCompare(b.role)
    }
    if (sortBy === 'relevance') {
      return calculateRelevanceScore(b) - calculateRelevanceScore(a)
    }
    if (sortBy === 'stipend') {
      const getNumericSalary = (stipendStr?: string) => {
        if (!stipendStr) return 0
        const match = stipendStr.replace(/[^0-9]/g, '')
        return match ? parseInt(match, 10) : 0
      }
      return getNumericSalary(b.stipend) - getNumericSalary(a.stipend)
    }
    return 0
  })

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Compass className="h-6 w-6 text-blue-500" /> Discover Internships
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Browse normalized openings dynamically tracked from public APIs.
          </p>
        </div>

        {/* Global Statistics */}
        <div className="flex gap-4">
          <div className="px-4 py-2 rounded-lg bg-slate-900/50 border border-white/5 backdrop-blur-md">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Available Index</p>
            <p className="text-lg font-extrabold text-white font-mono">{jobs.length}</p>
          </div>
          <div className="px-4 py-2 rounded-lg bg-slate-900/50 border border-white/5 backdrop-blur-md">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Matching Filter</p>
            <p className="text-lg font-extrabold text-blue-400 font-mono">{sortedJobs.length}</p>
          </div>
        </div>
      </div>

      {/* Control Console */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Instant Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by Company, Role, Skill, Location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 backdrop-blur-md transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {/* Toggle Filters Button */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`border-white/5 hover:bg-white/5 text-xs px-3 gap-2 ${
                showFilters ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'text-slate-300'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters {selectedSkills.length > 0 || locationType !== 'all' || locationNameFilter || sourceFilter !== 'all' || stipendFilter !== 'all' || experienceFilter !== 'all' || dateFilter !== 'all' || companyFilter !== 'all' ? '(Active)' : ''}
            </Button>

            {/* Sorting Dropdown */}
            <div className="relative flex items-center bg-slate-900/50 border border-white/5 rounded-lg px-2 text-slate-400 backdrop-blur-md">
              <ArrowUpDown className="h-4 w-4 mr-1 text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-300 focus:outline-none pr-6 cursor-pointer py-1.5"
              >
                <option value="newest" className="bg-slate-950">Newest Posted</option>
                <option value="relevance" className="bg-slate-950">Most Relevant</option>
                <option value="stipend" className="bg-slate-950">Highest Stipend</option>
                <option value="alphabetical" className="bg-slate-950">Alphabetical</option>
              </select>
            </div>
          </div>
        </div>

        {/* Collapsible Filter Tray */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <Card className="bg-slate-900/20 border-white/5 p-5 backdrop-blur-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Location Type Filter */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Work Setup</label>
                    <select
                      value={locationType}
                      onChange={(e) => setLocationType(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 rounded-lg p-2 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="all">All Setups</option>
                      <option value="remote">Remote Only</option>
                      <option value="onsite">On-site Only</option>
                      <option value="hybrid">Hybrid Only</option>
                    </select>
                  </div>

                  {/* Specific Location Filter */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Specific Location</label>
                    <input
                      type="text"
                      placeholder="e.g. London, Germany"
                      value={locationNameFilter}
                      onChange={(e) => setLocationNameFilter(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 rounded-lg p-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-white/10"
                    />
                  </div>

                  {/* Experience Filter */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Experience Scope</label>
                    <select
                      value={experienceFilter}
                      onChange={(e) => setExperienceFilter(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 rounded-lg p-2 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="all">All Experiences</option>
                      <option value="internship">Internships Only</option>
                      <option value="junior">Junior & Entry Level</option>
                      <option value="mid_senior">Intermediate & Senior</option>
                    </select>
                  </div>

                  {/* Stipend Filter */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Stipend Status</label>
                    <select
                      value={stipendFilter}
                      onChange={(e) => setStipendFilter(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 rounded-lg p-2 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="all">All Opportunities</option>
                      <option value="paid">Paid Roles (with salary info)</option>
                    </select>
                  </div>

                  {/* Date Posted Filter */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Date Posted</label>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 rounded-lg p-2 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="all">Anytime</option>
                      <option value="24h">Past 24 Hours</option>
                      <option value="week">Past Week</option>
                      <option value="month">Past Month</option>
                    </select>
                  </div>

                  {/* Company Filter */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Hiring Company</label>
                    <select
                      value={companyFilter}
                      onChange={(e) => setCompanyFilter(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 rounded-lg p-2 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="all">All Companies</option>
                      {uniqueCompanies.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* API Source Filter */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Search Source</label>
                    <select
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 rounded-lg p-2 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="all">All Sources</option>
                      <option value="remotive">Remotive API</option>
                      <option value="arbeitnow">Arbeitnow API</option>
                    </select>
                  </div>
                </div>

                {/* Skills Filters */}
                {uniqueSkills.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Filter by Skills</label>
                    <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800">
                      {uniqueSkills.map((skill) => {
                        const isSelected = selectedSkills.includes(skill)
                        return (
                          <button
                            key={skill}
                            onClick={() => handleSkillToggle(skill)}
                            className={`text-[9px] px-2 py-0.5 rounded border transition-all ${
                              isSelected
                                ? 'bg-blue-600/20 border-blue-500 text-white font-semibold'
                                : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-200'
                            }`}
                          >
                            {skill}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Reset filters */}
                <div className="flex justify-end pt-2 border-t border-white/5">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setLocationType('all')
                      setLocationNameFilter('')
                      setSourceFilter('all')
                      setStipendFilter('all')
                      setExperienceFilter('all')
                      setDateFilter('all')
                      setCompanyFilter('all')
                      setSelectedSkills([])
                      setSearchQuery('')
                    }}
                    className="text-[10px] text-slate-500 hover:text-slate-300"
                  >
                    Reset All Filters
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Internship Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-slate-900/40 border-white/5 p-6 space-y-4 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-lg bg-slate-800" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3 bg-slate-800" />
                  <Skeleton className="h-3 w-1/2 bg-slate-800" />
                </div>
              </div>
              <Skeleton className="h-8 w-full bg-slate-800" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 bg-slate-800" />
                <Skeleton className="h-6 w-16 bg-slate-800" />
              </div>
            </Card>
          ))}
        </div>
      ) : sortedJobs.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/20 border border-white/5 rounded-xl backdrop-blur-sm space-y-3">
          <div className="h-10 w-10 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto text-slate-500">
            <Search className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-slate-200">No matching internships found</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Try adjusting your search terms, work setup parameters, or clearing active filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedJobs.map((job) => {
            const saveKey = `${job.source}|${job.external_id}`
            const isSaved = savedKeys.has(saveKey)
            const isApplied = appliedKeys.has(saveKey)
            
            // Generate initials placeholder logo
            const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
              job.company_name
            )}&backgroundColor=0f172a,1e293b,334155`

            const matchDetail = calculateMatch(job)
            const relevanceScore = matchDetail.score

            return (
              <motion.div
                key={job.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="bg-slate-900/40 border-white/5 p-6 hover:border-white/10 transition-all duration-300 backdrop-blur-md relative overflow-hidden group flex flex-col justify-between h-full min-h-[220px]">
                  {/* Subtle Background Glow */}
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-600/5 rounded-full blur-2xl group-hover:bg-blue-600/10 transition-colors" />

                  {/* Top details block */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      {/* Logo and company info */}
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg overflow-hidden border border-white/15 bg-slate-900 flex-shrink-0">
                          <img
                            src={job.company_logo || defaultAvatar}
                            alt={job.company_name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = defaultAvatar
                            }}
                          />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-white line-clamp-1">
                            {job.role}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-medium">
                            {job.company_name}
                          </p>
                        </div>
                      </div>

                      {/* Top Action Indicators (Bookmark & Relevance) */}
                      <div className="flex items-center gap-1.5">
                        {/* Interactive Match Score Badge & Tooltip Popover */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setHoveredMatchJobId(hoveredMatchJobId === job.id ? null : job.id)
                            }}
                            className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border cursor-pointer select-none transition-all flex items-center gap-0.5 ${
                              matchDetail.score >= 80
                                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                                : matchDetail.score >= 60
                                ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                                : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                            }`}
                          >
                            <Sparkles className="h-2.5 w-2.5" /> {matchDetail.score}% Match
                          </button>

                          <AnimatePresence>
                            {hoveredMatchJobId === job.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-40 bg-transparent" 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setHoveredMatchJobId(null)
                                  }}
                                />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                  className="absolute right-0 bottom-8 z-50 w-72 rounded-xl bg-slate-950 border border-white/10 p-4 shadow-2xl backdrop-blur-xl text-slate-100 flex flex-col gap-3 text-left"
                                >
                                  <div>
                                    <h5 className="font-extrabold text-xs text-white">Match Breakdowns</h5>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Parameters evaluating your suitability score.</p>
                                  </div>
                                  <div className="space-y-1.5 border-y border-white/5 py-2">
                                    {matchDetail.reasons.map((r, idx) => (
                                      <p key={idx} className="text-[10px] text-slate-300 leading-normal flex items-start gap-1">
                                        <span className="text-blue-500 shrink-0">•</span> {r}
                                      </p>
                                    ))}
                                  </div>

                                  {/* Skill Gap Analysis chips */}
                                  <div>
                                    <h5 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wide">Skill Gap Analysis</h5>
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {matchDetail.has.map((s, idx) => (
                                        <span key={idx} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                          ✓ {s}
                                        </span>
                                      ))}
                                      {matchDetail.missing.map((s, idx) => (
                                        <span key={idx} className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                          ✗ {s}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>

                        <button
                          onClick={() => handleSaveToggle(job)}
                          className={`p-2 rounded-lg border transition-colors ${
                            isSaved
                              ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                              : 'bg-white/3 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
                          }`}
                        >
                          {isSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Meta Metadata tags */}
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <Badge variant="outline" className="border-white/5 bg-slate-900/60 text-slate-400 py-0.5 px-2 flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5 text-slate-500" />
                        {job.location}
                      </Badge>
                      <Badge variant="outline" className="border-white/5 bg-slate-900/60 text-slate-400 py-0.5 px-2 uppercase font-mono">
                        {job.location_type}
                      </Badge>
                      {job.stipend && (
                        <Badge variant="outline" className="border-blue-500/10 bg-blue-500/5 text-blue-400 py-0.5 px-2 flex items-center gap-0.5 font-mono">
                          <DollarSign className="h-2.5 w-2.5" />
                          {job.stipend}
                        </Badge>
                      )}
                      <Badge variant="outline" className="border-white/5 bg-slate-900/60 text-slate-500 py-0.5 px-2">
                        {job.source}
                      </Badge>
                    </div>

                    {/* Skills required */}
                    {job.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {job.skills.slice(0, 4).map((skill, index) => (
                          <span
                            key={index}
                            className="bg-white/3 border border-white/5 text-slate-400 text-[8px] font-medium px-1.5 py-0.5 rounded"
                          >
                            {skill}
                          </span>
                        ))}
                        {job.skills.length > 4 && (
                          <span className="text-[8px] text-slate-500 self-center pl-1 font-mono">
                            +{job.skills.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom details block (Action buttons + Time) */}
                  <div className="mt-5 pt-4 border-t border-white/5 flex justify-between items-center">
                    <span className="text-[9px] text-slate-500 font-mono flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {job.posted_date ? new Date(job.posted_date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric'
                      }) : 'Recently'}
                    </span>

                    <div className="flex gap-2">
                      {isApplied ? (
                        <Button
                          disabled
                          size="sm"
                          className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-xs rounded-lg px-3 py-1 flex items-center gap-1"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Applied
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleApplyClick(job)}
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-xs rounded-lg px-4 py-1 flex items-center gap-1.5"
                        >
                          Apply
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Confirmation Apply Modal */}
      <Dialog open={showApplyModal} onOpenChange={(open) => {
        if (!open) {
          setShowApplyModal(false)
          setActiveApplyJob(null)
        }
      }}>
        <DialogContent className="max-w-sm bg-slate-950 border border-white/10 p-6 text-slate-100 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-white">Application Checklist</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs mt-1">
              You are being redirected to the application portal for **{activeApplyJob?.role}** at **{activeApplyJob?.company_name}**.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 text-center border-y border-white/5 my-4">
            <p className="text-sm font-semibold text-slate-200">
              Did you submit your application?
            </p>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal">
              Confirming "Yes" will automatically index this internship into your Applications tracking system.
            </p>

            {/* Resume Selection */}
            <div className="space-y-2 mt-4 text-left">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Assign Resume</label>
              {resumes.length === 0 ? (
                <div className="flex items-center gap-1.5 p-2 rounded bg-amber-500/5 border border-amber-500/15 text-amber-400 text-[9px] leading-relaxed">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>No resumes in Vault. Go to Vault to upload one or continue without.</span>
                </div>
              ) : (
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="w-full rounded border border-white/10 bg-slate-900 p-2 text-xs text-white focus:outline-none"
                >
                  <option value="">Select a resume to assign...</option>
                  {resumes.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.filename} (v{r.version}){r.is_favorite ? ' [Favorite]' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button
              variant="outline"
              disabled={isSubmittingApplication}
              onClick={() => handleConfirmApplication(false)}
              className="border-white/10 hover:bg-white/5 text-slate-300 text-xs px-4"
            >
              Not Yet
            </Button>
            <Button
              disabled={isSubmittingApplication}
              onClick={() => handleConfirmApplication(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 flex items-center gap-1.5"
            >
              {isSubmittingApplication && <Loader2 className="h-3 w-3 animate-spin" />}
              Yes, I Applied
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
