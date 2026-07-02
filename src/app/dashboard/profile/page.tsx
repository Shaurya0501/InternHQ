'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  User,
  GraduationCap,
  Briefcase,
  MapPin,
  Linkedin,
  Github,
  Globe,
  Lock,
  Loader2,
  CheckCircle,
  ShieldAlert,
  Plus,
  X,
  Mail,
  Calendar,
  RefreshCw,
  Settings2,
  Sparkles,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function ProfileSettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'assistant'>('profile')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Profile Form Fields State
  const [fullName, setFullName] = useState('')
  const [university, setUniversity] = useState('')
  const [degree, setDegree] = useState('')
  const [graduationYear, setGraduationYear] = useState<number>(2028)
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')

  // Tag lists state
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [roleInput, setRoleInput] = useState('')
  const [locations, setLocations] = useState<string[]>([])
  const [locationInput, setLocationInput] = useState('')
  
  // Match Engine Preferences States
  const [remotePreference, setRemotePreference] = useState<'remote' | 'hybrid' | 'onsite' | 'any'>('any')
  const [preferredTechStack, setPreferredTechStack] = useState<string[]>([])
  const [techStackInput, setTechStackInput] = useState('')

  // Password Fields
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Career Assistant States
  const [googleConfigured, setGoogleConfigured] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'Connected' | 'Disconnected' | 'Never Connected'>('Never Connected')
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStats, setSyncStats] = useState<{ emailsSynced: number; applicationsUpdated: number; eventsCreated: number } | null>(null)

  // Reminder Settings States
  const [interviewRemEnabled, setInterviewRemEnabled] = useState(true)
  const [interviewRemTiming, setInterviewRemTiming] = useState(60)
  const [assessmentRemEnabled, setAssessmentRemEnabled] = useState(true)
  const [assessmentRemTiming, setAssessmentRemTiming] = useState(1440)
  const [deadlineRemEnabled, setDeadlineRemEnabled] = useState(true)
  const [deadlineRemTiming, setDeadlineRemTiming] = useState(2880)
  const [isSavingReminders, setIsSavingReminders] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  // Fetch Assistant credentials status and settings
  const fetchAssistantStatus = async () => {
    try {
      const res = await fetch('/api/auth/google/status')
      if (res.ok) {
        const data = await res.json()
        setGoogleConfigured(data.googleConfigured)
        setConnectionStatus(data.connectionStatus)
        if (data.reminders) {
          setInterviewRemEnabled(data.reminders.interview_reminder_enabled)
          setInterviewRemTiming(data.reminders.interview_reminder_timing)
          setAssessmentRemEnabled(data.reminders.assessment_reminder_enabled)
          setAssessmentRemTiming(data.reminders.assessment_reminder_timing)
          setDeadlineRemEnabled(data.reminders.deadline_reminder_enabled)
          setDeadlineRemTiming(data.reminders.deadline_reminder_timing)
        }
      }
    } catch (err) {
      console.error('Failed to fetch assistant status:', err)
    }
  }

  const handleDisconnectGoogle = async () => {
    setIsDisconnecting(true)
    const toastId = toast.loading('Disconnecting Google integration...')
    try {
      const res = await fetch('/api/auth/google/status', { method: 'DELETE' })
      if (res.ok) {
        const data = await res.json()
        setConnectionStatus(data.connectionStatus || 'Disconnected')
        toast.success('Successfully disconnected Google integration!', { id: toastId })
        fetchAssistantStatus()
      } else {
        toast.error('Failed to disconnect Google connection.', { id: toastId })
      }
    } catch (err: any) {
      toast.error('Error disconnecting: ' + err.message, { id: toastId })
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleSyncNow = async () => {
    setIsSyncing(true)
    setSyncStats(null)
    const toastId = toast.loading('Synchronizing Gmail & Google Calendar...')
    try {
      const res = await fetch('/api/jobs/sync', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setSyncStats(data.stats)
          toast.success(`Sync complete! Synced ${data.stats.emailsSynced} emails, updated ${data.stats.applicationsUpdated} applications.`, { id: toastId })
        } else {
          toast.error(data.error || 'Synchronization failed.', { id: toastId })
        }
      } else {
        toast.error('Failed to trigger synchronization.', { id: toastId })
      }
    } catch (err: any) {
      toast.error('Sync failed: ' + err.message, { id: toastId })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSaveReminders = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingReminders(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Authentication session expired.')
        return
      }

      const { error } = await supabase
        .from('reminder_settings')
        .upsert({
          user_id: user.id,
          interview_reminder_enabled: interviewRemEnabled,
          interview_reminder_timing: Number(interviewRemTiming),
          assessment_reminder_enabled: assessmentRemEnabled,
          assessment_reminder_timing: Number(assessmentRemTiming),
          deadline_reminder_enabled: deadlineRemEnabled,
          deadline_reminder_timing: Number(deadlineRemTiming),
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      toast.success('Reminder preferences updated successfully!')
      fetchAssistantStatus()
    } catch (err: any) {
      toast.error('Failed to save reminders: ' + err.message)
    } finally {
      setIsSavingReminders(false)
    }
  }

  useEffect(() => {
    // Parse initial tab from search URL
    const searchParams = new URLSearchParams(window.location.search)
    const tabParam = searchParams.get('tab')
    if (tabParam === 'assistant') {
      setActiveTab('assistant')
    }

    const successParam = searchParams.get('success')
    const errorParam = searchParams.get('error')

    if (successParam === 'google_connected') {
      toast.success('Successfully connected your Google Account!')
      // Clear URL params
      router.replace('/dashboard/profile?tab=assistant')
    } else if (errorParam) {
      toast.error(decodeURIComponent(errorParam))
      router.replace('/dashboard/profile?tab=assistant')
    }

    const fetchProfileData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }
        setUserId(user.id)

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') {
          toast.error('Could not fetch student profile details.')
        }

        if (profile) {
          setFullName(profile.full_name || '')
          setUniversity(profile.university || '')
          setDegree(profile.degree || '')
          setGraduationYear(profile.graduation_year || 2028)
          setSkills(profile.skills || [])
          setRoles(profile.preferred_roles || [])
          setLocations(profile.preferred_locations || [])
          setLinkedinUrl(profile.linkedin_url || '')
          setGithubUrl(profile.github_url || '')
          setPortfolioUrl(profile.portfolio_url || '')

          // Fetch skill profile details
          const { data: skillProfile } = await supabase
            .from('skill_profile')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()

          if (skillProfile) {
            setRemotePreference(skillProfile.remote_preference || 'any')
            setPreferredTechStack(skillProfile.preferred_tech_stack || [])
          }
        }

        await fetchAssistantStatus()
      } catch (err: any) {
        toast.error('Failed to initialize profile.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfileData()
  }, [router, supabase])


  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setIsSaving(true)

    try {
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          university: university,
          degree: degree,
          graduation_year: Number(graduationYear),
          skills: skills,
          preferred_roles: roles,
          preferred_locations: locations,
          linkedin_url: linkedinUrl || null,
          github_url: githubUrl || null,
          portfolio_url: portfolioUrl || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (profileErr) throw profileErr

      // Upsert into skill_profile
      const { error: skillProfileErr } = await supabase
        .from('skill_profile')
        .upsert({
          user_id: userId,
          skills: skills,
          preferred_roles: roles,
          preferred_locations: locations,
          remote_preference: remotePreference,
          preferred_tech_stack: preferredTechStack
        }, {
          onConflict: 'user_id'
        })

      if (skillProfileErr) throw skillProfileErr

      toast.success('Career & Match Profile updated successfully!')
      router.refresh()
    } catch (err: any) {
      toast.error('An unexpected error occurred: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Security Save
  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match.")
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    setIsChangingPassword(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Password updated successfully!')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      toast.error('Could not complete security updates.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Skills tag triggers
  const addSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (e.type === 'click' || (e as React.KeyboardEvent).key === 'Enter') {
      if ('preventDefault' in e) e.preventDefault()
      const trimmed = skillInput.trim()
      if (trimmed && !skills.includes(trimmed)) {
        setSkills([...skills, trimmed])
        setSkillInput('')
      }
    }
  }
  const removeSkill = (idx: number) => setSkills(skills.filter((_, i) => i !== idx))

  // Roles tag triggers
  const addRole = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (e.type === 'click' || (e as React.KeyboardEvent).key === 'Enter') {
      if ('preventDefault' in e) e.preventDefault()
      const trimmed = roleInput.trim()
      if (trimmed && !roles.includes(trimmed)) {
        setRoles([...roles, trimmed])
        setRoleInput('')
      }
    }
  }
  const removeRole = (idx: number) => setRoles(roles.filter((_, i) => i !== idx))

  // Locations tag triggers
  const addLocation = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (e.type === 'click' || (e as React.KeyboardEvent).key === 'Enter') {
      if ('preventDefault' in e) e.preventDefault()
      const trimmed = locationInput.trim()
      if (trimmed && !locations.includes(trimmed)) {
        setLocations([...locations, trimmed])
        setLocationInput('')
      }
    }
  }
  const removeLocation = (idx: number) => setLocations(locations.filter((_, i) => i !== idx))

  const addTechStack = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (e.type === 'click' || (e as React.KeyboardEvent).key === 'Enter') {
      if ('preventDefault' in e) e.preventDefault()
      const trimmed = techStackInput.trim()
      if (trimmed && !preferredTechStack.includes(trimmed)) {
        setPreferredTechStack([...preferredTechStack, trimmed])
        setTechStackInput('')
      }
    }
  }
  const removeTechStack = (idx: number) => setPreferredTechStack(preferredTechStack.filter((_, i) => i !== idx))

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        <span className="text-xs text-slate-500 font-mono">Synchronizing career profile registry...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white">Console Configuration</h2>
        <p className="text-slate-400 text-xs mt-1">Manage your Career Command parameters and security keys.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 gap-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 px-3 border-b-2 transition-all ${
            activeTab === 'profile'
              ? 'border-blue-500 text-white'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Career Profile
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 px-3 border-b-2 transition-all ${
            activeTab === 'security'
              ? 'border-blue-500 text-white'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Security Keys
        </button>
        <button
          onClick={() => setActiveTab('assistant')}
          className={`pb-3 px-3 border-b-2 transition-all ${
            activeTab === 'assistant'
              ? 'border-blue-500 text-white'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Career Assistant
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <Card className="bg-slate-900/20 border-white/5">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Academic & Personal Information
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                These settings configure your profile index.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Full Name</label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="bg-slate-900/50 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">University</label>
                  <Input
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    required
                    className="bg-slate-900/50 border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Degree Major</label>
                  <Input
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    required
                    className="bg-slate-900/50 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Graduation Year</label>
                  <Input
                    type="number"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(Number(e.target.value))}
                    required
                    className="bg-slate-900/50 border-white/10 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Targets & Skill tags */}
          <Card className="bg-slate-900/20 border-white/5">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Skills & Preferred Scope
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Customize technical metrics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Skills */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Skills</label>
                <div className="flex gap-2">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={addSkill}
                    placeholder="Press enter to append"
                    className="bg-slate-900/50 border-white/10 text-white"
                  />
                  <Button type="button" onClick={addSkill} size="icon" className="bg-slate-900 border border-white/10 hover:bg-white/5">
                    <Plus className="h-4 w-4 text-slate-300" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {skills.map((skill, index) => (
                    <span key={index} className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono px-2 py-0.5 rounded-md">
                      {skill}
                      <button type="button" onClick={() => removeSkill(index)}>
                        <X className="h-3 w-3 hover:text-white" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Roles */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Preferred Roles</label>
                <div className="flex gap-2">
                  <Input
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                    onKeyDown={addRole}
                    placeholder="Press enter to append"
                    className="bg-slate-900/50 border-white/10 text-white"
                  />
                  <Button type="button" onClick={addRole} size="icon" className="bg-slate-900 border border-white/10 hover:bg-white/5">
                    <Plus className="h-4 w-4 text-slate-300" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {roles.map((role, index) => (
                    <span key={index} className="flex items-center gap-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-mono px-2 py-0.5 rounded-md">
                      {role}
                      <button type="button" onClick={() => removeRole(index)}>
                        <X className="h-3 w-3 hover:text-white" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Locations */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Preferred Locations</label>
                <div className="flex gap-2">
                  <Input
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    onKeyDown={addLocation}
                    placeholder="Press enter to append"
                    className="bg-slate-900/50 border-white/10 text-white"
                  />
                  <Button type="button" onClick={addLocation} size="icon" className="bg-slate-900 border border-white/10 hover:bg-white/5">
                    <Plus className="h-4 w-4 text-slate-300" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {locations.map((loc, index) => (
                    <span key={index} className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-md">
                      {loc}
                      <button type="button" onClick={() => removeLocation(index)}>
                        <X className="h-3 w-3 hover:text-white" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Match Engine Preferences */}
          <Card className="bg-slate-900/20 border-white/5">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Match Engine Preferences
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Configure your search boundaries and language stack to feed the match algorithm.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Remote Preference</label>
                <select
                  value={remotePreference}
                  onChange={(e: any) => setRemotePreference(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-slate-900/50 p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="any">No Preference (Show all)</option>
                  <option value="remote">Fully Remote Only</option>
                  <option value="hybrid">Hybrid Work Mode</option>
                  <option value="onsite">On-site Office Work</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Preferred Tech Stack</label>
                <div className="flex gap-2">
                  <Input
                    value={techStackInput}
                    onChange={(e) => setTechStackInput(e.target.value)}
                    onKeyDown={addTechStack}
                    placeholder="e.g. Next.js, Node.js (Press Enter)"
                    className="bg-slate-900/50 border-white/10 text-white"
                  />
                  <Button type="button" onClick={addTechStack} size="icon" className="bg-slate-900 border border-white/10 hover:bg-white/5">
                    <Plus className="h-4 w-4 text-slate-300" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {preferredTechStack.map((tech, index) => (
                    <span key={index} className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono px-2 py-0.5 rounded-md">
                      {tech}
                      <button type="button" onClick={() => removeTechStack(index)}>
                        <X className="h-3 w-3 hover:text-white" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card className="bg-slate-900/20 border-white/5">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Online Footprint
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Synchronize external profiles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">LinkedIn Profile URL</label>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">GitHub Profile URL</label>
                <div className="relative">
                  <Github className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Portfolio URL</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://..."
                    className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="justify-end border-t border-white/5 bg-slate-950/40 py-4">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-4 px-6 text-xs rounded-lg flex items-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  'Save Profile Details'
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}

      {activeTab === 'security' && (
        <form onSubmit={handleSaveSecurity} className="space-y-6">
          <Card className="bg-slate-900/20 border-white/5 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Credentials Update
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Update the password for your portal login.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Minimum 8 characters"
                    className="pl-10 bg-slate-900/50 border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-enter password"
                    className="pl-10 bg-slate-900/50 border-white/10 text-white"
                  />
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="justify-end border-t border-white/5 bg-slate-950/40 py-4">
              <Button
                type="submit"
                disabled={isChangingPassword}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-4 px-6 text-xs rounded-lg flex items-center gap-1.5"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating Keys...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}

      {activeTab === 'assistant' && (
        <div className="space-y-8">
          {/* Onboarding Overview banner */}
          <Card className="relative overflow-hidden bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
            <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-blue-500/5 rounded-full blur-[60px] pointer-events-none" />
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="h-16 w-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Sparkles className="h-8 w-8 text-blue-400" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-white">Intelligent Career Automation</h3>
                <p className="text-slate-400 text-xs leading-relaxed max-w-2xl">
                  Unlock advanced automation features. When connected to Google, InternHQ audits your email inbox for internship-related updates, automatically progresses application stages, schedules timeline milestones, updates your calendar, and sends reminders.
                </p>
              </div>
            </div>
          </Card>

          {/* Core Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Google connection and Sync Console */}
            <div className="space-y-8">
              {/* Google Account Connection */}
              <Card className="bg-slate-900/20 border-white/5 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                    <span>Google Account Connection</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      connectionStatus === 'Connected'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : connectionStatus === 'Disconnected'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>
                      {connectionStatus}
                    </span>
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs">
                    Link your Google account to authorize read-only Gmail & Google Calendar synchronization.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!googleConfigured ? (
                    <div className="p-4 rounded-lg bg-rose-500/5 border border-rose-500/10 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-rose-400">Google Assistant is currently unavailable.</p>
                        <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                          Server keys are missing. To resolve, configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the .env.local file.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {connectionStatus === 'Connected' ? (
                        <div className="space-y-4">
                          <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-3">
                            <ShieldCheck className="h-5 w-5 text-emerald-400" />
                            <span className="text-xs text-slate-300">Authorized read-only credentials are active.</span>
                          </div>
                          <div className="flex gap-3 justify-end">
                            <Button
                              onClick={handleDisconnectGoogle}
                              disabled={isDisconnecting}
                              variant="outline"
                              className="border-rose-500/20 hover:bg-rose-500/5 text-rose-400 text-xs px-4"
                            >
                              {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                            </Button>
                            <a href="/api/auth/google">
                              <Button className="bg-slate-900 border border-white/10 hover:bg-slate-850 text-white text-xs px-4">
                                Reconnect
                              </Button>
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-xs text-slate-400">
                            You have not connected a Google account yet. Connecting will allow InternHQ to scan for recruitment updates.
                          </p>
                          <div className="flex justify-end">
                            <a href="/api/auth/google">
                              <Button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-5 py-2.5">
                                Connect Google Account
                              </Button>
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sync Console */}
              {connectionStatus === 'Connected' && (
                <Card className="bg-slate-900/20 border-white/5 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-300">
                      Sync Console
                    </CardTitle>
                    <CardDescription className="text-slate-400 text-xs">
                      Manually trigger a sync with your Google Account right now.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isSyncing ? (
                      <div className="space-y-3 py-2">
                        <div className="flex items-center gap-3 text-xs text-blue-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Syncing emails, classifying tags, mapping schedule...</span>
                        </div>
                        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full w-2/3 rounded-full animate-pulse" />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {syncStats && (
                          <div className="grid grid-cols-3 gap-2 bg-slate-950/40 p-3 rounded-lg border border-white/5 text-center text-xs font-mono">
                            <div>
                              <p className="text-[10px] text-slate-500 font-bold uppercase">Emails</p>
                              <p className="text-sm font-extrabold text-blue-400 mt-0.5">+{syncStats.emailsSynced}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500 font-bold uppercase">Updates</p>
                              <p className="text-sm font-extrabold text-purple-400 mt-0.5">+{syncStats.applicationsUpdated}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500 font-bold uppercase">Calendar</p>
                              <p className="text-sm font-extrabold text-emerald-400 mt-0.5">+{syncStats.eventsCreated}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-500 font-mono">Design supports automated CRON trigger API.</span>
                          <Button
                            onClick={handleSyncNow}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs px-5 py-2.5 flex items-center gap-1.5"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Sync Now
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Reminders Preferences Form */}
            <form onSubmit={handleSaveReminders}>
              <Card className="bg-slate-900/20 border-white/5 backdrop-blur-md h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-300">
                    Assistant Reminders
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs">
                    Configure your preferences and timings for notification reminders.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 flex-1">
                  
                  {/* Interview Reminders */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-400" />
                        Interview Reminders
                      </label>
                      <input
                        type="checkbox"
                        checked={interviewRemEnabled}
                        onChange={(e) => setInterviewRemEnabled(e.target.checked)}
                        className="w-4 h-4 rounded bg-slate-900 border-white/10 text-blue-500 focus:ring-0 cursor-pointer"
                      />
                    </div>
                    {interviewRemEnabled && (
                      <select
                        value={interviewRemTiming}
                        onChange={(e) => setInterviewRemTiming(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-white/5 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value={30}>30 Minutes before</option>
                        <option value={60}>1 Hour before</option>
                        <option value={120}>2 Hours before</option>
                        <option value={1440}>1 Day before</option>
                      </select>
                    )}
                  </div>

                  {/* Assessment Reminders */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                        <Settings2 className="h-4 w-4 text-purple-400" />
                        Assessment Reminders
                      </label>
                      <input
                        type="checkbox"
                        checked={assessmentRemEnabled}
                        onChange={(e) => setAssessmentRemEnabled(e.target.checked)}
                        className="w-4 h-4 rounded bg-slate-900 border-white/10 text-purple-500 focus:ring-0 cursor-pointer"
                      />
                    </div>
                    {assessmentRemEnabled && (
                      <select
                        value={assessmentRemTiming}
                        onChange={(e) => setAssessmentRemTiming(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-white/5 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value={1440}>1 Day before (Assessment Tomorrow)</option>
                        <option value={2880}>2 Days before</option>
                        <option value={4320}>3 Days before</option>
                      </select>
                    )}
                  </div>

                  {/* Deadline Reminders */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-emerald-400" />
                        Deadline Reminders
                      </label>
                      <input
                        type="checkbox"
                        checked={deadlineRemEnabled}
                        onChange={(e) => setDeadlineRemEnabled(e.target.checked)}
                        className="w-4 h-4 rounded bg-slate-900 border-white/10 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                    </div>
                    {deadlineRemEnabled && (
                      <select
                        value={deadlineRemTiming}
                        onChange={(e) => setDeadlineRemTiming(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-white/5 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value={1440}>1 Day before (Deadline Tomorrow)</option>
                        <option value={2880}>2 Days before</option>
                        <option value={4320}>3 Days before</option>
                        <option value={10080}>1 Week before</option>
                      </select>
                    )}
                  </div>

                </CardContent>
                <CardFooter className="justify-end border-t border-white/5 bg-slate-950/40 py-4">
                  <Button
                    type="submit"
                    disabled={isSavingReminders}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-4 px-6 text-xs rounded-lg flex items-center gap-1.5"
                  >
                    {isSavingReminders ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving Preferences...
                      </>
                    ) : (
                      'Save Reminder Preferences'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </form>

          </div>
        </div>
      )}
    </div>
  )
}

