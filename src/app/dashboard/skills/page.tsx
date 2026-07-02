'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Award,
  TrendingUp,
  Plus,
  Trash2,
  CheckCircle,
  HelpCircle,
  Code,
  Target,
  Trophy,
  Loader2,
  Lock,
  Check,
  ChevronRight,
  Smile,
  X
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface Skill {
  id: string
  skill_name: string
  progress: number
}

interface CareerGoal {
  id: string
  title: string
  target_value: number
  current_value: number
  is_completed: boolean
}

interface Achievement {
  id: string
  badge_type: string
  unlocked_at: string
}

// Badge specifications for the Trophy Cabinet
const BADGE_TEMPLATES = [
  {
    type: 'Profile Complete',
    title: 'Profile Complete',
    desc: 'Verify onboarding details and resume references.',
    icon: '👤',
    color: 'from-blue-650 to-blue-500 shadow-blue-500/20'
  },
  {
    type: 'Resume Uploaded',
    title: 'Resume Uploaded',
    desc: 'Upload your first resume version into the Vault.',
    icon: '📄',
    color: 'from-teal-650 to-teal-500 shadow-teal-500/20'
  },
  {
    type: 'First Application',
    title: 'First Application',
    desc: 'Initialize your first internship pipeline tracker.',
    icon: '🚀',
    color: 'from-purple-650 to-purple-500 shadow-purple-500/20'
  },
  {
    type: '10 Applications',
    title: 'Pipeline Builder',
    desc: 'Submit ten applications to establish active pipeline matches.',
    icon: '💼',
    color: 'from-pink-650 to-pink-500 shadow-pink-500/20'
  },
  {
    type: 'First Interview',
    title: 'First Interview',
    desc: 'Schedule your first interview round in the console.',
    icon: '🎤',
    color: 'from-amber-650 to-amber-500 shadow-amber-500/20'
  },
  {
    type: 'Interview Ready',
    title: 'Interview Ready',
    desc: 'Check off your first preparation checklist item.',
    icon: '🎯',
    color: 'from-orange-650 to-orange-500 shadow-orange-500/20'
  },
  {
    type: 'First Offer',
    title: 'First Offer',
    desc: 'Secure your first internship offer!',
    icon: '🏆',
    color: 'from-yellow-600 to-yellow-450 shadow-yellow-500/20'
  }
]

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [goals, setGoals] = useState<CareerGoal[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)

  // Add Goal Form State
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false)
  const [goalTitle, setGoalTitle] = useState('')
  const [goalTarget, setGoalTarget] = useState(10)
  const [goalCurrent, setGoalCurrent] = useState(0)
  const [goalSubmitting, setGoalSubmitting] = useState(false)

  const supabase = createClient()

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch Skills
      const { data: skillsData, error: skillsErr } = await supabase
        .from('skills')
        .select('*')
        .eq('user_id', user.id)
        .order('skill_name', { ascending: true })

      if (skillsErr) throw skillsErr
      setSkills(skillsData || [])

      // Fetch Goals
      const { data: goalsData, error: goalsErr } = await supabase
        .from('career_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (goalsErr) throw goalsErr
      setGoals(goalsData || [])

      // Fetch Achievements
      const { data: achievementsData, error: achievementsErr } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', user.id)

      if (achievementsErr) throw achievementsErr
      setAchievements(achievementsData || [])

    } catch (e: any) {
      toast.error('Failed to load data: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Skill manual progress updates
  const handleSkillChange = async (id: string, skillName: string, val: number) => {
    // Update locally first for immediate slider feedback
    setSkills(prev => prev.map(s => s.id === id ? { ...s, progress: val } : s))

    try {
      const { error } = await supabase
        .from('skills')
        .update({ progress: val, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    } catch (e: any) {
      toast.error(`Failed to update ${skillName} progress: ` + e.message)
    }
  }

  // Handle slider release / save complete
  const handleSkillSaveSuccess = (skillName: string, val: number) => {
    toast.success(`${skillName} updated to ${val}%`)
  }

  // Create Goal
  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!goalTitle || goalTarget <= 0) {
      toast.error('Please enter valid goal details')
      return
    }

    try {
      setGoalSubmitting(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const newGoal = {
        user_id: user.id,
        title: goalTitle,
        target_value: goalTarget,
        current_value: goalCurrent,
        is_completed: goalCurrent >= goalTarget
      }

      const { data, error } = await supabase
        .from('career_goals')
        .insert(newGoal)
        .select()
        .single()

      if (error) throw error

      toast.success('Career goal added!')
      setGoals(prev => [...prev, data])
      setIsAddGoalOpen(false)
      setGoalTitle('')
      setGoalTarget(10)
      setGoalCurrent(0)
    } catch (e: any) {
      toast.error('Failed to create goal: ' + e.message)
    } finally {
      setGoalSubmitting(false)
    }
  }

  // Update Goal progress
  const handleIncrementGoal = async (id: string, current: number, target: number) => {
    const nextVal = Math.min(target, current + 1)
    const completed = nextVal >= target

    try {
      setGoals(prev => prev.map(g => g.id === id ? { ...g, current_value: nextVal, is_completed: completed } : g))

      const { error } = await supabase
        .from('career_goals')
        .update({ 
          current_value: nextVal, 
          is_completed: completed,
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)

      if (error) throw error
      if (completed && current < target) {
        toast.success('Goal completed! Keep it up! 🎉')
      }
    } catch (e: any) {
      toast.error('Failed to update goal: ' + e.message)
    }
  }

  const handleDeleteGoal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('career_goals')
        .delete()
        .eq('id', id)

      if (error) throw error
      setGoals(prev => prev.filter(g => g.id !== id))
      toast.success('Goal removed')
    } catch (e: any) {
      toast.error('Failed to delete goal: ' + e.message)
    }
  }

  // Calculate Overall Career Readiness Score (avg of all skills)
  const readinessScore = skills.length > 0 
    ? Math.round(skills.reduce((acc, curr) => acc + curr.progress, 0) / skills.length)
    : 0

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="border-b border-white/5 pb-5">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
          <Target className="h-7 w-7 text-blue-500" />
          Readiness & Skills Console
        </h1>
        <p className="text-slate-400 text-xs md:text-sm mt-1">
          Measure codebase language proficiencies, monitor career progress parameters, and review unlocked achievements.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Skills & Goals (spans 2) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Skill Slider Console */}
            <Card className="bg-slate-900/40 border-white/5 p-6 backdrop-blur-md">
              <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-5">
                <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                  <Code className="h-4.5 w-4.5 text-blue-500" />
                  Stack Skill Progress
                </h3>
                <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono">
                  {readinessScore}% Overall Readiness
                </Badge>
              </div>

              {skills.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-6">No skills found. Triggering seeding...</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                  {skills.map((skill) => (
                    <div key={skill.id} className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300">{skill.skill_name}</span>
                        <span className="font-mono text-slate-400 text-[11px]">{skill.progress}%</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={skill.progress}
                          onChange={(e) => handleSkillChange(skill.id, skill.skill_name, parseInt(e.target.value))}
                          onMouseUp={() => handleSkillSaveSuccess(skill.skill_name, skill.progress)}
                          onTouchEnd={() => handleSkillSaveSuccess(skill.skill_name, skill.progress)}
                          className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Career Goals Section */}
            <Card className="bg-slate-900/40 border-white/5 p-6 backdrop-blur-md">
              <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-5">
                <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                  <Target className="h-4.5 w-4.5 text-purple-500" />
                  Career Goals Visualizer
                </h3>
                <Button 
                  onClick={() => setIsAddGoalOpen(true)}
                  size="sm"
                  className="bg-slate-950 border border-white/5 text-slate-350 hover:bg-slate-900 text-[10px] font-bold h-7 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Goal
                </Button>
              </div>

              {goals.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  <Target className="h-8 w-8 text-slate-650 mx-auto mb-2" />
                  <p className="font-semibold">Define your career targets</p>
                  <p className="text-[10px] mt-0.5">Define metrics like application counts, DSA solves, or project checkpoints.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {goals.map((goal) => {
                    const pct = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
                    return (
                      <div key={goal.id} className="p-4 bg-slate-950/40 border border-white/5 rounded-xl space-y-3 relative group">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="block font-bold text-xs text-white flex items-center gap-2">
                              {goal.title}
                              {goal.is_completed && <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0 fill-current bg-slate-950 rounded-full" />}
                            </span>
                            <span className="block text-[10px] text-slate-500 mt-1 font-mono">
                              Progress: {goal.current_value} / {goal.target_value} ({pct}%)
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                            {!goal.is_completed && (
                              <Button
                                onClick={() => handleIncrementGoal(goal.id, goal.current_value, goal.target_value)}
                                size="sm"
                                className="bg-blue-500/10 border border-blue-500/20 text-blue-450 hover:bg-blue-500/20 text-[9px] font-bold h-7 py-1 px-2.5 rounded-lg flex items-center gap-0.5"
                              >
                                Log Progress +1
                              </Button>
                            )}
                            <button
                              onClick={() => handleDeleteGoal(goal.id)}
                              className="text-slate-650 hover:text-rose-400 p-1.5 transition-colors border border-white/5 hover:border-white/10 rounded bg-slate-950/40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              goal.is_completed ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

          </div>

          {/* Right Column: Achievements Trophy Cabinet (spans 1) */}
          <div className="space-y-8">
            <Card className="bg-slate-900/40 border-white/5 p-6 backdrop-blur-md h-full">
              <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-5">
                <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                  <Trophy className="h-4.5 w-4.5 text-yellow-500" />
                  Trophy Cabinet
                </h3>
                <Badge className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/25 text-[9px] font-mono">
                  {achievements.length} Unlocked
                </Badge>
              </div>

              {/* Achievements Grid List */}
              <div className="space-y-4">
                {BADGE_TEMPLATES.map((tmpl) => {
                  const unlockData = achievements.find(a => a.badge_type === tmpl.type)
                  const isUnlocked = !!unlockData

                  return (
                    <div 
                      key={tmpl.type}
                      className={`p-3 border rounded-xl flex gap-3.5 items-center relative overflow-hidden transition-all duration-350 ${
                        isUnlocked 
                          ? 'bg-slate-900/60 border-white/10 shadow-md group' 
                          : 'bg-slate-950/20 border-white/5 opacity-55 hover:opacity-75'
                      }`}
                    >
                      {/* Glow inside unlocked item */}
                      {isUnlocked && (
                        <div className="absolute top-0 right-0 w-[80px] h-[80px] bg-gradient-to-bl from-white/5 to-transparent rounded-full pointer-events-none" />
                      )}

                      {/* Badge Icon circle */}
                      <div className={`h-11 w-11 rounded-full shrink-0 flex items-center justify-center text-lg relative ${
                        isUnlocked 
                          ? `bg-gradient-to-tr ${tmpl.color} text-white` 
                          : 'bg-slate-950 border border-white/5 text-slate-500'
                      }`}>
                        {tmpl.icon}
                        
                        {/* Little unlocked checkmark indicator */}
                        {isUnlocked && (
                          <span className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 border border-slate-900 h-4 w-4 rounded-full flex items-center justify-center text-[8px] text-white">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                        {!isUnlocked && (
                          <span className="absolute -bottom-0.5 -right-0.5 bg-slate-950 border border-white/5 h-4 w-4 rounded-full flex items-center justify-center text-[8px] text-slate-500">
                            <Lock className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className={`block text-xs font-extrabold truncate ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>
                          {tmpl.title}
                        </span>
                        <span className="block text-[9px] text-slate-500 leading-normal mt-0.5 pr-2">
                          {tmpl.desc}
                        </span>
                        {isUnlocked && (
                          <span className="block text-[8px] text-blue-450 font-mono mt-1">
                            Unlocked: {new Date(unlockData.unlocked_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>

        </div>
      )}

      {/* CREATE GOAL MODAL */}
      <AnimatePresence>
        {isAddGoalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddGoalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-950 border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl z-50 text-slate-100 flex flex-col gap-4 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-gradient-to-bl from-blue-500/5 to-purple-500/5 rounded-full blur-[40px] pointer-events-none" />

              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Target className="h-4.5 w-4.5 text-purple-500" />
                  Define Career Goal
                </h3>
                <button onClick={() => setIsAddGoalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddGoal} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Goal Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Complete 100 DSA questions"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Target Metrics *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 50"
                      value={goalTarget}
                      onChange={(e) => setGoalTarget(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Initial Value</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 0"
                      value={goalCurrent}
                      onChange={(e) => setGoalCurrent(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsAddGoalOpen(false)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={goalSubmitting}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs px-4"
                  >
                    {goalSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Goal'}
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
