'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  HelpCircle,
  Plus,
  Search,
  Star,
  StarOff,
  ChevronDown,
  ChevronUp,
  Tag,
  BookOpen,
  Filter,
  X,
  Loader2,
  Trash2,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface Question {
  id: string
  title: string
  answer: string
  category: 'Technical' | 'HR' | 'Behavioral' | 'System Design' | 'Coding'
  difficulty: 'Easy' | 'Medium' | 'Hard'
  tags: string[]
  notes?: string
  is_favorite: boolean
  created_at: string
}

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All')
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
  
  // Expanded state for answers
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Add Form State
  const [title, setTitle] = useState('')
  const [answer, setAnswer] = useState('')
  const [category, setCategory] = useState<'Technical' | 'HR' | 'Behavioral' | 'System Design' | 'Coding'>('Technical')
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium')
  const [tagsInput, setTagsInput] = useState('')
  const [notes, setNotes] = useState('')

  const supabase = createClient()

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('interview_questions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setQuestions(data || [])
    } catch (e: any) {
      toast.error('Failed to load questions: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuestions()
  }, [])

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !answer) {
      toast.error('Title and Answer are required')
      return
    }

    try {
      setFormSubmitting(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const parsedTags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)

      const newQuestion = {
        user_id: user.id,
        title,
        answer,
        category,
        difficulty,
        tags: parsedTags,
        notes: notes || null,
        is_favorite: false
      }

      const { data, error } = await supabase
        .from('interview_questions')
        .insert(newQuestion)
        .select()
        .single()

      if (error) throw error

      toast.success('Question added successfully!')
      setQuestions(prev => [data, ...prev])
      setIsAddOpen(false)
      resetForm()
    } catch (e: any) {
      toast.error('Error saving question: ' + e.message)
    } finally {
      setFormSubmitting(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setAnswer('')
    setCategory('Technical')
    setDifficulty('Medium')
    setTagsInput('')
    setNotes('')
  }

  const toggleFavorite = async (id: string, currentFav: boolean) => {
    try {
      const { error } = await supabase
        .from('interview_questions')
        .update({ is_favorite: !currentFav })
        .eq('id', id)

      if (error) throw error
      setQuestions(prev =>
        prev.map(q => q.id === id ? { ...q, is_favorite: !currentFav } : q)
      )
      toast.success(!currentFav ? 'Added to favorites' : 'Removed from favorites')
    } catch (e: any) {
      toast.error('Failed to update favorite status: ' + e.message)
    }
  }

  const handleDeleteQuestion = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation() // Prevent expanding
    if (!confirm('Are you sure you want to delete this question?')) return

    try {
      const { error } = await supabase
        .from('interview_questions')
        .delete()
        .eq('id', id)

      if (error) throw error
      setQuestions(prev => prev.filter(q => q.id !== id))
      toast.success('Question deleted')
    } catch (e: any) {
      toast.error('Failed to delete question: ' + e.message)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  // Filter & Search logic
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          q.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          q.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory = selectedCategory === 'All' || q.category === selectedCategory
    const matchesDifficulty = selectedDifficulty === 'All' || q.difficulty === selectedDifficulty
    const matchesFavorite = !showOnlyFavorites || q.is_favorite

    return matchesSearch && matchesCategory && matchesDifficulty && matchesFavorite
  })

  // Colors mapping for category and difficulty
  const difficultyBadges = {
    Easy: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    Medium: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    Hard: 'bg-rose-500/10 border-rose-500/20 text-rose-400'
  }

  const categoryBadges = {
    Technical: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    HR: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    Behavioral: 'bg-pink-500/10 border-pink-500/20 text-pink-400',
    'System Design': 'bg-orange-500/10 border-orange-500/20 text-orange-450',
    Coding: 'bg-teal-500/10 border-teal-500/20 text-teal-400'
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <BookOpen className="h-7 w-7 text-blue-500" />
            Question Bank
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Store and review technical interview questions, behavioral mock prompts, and DSA challenges.
          </p>
        </div>
        <Button 
          onClick={() => setIsAddOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs rounded-lg px-4 py-2.5 flex items-center gap-2 h-10 shadow-lg"
        >
          <Plus className="h-4 w-4" />
          Save Question
        </Button>
      </div>

      {/* Filter Options Widget */}
      <div className="bg-slate-900/30 border border-white/5 p-4 rounded-xl backdrop-blur-md space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          
          {/* Category Filters */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-white/5 overflow-x-auto scrollbar-none gap-0.5 shrink-0">
            {['All', 'Technical', 'HR', 'Behavioral', 'System Design', 'Coding'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  selectedCategory === cat 
                    ? 'bg-slate-900 border border-white/10 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search title, answer, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/60 border border-white/5 focus:border-white/10 rounded-lg pl-9 pr-4 py-2 text-slate-200 placeholder:text-slate-500 text-xs focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Secondary Filter options */}
        <div className="flex flex-wrap gap-4 items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Difficulty Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <span>Difficulty:</span>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="bg-slate-950 border border-white/5 rounded-lg px-2 py-1 text-slate-350 focus:outline-none text-[11px]"
              >
                <option value="All">All Levels</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            {/* Favorites Toggle */}
            <button
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
                showOnlyFavorites 
                  ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' 
                  : 'border-white/5 hover:bg-white/5 text-slate-400'
              }`}
            >
              <Star className="h-3.5 w-3.5" />
              <span>Favorites only</span>
            </button>
          </div>

          <div className="text-[10px] text-slate-500 font-mono">
            {filteredQuestions.length} Match(es)
          </div>
        </div>
      </div>

      {/* Questions Stack */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : filteredQuestions.length === 0 ? (
        <Card className="bg-slate-900/20 border-white/5 p-12 text-center">
          <HelpCircle className="h-10 w-10 text-slate-650 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-semibold">No questions found</p>
          <p className="text-slate-500 text-xs mt-1">Create a new item or modify active filtering criteria.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredQuestions.map((q) => {
              const isExpanded = !!expandedIds[q.id]
              return (
                <motion.div
                  key={q.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => toggleExpand(q.id)}
                  className={`bg-slate-900/40 border rounded-xl backdrop-blur-md cursor-pointer transition-all duration-300 ${
                    isExpanded ? 'border-white/10 bg-slate-900/60 shadow-xl' : 'border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <Badge className={`text-[8px] font-mono py-0 scale-95 border ${categoryBadges[q.category]}`}>
                            {q.category}
                          </Badge>
                          <Badge className={`text-[8px] font-mono py-0 scale-90 border ${difficultyBadges[q.difficulty]}`}>
                            {q.difficulty}
                          </Badge>
                        </div>
                        <h3 className="font-extrabold text-sm text-slate-100 pr-2 line-clamp-2 leading-snug">
                          {q.title}
                        </h3>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(q.id, q.is_favorite)
                          }}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            q.is_favorite 
                              ? 'border-yellow-500/20 bg-yellow-500/5 text-yellow-400 hover:text-yellow-300' 
                              : 'border-white/5 hover:bg-white/5 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          <Star className={`h-4 w-4 ${q.is_favorite ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteQuestion(e, q.id)}
                          className="p-1.5 rounded-lg border border-white/5 hover:border-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <span className="p-1 text-slate-500">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </span>
                      </div>
                    </div>

                    {/* Tags row */}
                    {q.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {q.tags.map((t, idx) => (
                          <span key={idx} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-slate-950 border border-white/5 text-[9px] font-mono text-slate-400">
                            <Tag className="h-2 w-2 text-slate-500" />
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Expanded answer panel */}
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
                              <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Suggested Answer</h4>
                              <div className="bg-slate-950/60 border border-white/5 p-4 rounded-lg text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                                {q.answer}
                              </div>
                            </div>
                            
                            {q.notes && (
                              <div className="space-y-1">
                                <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">My Notes</h4>
                                <p className="text-[11px] text-slate-400 leading-normal italic pl-2 border-l-2 border-blue-500/30">
                                  {q.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* SAVE QUESTION MODAL */}
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
                  <HelpCircle className="h-4.5 w-4.5 text-blue-500" />
                  Save New Question
                </h3>
                <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveQuestion} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Question Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Explain how useEffect cleanup works in React"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors"
                    >
                      <option value="Technical">Technical</option>
                      <option value="HR">HR / General</option>
                      <option value="Behavioral">Behavioral / STAR</option>
                      <option value="System Design">System Design</option>
                      <option value="Coding">Coding Challenge</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Difficulty *</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as any)}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Suggested Answer *</label>
                  <textarea
                    required
                    placeholder="Provide a detailed, structured response for reference..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={6}
                    className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors resize-none scrollbar-thin"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tags (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="react, frontend, hooks, closures"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Personal Notes (Optional)</label>
                  <textarea
                    placeholder="Key concepts to remember, related issues, or pitfalls..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
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
                    {formSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Question'}
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
