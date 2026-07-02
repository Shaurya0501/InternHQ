'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  MessageSquare,
  Search,
  Users,
  Calendar,
  ThumbsUp,
  Eye,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Award,
  Filter,
  ArrowUpDown,
  BookOpen,
  Loader2
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

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

export default function CommunityExperiencesPage() {
  const [experiences, setExperiences] = useState<CommunityExperience[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All')
  const [sortBy, setSortBy] = useState<'newest' | 'helpful' | 'views'>('newest')
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
  const [votedIds, setVotedIds] = useState<Record<string, boolean>>({})

  const supabase = createClient()

  const fetchExperiences = async () => {
    try {
      setLoading(true)
      
      // Fetch public experiences and join profiles table to display authors
      const { data, error } = await supabase
        .from('interview_experiences')
        .select(`
          *,
          profiles (
            full_name,
            university
          )
        `)
        .eq('is_public', true)

      if (error) throw error
      setExperiences(data || [])
    } catch (e: any) {
      toast.error('Failed to load community experiences: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExperiences()
  }, [])

  const handleUpvote = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (votedIds[id]) {
      toast.info('You have already upvoted this experience')
      return
    }

    try {
      // Fetch current helpful_votes
      const { data, error: fetchErr } = await supabase
        .from('interview_experiences')
        .select('helpful_votes')
        .eq('id', id)
        .single()

      if (fetchErr) throw fetchErr

      const currentVotes = data?.helpful_votes || 0

      // Update count
      const { error } = await supabase
        .from('interview_experiences')
        .update({ helpful_votes: currentVotes + 1 })
        .eq('id', id)

      if (error) throw error

      setExperiences(prev =>
        prev.map(exp => exp.id === id ? { ...exp, helpful_votes: currentVotes + 1 } : exp)
      )
      setVotedIds(prev => ({ ...prev, [id]: true }))
      toast.success('Thanks for voting!')
    } catch (e: any) {
      toast.error('Failed to upvote: ' + e.message)
    }
  }

  const handleExpandCard = async (id: string, currentlyExpanded: boolean) => {
    setExpandedIds(prev => ({ ...prev, [id]: !currentlyExpanded }))
    
    // Increment view count if expanding
    if (!currentlyExpanded) {
      try {
        const { data, error: fetchErr } = await supabase
          .from('interview_experiences')
          .select('views_count')
          .eq('id', id)
          .single()

        if (fetchErr) throw fetchErr

        const currentViews = data?.views_count || 0

        await supabase
          .from('interview_experiences')
          .update({ views_count: currentViews + 1 })
          .eq('id', id)

        setExperiences(prev =>
          prev.map(exp => exp.id === id ? { ...exp, views_count: currentViews + 1 } : exp)
        )
      } catch (e) {
        console.error('Failed to increment views: ', e)
      }
    }
  }

  // Filter & Search Logic
  const filteredExperiences = experiences.filter((exp) => {
    const matchesSearch = exp.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          exp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          exp.questions_asked.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (exp.preparation_tips || '').toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDifficulty = difficultyFilter === 'All' || exp.difficulty === difficultyFilter

    return matchesSearch && matchesDifficulty
  })

  // Sorting Logic
  const sortedExperiences = [...filteredExperiences].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    } else if (sortBy === 'helpful') {
      return b.helpful_votes - a.helpful_votes
    } else {
      return b.views_count - a.views_count
    }
  })

  // difficulty badge colors
  const difficultyBadges = {
    Easy: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    Medium: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    Hard: 'bg-rose-500/10 border-rose-500/20 text-rose-400'
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="border-b border-white/5 pb-5">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
          <Users className="h-7 w-7 text-purple-500" />
          Community Interview Feed
        </h1>
        <p className="text-slate-400 text-xs md:text-sm mt-1">
          Review authentic hiring processes, questions asked, and preparation advice shared by other students.
        </p>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-slate-900/30 border border-white/5 p-4 rounded-xl backdrop-blur-md flex flex-col sm:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by company, role, key topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-white/5 focus:border-white/10 rounded-lg pl-9 pr-4 py-2 text-slate-255 placeholder:text-slate-500 text-xs focus:outline-none transition-colors"
          />
        </div>

        {/* Filters and Sorters */}
        <div className="flex flex-wrap gap-4 items-center w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span>Difficulty:</span>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="bg-slate-950 border border-white/5 rounded-lg px-2 py-1.5 text-slate-350 focus:outline-none text-[11px]"
            >
              <option value="All">All Levels</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-white/5 rounded-lg px-2 py-1.5 text-slate-350 focus:outline-none text-[11px]"
            >
              <option value="newest">Newest First</option>
              <option value="helpful">Most Helpful</option>
              <option value="views">Most Viewed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Experiences feed list */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : sortedExperiences.length === 0 ? (
        <Card className="bg-slate-900/20 border-white/5 p-12 text-center">
          <MessageSquare className="h-10 w-10 text-slate-650 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-semibold">No shared reviews found</p>
          <p className="text-slate-500 text-xs mt-1">Be the first to share your experience from your console.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedExperiences.map((exp) => {
            const isExpanded = !!expandedIds[exp.id]
            const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
              exp.company
            )}&backgroundColor=0f172a,1e293b,334155`

            const authorName = exp.is_anonymous 
              ? 'Anonymous Student' 
              : exp.profiles?.full_name || 'Student Candidate'
            
            const authorSchool = exp.is_anonymous
              ? 'Verified Candidate'
              : exp.profiles?.university || 'Top University'

            const dateStr = new Date(exp.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })

            return (
              <Card 
                key={exp.id}
                onClick={() => handleExpandCard(exp.id, isExpanded)}
                className={`bg-slate-900/40 border transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md ${
                  isExpanded ? 'border-white/10 bg-slate-900/60 shadow-xl' : 'border-white/5 hover:border-white/10'
                }`}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Summary Card Header */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex gap-3">
                      <div className="h-10 w-10 rounded-lg border border-white/10 bg-slate-950 flex items-center justify-center shrink-0 overflow-hidden">
                        <img src={defaultAvatar} alt="Logo" className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-100">{exp.company}</h3>
                        <p className="text-xs text-slate-400 font-medium truncate max-w-[250px] mt-0.5">{exp.role}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge className={`text-[8px] font-mono py-0 scale-95 border ${difficultyBadges[exp.difficulty]}`}>
                        {exp.difficulty} Difficulty
                      </Badge>
                      <Badge className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-mono py-0 scale-90">
                        {exp.outcome}
                      </Badge>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap gap-4 items-center justify-between text-[10px] text-slate-500 border-t border-b border-white/5 py-2">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-350">{authorName}</span>
                      <span>•</span>
                      <span>{authorSchool}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {dateStr}</span>
                      <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {exp.helpful_votes} helpful</span>
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {exp.views_count} views</span>
                    </div>
                  </div>

                  {/* Short Process preview */}
                  {!isExpanded && (
                    <p className="text-slate-300 text-xs leading-relaxed line-clamp-2">
                      {exp.interview_process}
                    </p>
                  )}

                  {/* Accordion Expand indicator */}
                  <div className="flex justify-between items-center text-[11px]">
                    <button
                      onClick={(e) => handleUpvote(e, exp.id)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all shrink-0 ${
                        votedIds[exp.id] 
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' 
                          : 'border-white/5 hover:bg-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <ThumbsUp className="h-3 w-3" />
                      <span>{votedIds[exp.id] ? 'Upvoted' : 'Helpful'}</span>
                    </button>

                    <span className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-0.5">
                      {isExpanded ? 'Hide Details' : 'Expand Details'}
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </span>
                  </div>

                  {/* Full Details Expander */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-white/5 space-y-4 cursor-default" onClick={(e) => e.stopPropagation()}>
                          
                          <div className="space-y-1.5">
                            <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Interview Process & Timeline</h4>
                            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-white/5">
                              {exp.interview_process}
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                              <BookOpen className="h-3.5 w-3.5 text-purple-500" />
                              Questions Asked
                            </h4>
                            <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-white/5 whitespace-pre-wrap font-sans">
                              {exp.questions_asked}
                            </div>
                          </div>

                          {exp.preparation_tips && (
                            <div className="space-y-1.5">
                              <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                                Preparation Tips & Resources
                              </h4>
                              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-white/5">
                                {exp.preparation_tips}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
