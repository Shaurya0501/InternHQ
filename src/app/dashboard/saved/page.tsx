'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Bookmark,
  BookmarkX,
  ExternalLink,
  MapPin,
  DollarSign,
  Calendar,
  Loader2,
  CheckCircle,
  FolderHeart,
  Sparkles,
  AlertCircle,
  Kanban,
  LayoutGrid,
  Plus,
  Folder,
  ArrowRight,
  UserCheck
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SavedInternship, Internship } from '@/types/internship'

type Collection = {
  id: string
  name: string
  created_at: string
}

export default function SavedInternshipsPage() {
  const [savedItems, setSavedItems] = useState<SavedInternship[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [collectionMappings, setCollectionMappings] = useState<Map<string, string>>(new Map()) // internship_id -> collection_id
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'board' | 'grid'>('board')

  // User Profile details
  const [userProfile, setUserProfile] = useState<any>(null)
  const [skillProfile, setSkillProfile] = useState<any>(null)
  const [resumes, setResumes] = useState<any[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<string>('')
  const [hoveredMatchJobId, setHoveredMatchJobId] = useState<string | null>(null)
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set())

  // Modal States
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [activeApplyJob, setActiveApplyJob] = useState<Internship | null>(null)
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false)

  // New Collection Dialog state
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [isCreatingCollection, setIsCreatingCollection] = useState(false)

  const supabase = createClient()

  const initSavedData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Fetch User Profiles & Resume Registry
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setUserProfile(profile)

      const { data: sProfile } = await supabase
        .from('skill_profile')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      setSkillProfile(sProfile)

      const { data: resumeData } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', user.id)
        .order('is_favorite', { ascending: false })
      setResumes(resumeData || [])
      const fav = resumeData?.find(r => r.is_favorite)
      if (fav) setSelectedResumeId(fav.id)

      // 2. Fetch/Initialize Collections
      let { data: cols, error: colErr } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (colErr) throw colErr

      if (!cols || cols.length === 0) {
        const defaults = ['Dream Companies', 'Remote', 'AI', 'Summer 2027', 'Frontend']
        const { data: insertedCols, error: insertErr } = await supabase
          .from('collections')
          .insert(defaults.map(name => ({ name, user_id: user.id })))
          .select()

        if (insertErr) throw insertErr
        cols = insertedCols || []
      }
      setCollections(cols)

      // 3. Fetch Bookmarked Items
      const { data: saved, error: savedErr } = await supabase
        .from('saved_internships')
        .select(`
          id,
          user_id,
          internship_id,
          created_at,
          internships (*)
        `)
        .eq('user_id', user.id)

      if (savedErr) throw savedErr
      setSavedItems((saved as any) || [])

      // 4. Fetch Collection Items (Mappings)
      const { data: mappings, error: mapErr } = await supabase
        .from('collection_items')
        .select('collection_id, internship_id')

      const map = new Map<string, string>()
      mappings?.forEach((m: any) => {
        map.set(m.internship_id, m.collection_id)
      })
      setCollectionMappings(map)

      // 5. Fetch Applied Keys
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
    } catch (err: any) {
      toast.error('Failed to initialize Saved page: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    initSavedData()
  }, [])

  // ----------------------------------------
  // DRAG & DROP EVENTS
  // ----------------------------------------

  const handleDragStart = (e: React.DragEvent, internshipId: string) => {
    e.dataTransfer.setData('text/plain', internshipId)
  }

  const handleDrop = async (e: React.DragEvent, targetCollectionId: string | 'unassigned') => {
    e.preventDefault()
    const internshipId = e.dataTransfer.getData('text/plain')
    if (!internshipId) return

    try {
      if (targetCollectionId === 'unassigned') {
        // Delete mapping
        await supabase
          .from('collection_items')
          .delete()
          .eq('internship_id', internshipId)

        setCollectionMappings(prev => {
          const newMap = new Map(prev)
          newMap.delete(internshipId)
          return newMap
        })
        toast.success('Moved bookmark to Unassigned')
      } else {
        // Drop into specific collection
        await supabase
          .from('collection_items')
          .upsert({
            collection_id: targetCollectionId,
            internship_id: internshipId
          }, {
            onConflict: 'collection_id,internship_id'
          })

        setCollectionMappings(prev => {
          const newMap = new Map(prev)
          newMap.set(internshipId, targetCollectionId)
          return newMap
        })
        const colName = collections.find(c => c.id === targetCollectionId)?.name || 'Collection'
        toast.success(`Moved bookmark to ${colName}`)
      }
    } catch (err: any) {
      toast.error('Failed to move bookmark: ' + err.message)
    }
  }

  // ----------------------------------------
  // BOOKMARK REMOVE & APPLY LOGIC
  // ----------------------------------------

  const handleRemoveBookmark = async (id: string, internshipId: string, roleName: string) => {
    try {
      const { error } = await supabase
        .from('saved_internships')
        .delete()
        .eq('id', id)

      if (error) throw error

      setSavedItems(prev => prev.filter(item => item.id !== id))
      
      // Clean up mapping
      setCollectionMappings(prev => {
        const newMap = new Map(prev)
        newMap.delete(internshipId)
        return newMap
      })

      toast.success(`Removed ${roleName} from Bookmarks.`)
    } catch (err: any) {
      toast.error('Could not unsave listing: ' + err.message)
    }
  }

  const handleApplyClick = (job: Internship) => {
    setActiveApplyJob(job)
    window.open(job.url, '_blank', 'noopener,noreferrer')
    setShowApplyModal(true)
  }

  const handleConfirmApplication = async (submitted: boolean) => {
    if (!activeApplyJob) return

    if (submitted) {
      setIsSubmittingApplication(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Unauthenticated session keys.')

        // Create application record
        const { error: appErr } = await supabase
          .from('applications')
          .insert({
            user_id: user.id,
            internship_id: activeApplyJob.id,
            status: 'Applied',
            resume_id: selectedResumeId || null,
            applied_date: new Date().toISOString(),
            notes: `Applied to saved role: ${activeApplyJob.role} at ${activeApplyJob.company_name}.`
          })

        if (appErr) {
          if (appErr.code === '23505') {
            toast.info('You have already applied to this internship!')
          } else {
            throw appErr
          }
        } else {
          // Update resume last_used_at
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
        toast.error('Failed to log application details: ' + err.message)
      } finally {
        setIsSubmittingApplication(false)
      }
    }
    setShowApplyModal(false)
    setActiveApplyJob(null)
  }

  // ----------------------------------------
  // MATCH SCORE ALGORITHM
  // ----------------------------------------

  const calculateMatch = (job: Internship) => {
    const skills = skillProfile?.skills || userProfile?.skills || []
    const preferredRoles = skillProfile?.preferred_roles || userProfile?.preferred_roles || []
    const preferredLocations = skillProfile?.preferred_locations || userProfile?.preferred_locations || []
    const remotePref = skillProfile?.remote_preference || 'any'
    const techStack = skillProfile?.preferred_tech_stack || []

    const jobSkills = job.skills.map(s => s.toLowerCase())
    const userSkillsLower = skills.map((s: string) => s.toLowerCase())
    const techStackLower = techStack.map((t: string) => t.toLowerCase())

    let score = 40

    const reasons: string[] = []
    const hasSkills: string[] = []
    const missingSkills: string[] = []

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

    if (techStack.length > 0 && job.skills.length > 0) {
      const matchedStack = job.skills.filter(s => techStackLower.includes(s.toLowerCase()))
      if (matchedStack.length > 0) {
        score += 15
        reasons.push(`Strong preferred tech stack match (${matchedStack.slice(0, 2).join(', ')})`)
      }
    }

    const roleLower = job.role.toLowerCase()
    for (const r of preferredRoles) {
      if (roleLower.includes(r.toLowerCase())) {
        score += 15
        reasons.push(`Perfect match for preferred role: ${r}`)
        break
      }
    }

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

  // ----------------------------------------
  // NEW COLLECTION CREATION
  // ----------------------------------------

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCollectionName.trim()) return

    setIsCreatingCollection(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthenticated.')

      const { data, error } = await supabase
        .from('collections')
        .insert({
          name: newCollectionName.trim(),
          user_id: user.id
        })
        .select()
        .single()

      if (error) throw error

      setCollections(prev => [...prev, data])
      toast.success(`Created collection: ${newCollectionName}`)
      setNewCollectionName('')
      setShowNewCollectionModal(false)
    } catch (err: any) {
      toast.error('Failed to create collection: ' + err.message)
    } finally {
      setIsCreatingCollection(false)
    }
  }

  // ----------------------------------------
  // RENDER CARD COMPONENT (25% Enlarged)
  // ----------------------------------------

  const renderCard = (item: SavedInternship) => {
    const job = item.internships
    if (!job) return null

    const key = `${job.source}|${job.external_id}`
    const isApplied = appliedKeys.has(key)
    const matchDetail = calculateMatch(job)

    const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      job.company_name
    )}&backgroundColor=0f172a,1e293b,334155`

    return (
      <div
        key={item.id}
        draggable
        onDragStart={(e) => handleDragStart(e, job.id)}
        className="bg-slate-950/40 border border-white/5 p-5 rounded-xl hover:border-white/10 transition-all duration-300 relative group flex flex-col justify-between h-full min-h-[220px] cursor-grab active:cursor-grabbing"
      >
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-pink-500/5 rounded-full blur-xl group-hover:bg-pink-500/10 transition-colors pointer-events-none" />

        <div className="space-y-4">
          <div className="flex justify-between items-start gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded bg-slate-900 border border-white/10 overflow-hidden shrink-0">
                <img 
                  src={job.company_logo || defaultAvatar} 
                  alt={job.company_name} 
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = defaultAvatar }}
                />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-white truncate line-clamp-1">{job.role}</h4>
                <p className="text-xs text-slate-400 truncate mt-0.5">{job.company_name}</p>
              </div>
            </div>

            <button
              onClick={() => handleRemoveBookmark(item.id, job.id, job.role)}
              className="p-1.5 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition-colors shrink-0"
              title="Remove Bookmark"
            >
              <BookmarkX className="h-4 w-4" />
            </button>
          </div>

          {/* Location & Stipend Badges */}
          <div className="flex flex-wrap gap-1.5 text-[10px] font-medium font-mono text-slate-400">
            <Badge variant="outline" className="border-white/5 py-0.5 px-2">{job.location_type}</Badge>
            <Badge variant="outline" className="border-white/5 py-0.5 px-2 truncate max-w-[140px]">{job.location || 'Remote'}</Badge>
            {job.stipend && <Badge variant="outline" className="border-pink-500/10 bg-pink-500/5 text-pink-400 py-0.5 px-2">{job.stipend}</Badge>}
          </div>

          {/* Interactive Match Badge */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setHoveredMatchJobId(hoveredMatchJobId === job.id ? null : job.id)
              }}
              className={`text-[10px] font-mono font-bold px-2 py-1 rounded border cursor-pointer select-none transition-all flex items-center gap-1 ${
                matchDetail.score >= 80
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                  : matchDetail.score >= 60
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                  : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
              }`}
            >
              <Sparkles className="h-3 w-3" /> {matchDetail.score}% Match
            </button>

            <AnimatePresence>
              {hoveredMatchJobId === job.id && (
                <>
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setHoveredMatchJobId(null)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                    className="absolute left-0 bottom-8 z-50 w-72 rounded-lg bg-slate-950 border border-white/10 p-4 shadow-2xl backdrop-blur-xl text-slate-100 flex flex-col gap-3 text-left"
                  >
                    <h5 className="font-extrabold text-xs text-white">Score Breakdown</h5>
                    <div className="space-y-1 text-[11px] text-slate-350 border-b border-white/5 pb-2">
                      {matchDetail.reasons.map((r, idx) => (
                        <p key={idx}>• {r}</p>
                      ))}
                    </div>
                    {/* Skill gaps */}
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500">Skill Gap</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {matchDetail.has.map((s, idx) => (
                          <span key={idx} className="bg-emerald-500/5 text-emerald-400 text-[10px] px-2 py-0.5 rounded">✓ {s}</span>
                        ))}
                        {matchDetail.missing.map((s, idx) => (
                          <span key={idx} className="bg-rose-500/5 text-rose-400 text-[10px] px-2 py-0.5 rounded">✗ {s}</span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Apply triggers */}
        <div className="mt-5 pt-3 border-t border-white/5 flex justify-end">
          {isApplied ? (
            <Badge className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-xs py-0.5 px-3 flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" /> Applied
            </Badge>
          ) : (
            <Button
              onClick={() => handleApplyClick(job)}
              size="sm"
              className="bg-slate-900 border border-white/10 hover:bg-slate-800 text-white font-bold text-xs h-8 px-3 rounded flex items-center gap-1.5"
            >
              Apply <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <FolderHeart className="h-7 w-7 text-pink-500" /> Saved Board
          </h2>
          <p className="text-slate-400 text-sm mt-1.5">
            Organize bookmarks into collections, audit match suitability, and execute applications.
          </p>
        </div>

        {/* View toggles & Add Collection controls */}
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setShowNewCollectionModal(true)}
            size="default"
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-2 px-4 rounded-lg flex items-center gap-1.5"
          >
            <Plus className="h-5 w-5" /> New Collection
          </Button>

          <div className="flex bg-slate-900 p-1 rounded-lg border border-white/5">
            <button
              onClick={() => setViewMode('board')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'board' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Board View"
            >
              <Kanban className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-24">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
        </div>
      ) : savedItems.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/20 border border-white/5 rounded-xl">
          <Bookmark className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-300 text-sm">No bookmarks saved</h3>
          <p className="text-xs text-slate-500 mt-1">Save internships to see them populated here.</p>
        </div>
      ) : viewMode === 'board' ? (
        /* Board View (Kanban columns - widened to w-80 and gap-8) */
        <div className="flex gap-8 overflow-x-auto pb-8 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent select-none">
          
          {/* Unassigned column */}
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, 'unassigned')}
            className="w-80 shrink-0 bg-slate-900/20 border border-white/5 rounded-xl p-5 flex flex-col gap-5 backdrop-blur-md min-h-[480px]"
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <span className="font-bold text-sm text-slate-400">Unassigned Bookmarks</span>
              <Badge variant="outline" className="border-white/5 text-[10px] font-mono py-0.5 px-2">
                {savedItems.filter(item => !collectionMappings.has(item.internship_id)).length}
              </Badge>
            </div>
            
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[420px] scrollbar-none pr-1">
              {savedItems
                .filter(item => !collectionMappings.has(item.internship_id))
                .map(item => renderCard(item))}
            </div>
          </div>

          {/* Collections columns */}
          {collections.map((col) => {
            const colItems = savedItems.filter(item => collectionMappings.get(item.internship_id) === col.id)

            return (
              <div
                key={col.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, col.id)}
                className="w-80 shrink-0 bg-slate-900/20 border border-white/5 rounded-xl p-5 flex flex-col gap-5 backdrop-blur-md min-h-[480px]"
              >
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="font-bold text-sm text-slate-200 flex items-center gap-2">
                    <Folder className="h-4.5 w-4.5 text-blue-500" /> {col.name}
                  </span>
                  <Badge variant="outline" className="border-white/5 text-[10px] font-mono text-blue-400 py-0.5 px-2">
                    {colItems.length}
                  </Badge>
                </div>

                <div className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[420px] scrollbar-none pr-1">
                  {colItems.map(item => renderCard(item))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {savedItems.map((item) => renderCard(item))}
        </div>
      )}

      {/* Confirmation Apply Modal */}
      <Dialog open={showApplyModal} onOpenChange={(open) => {
        if (!open) {
          setShowApplyModal(false)
          setActiveApplyJob(null)
        }
      }}>
        <DialogContent className="max-w-md bg-slate-950 border border-white/10 p-6 text-slate-100 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-white">Application Checklist</DialogTitle>
            <DialogDescription className="text-slate-400 text-sm mt-1.5">
              You are being redirected to the application portal for **{activeApplyJob?.role}** at **{activeApplyJob?.company_name}**.
            </DialogDescription>
          </DialogHeader>

          <div className="py-5 text-center border-y border-white/5 my-5 space-y-4">
            <p className="text-base font-semibold text-slate-200">
              Did you submit your application?
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Confirming "Yes" will automatically index this internship into your Applications tracking system.
            </p>

            {/* Resume Selection */}
            <div className="space-y-3 mt-5 text-left">
              <label className="text-xs uppercase font-bold tracking-wider text-slate-500">Assign Resume</label>
              {resumes.length === 0 ? (
                <div className="flex items-center gap-2 p-3 rounded bg-amber-500/5 border border-amber-500/15 text-amber-400 text-xs leading-relaxed">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>No resumes in Vault. Go to Vault to upload one or continue without.</span>
                </div>
              ) : (
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="w-full rounded border border-white/10 bg-slate-900 p-3 text-sm text-white focus:outline-none"
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

          <DialogFooter className="flex flex-row justify-end gap-3">
            <Button
              variant="outline"
              disabled={isSubmittingApplication}
              onClick={() => handleConfirmApplication(false)}
              className="border-white/10 hover:bg-white/5 text-slate-350 text-sm px-5 h-10"
            >
              Not Yet
            </Button>
            <Button
              disabled={isSubmittingApplication}
              onClick={() => handleConfirmApplication(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-5 h-10 flex items-center gap-2"
            >
              {isSubmittingApplication && <Loader2 className="h-4 w-4 animate-spin" />}
              Yes, I Applied
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Collection Modal Dialog */}
      <Dialog open={showNewCollectionModal} onOpenChange={setShowNewCollectionModal}>
        <DialogContent className="max-w-sm bg-slate-950 border border-white/10 p-6 text-slate-100 backdrop-blur-xl">
          <form onSubmit={handleCreateCollection} className="space-y-5">
            <DialogHeader>
              <DialogTitle className="text-base font-extrabold text-white">Create Bookmark Collection</DialogTitle>
              <DialogDescription className="text-slate-400 text-xs mt-1">
                Organize your bookmarked internships in custom categories.
              </DialogDescription>
            </DialogHeader>

            <input
              type="text"
              placeholder="e.g. Dream Companies, Summer 2027"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              className="w-full rounded border border-white/10 bg-slate-900 p-3 text-sm text-white focus:outline-none"
              required
            />

            <DialogFooter className="flex justify-end gap-2.5 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewCollectionModal(false)}
                className="border-white/10 hover:bg-white/5 text-slate-300 text-xs h-8 px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingCollection}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-8 px-4 flex items-center gap-1"
              >
                {isCreatingCollection && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
