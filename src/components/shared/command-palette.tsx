'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Search,
  LayoutDashboard,
  User,
  LogOut,
  Sparkles,
  Link as LinkIcon,
  Bell,
  X,
  CornerDownLeft,
  Compass,
  Bookmark,
  ClipboardList,
  BookOpen,
  Video,
  Award,
  Building,
  Loader2
} from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface CommandItem {
  id: string
  label: string
  category: string
  icon: React.ReactNode
  action: () => void
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const router = useRouter()
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)

  // Dynamic DB search results
  const [dbResults, setDbResults] = useState<{
    questions: any[]
    experiences: any[]
    companies: string[]
    skills: any[]
  }>({
    questions: [],
    experiences: [],
    companies: [],
    skills: []
  })
  const [dbLoading, setDbLoading] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Debounced Supabase search across Questions, Experiences, Companies, Skills
  useEffect(() => {
    if (!search.trim()) {
      setDbResults({ questions: [], experiences: [], companies: [], skills: [] })
      return
    }

    setDbLoading(true)
    const delayDebounce = setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // 1. Query saved questions
        const { data: qData } = await supabase
          .from('interview_questions')
          .select('id, title, category')
          .eq('user_id', user.id)
          .or(`title.ilike.%${search}%,answer.ilike.%${search}%`)
          .limit(3)

        // 2. Query experiences (public or user's own)
        const { data: expData } = await supabase
          .from('interview_experiences')
          .select('id, company, role')
          .or(`company.ilike.%${search}%,role.ilike.%${search}%`)
          .limit(3)

        // 3. Query internships/companies
        const { data: compData } = await supabase
          .from('internships')
          .select('company_name')
          .ilike('company_name', `%${search}%`)
          .limit(6)
        
        const uniqueCompanies = Array.from(
          new Set((compData || []).map((c: any) => c.company_name))
        ).slice(0, 3)

        // 4. Query active skills
        const { data: skillData } = await supabase
          .from('skills')
          .select('id, skill_name, progress')
          .eq('user_id', user.id)
          .ilike('skill_name', `%${search}%`)
          .limit(3)

        setDbResults({
          questions: qData || [],
          experiences: expData || [],
          companies: uniqueCompanies,
          skills: skillData || []
        })
      } catch (err) {
        console.error('Error querying command palette:', err)
      } finally {
        setDbLoading(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [search])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out successfully')
    router.push('/')
    setIsOpen(false)
  }

  // Base navigation commands
  const baseCommands: CommandItem[] = [
    {
      id: 'dashboard',
      label: 'Go to Dashboard Overview',
      category: 'Navigation',
      icon: <LayoutDashboard className="h-4 w-4" />,
      action: () => {
        router.push('/dashboard')
        setIsOpen(false)
      }
    },
    {
      id: 'discover',
      label: 'Discover Internships',
      category: 'Navigation',
      icon: <Compass className="h-4 w-4" />,
      action: () => {
        router.push('/dashboard/internships')
        setIsOpen(false)
      }
    },
    {
      id: 'interviews',
      label: 'Go to Interview Hub',
      category: 'Navigation',
      icon: <Video className="h-4 w-4" />,
      action: () => {
        router.push('/dashboard/interviews')
        setIsOpen(false)
      }
    },
    {
      id: 'questions',
      label: 'Go to Question Bank',
      category: 'Navigation',
      icon: <BookOpen className="h-4 w-4" />,
      action: () => {
        router.push('/dashboard/questions')
        setIsOpen(false)
      }
    },
    {
      id: 'skills',
      label: 'Go to Skills & Goals',
      category: 'Navigation',
      icon: <Award className="h-4 w-4" />,
      action: () => {
        router.push('/dashboard/skills')
        setIsOpen(false)
      }
    },
    {
      id: 'community',
      label: 'Go to Community Experiences Feed',
      category: 'Navigation',
      icon: <Sparkles className="h-4 w-4" />,
      action: () => {
        router.push('/community/interviews')
        setIsOpen(false)
      }
    },
    {
      id: 'saved',
      label: 'Saved Bookmarks',
      category: 'Navigation',
      icon: <Bookmark className="h-4 w-4" />,
      action: () => {
        router.push('/dashboard/saved')
        setIsOpen(false)
      }
    },
    {
      id: 'applications',
      label: 'Track Applications',
      category: 'Navigation',
      icon: <ClipboardList className="h-4 w-4" />,
      action: () => {
        router.push('/dashboard/applications')
        setIsOpen(false)
      }
    },
    {
      id: 'profile',
      label: 'View Profile Settings',
      category: 'Navigation',
      icon: <User className="h-4 w-4" />,
      action: () => {
        router.push('/dashboard/profile')
        setIsOpen(false)
      }
    },
    {
      id: 'copy-link',
      label: 'Copy Profile Link',
      category: 'System',
      icon: <LinkIcon className="h-4 w-4" />,
      action: () => {
        navigator.clipboard.writeText(window.location.origin + '/dashboard/profile')
        toast.success('Profile URL copied to clipboard!')
        setIsOpen(false)
      }
    },
    {
      id: 'logout',
      label: 'Sign Out of InternHQ',
      category: 'Session',
      icon: <LogOut className="h-4 w-4" />,
      action: handleSignOut
    }
  ]

  // Filter commands matching search
  const filteredCommands = baseCommands.filter((cmd) =>
    cmd.label.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  )

  // Map DB search results into custom command items dynamically
  const dynamicItems: CommandItem[] = [
    ...dbResults.questions.map((q) => ({
      id: `question-${q.id}`,
      label: `Question: ${q.title} (${q.category})`,
      category: 'Saved Questions',
      icon: <BookOpen className="h-4 w-4 text-blue-400" />,
      action: () => {
        router.push('/dashboard/questions')
        setIsOpen(false)
      }
    })),
    ...dbResults.experiences.map((exp) => ({
      id: `exp-${exp.id}`,
      label: `Review: ${exp.company} - ${exp.role} Experience`,
      category: 'Experiences',
      icon: <Video className="h-4 w-4 text-purple-400" />,
      action: () => {
        router.push('/community/interviews')
        setIsOpen(false)
      }
    })),
    ...dbResults.companies.map((compName) => ({
      id: `company-${compName}`,
      label: `Insights: View ${compName} Profile`,
      category: 'Companies',
      icon: <Building className="h-4 w-4 text-amber-400" />,
      action: () => {
        router.push(`/dashboard/company/${encodeURIComponent(compName)}`)
        setIsOpen(false)
      }
    })),
    ...dbResults.skills.map((skill) => ({
      id: `skill-${skill.id}`,
      label: `Skill: ${skill.skill_name} (${skill.progress}% Complete)`,
      category: 'Skills Progress',
      icon: <Award className="h-4 w-4 text-emerald-400" />,
      action: () => {
        router.push('/dashboard/skills')
        setIsOpen(false)
      }
    }))
  ]

  // Combine commands and dynamic DB results
  const allAvailableItems = [...dynamicItems, ...filteredCommands]

  useEffect(() => {
    setActiveIndex(0)
  }, [search, dbResults])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev + 1) % allAvailableItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev - 1 + allAvailableItems.length) % allAvailableItems.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (allAvailableItems[activeIndex]) {
        allAvailableItems[activeIndex].action()
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  // Categories present in current results
  const categories = Array.from(new Set(allAvailableItems.map((item) => item.category)))

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-900/90 border border-white/10 hover:border-white/20 backdrop-blur-md text-xs text-slate-400 hover:text-slate-200 transition-all duration-350 shadow-xl"
      >
        <Sparkles className="h-3.5 w-3.5 text-blue-400" />
        <span>Command Menu</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-white/10 bg-slate-800 px-1.5 font-mono text-[10px] font-medium text-slate-400">
          <span>⌘</span>K
        </kbd>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl bg-slate-950/80 border border-white/10 p-0 shadow-2xl backdrop-blur-xl gap-0 overflow-hidden text-slate-100">
          <div className="flex items-center border-b border-white/10 px-4 py-3 bg-slate-950/40">
            <Search className="mr-3 h-5 w-5 shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search console dashboard, questions, experiences, skills or companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex h-10 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              autoFocus
            />
            {dbLoading && <Loader2 className="h-4 w-4 text-blue-500 animate-spin mr-3" />}
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none"
            >
              <X className="h-4 w-4" text-slate-400 />
            </button>
          </div>

          <div className="max-h-[360px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-800">
            {allAvailableItems.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500">
                No matching results found for "{search}".
              </div>
            ) : (
              categories.map((category) => {
                const categoryItems = allAvailableItems.filter((item) => item.category === category)
                return (
                  <div key={category} className="mb-2">
                    <h3 className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {category}
                    </h3>
                    <div className="space-y-0.5">
                      {categoryItems.map((item) => {
                        const itemIndex = allAvailableItems.findIndex((fi) => fi.id === item.id)
                        const isActive = itemIndex === activeIndex
                        return (
                          <div
                            key={item.id}
                            onClick={() => item.action()}
                            onMouseEnter={() => setActiveIndex(itemIndex)}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-all duration-150 ${
                              isActive
                                ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/10 text-white border border-white/10'
                                : 'text-slate-300 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={isActive ? 'text-blue-400' : 'text-slate-400'}>
                                {item.icon}
                              </span>
                              <span className="truncate max-w-[450px]">{item.label}</span>
                            </div>
                            {isActive && (
                              <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                                <CornerDownLeft className="h-3 w-3" />
                                enter
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>
          <div className="flex items-center justify-between border-t border-white/5 px-4 py-2.5 bg-slate-900/40 text-[10px] text-slate-500 font-mono">
            <div className="flex items-center gap-3">
              <span>↑↓ Navigation</span>
              <span>↵ Select</span>
            </div>
            <span>ESC to close</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
