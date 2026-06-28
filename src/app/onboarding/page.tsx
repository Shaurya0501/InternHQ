'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import {
  User,
  GraduationCap,
  Briefcase,
  MapPin,
  Linkedin,
  Github,
  Globe,
  FileText,
  Camera,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Plus,
  X,
  CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface OnboardingForm {
  fullName: string
  university: string
  degree: string
  graduationYear: number
  linkedinUrl: string
  githubUrl: string
  portfolioUrl: string
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  
  // Custom states for arrays
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  
  const [roles, setRoles] = useState<string[]>([])
  const [roleInput, setRoleInput] = useState('')
  
  const [locations, setLocations] = useState<string[]>([])
  const [locationInput, setLocationInput] = useState('')

  // Files
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  // Fetch current user on mount
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Authentication session missing. Re-routing.')
        router.push('/login')
      } else {
        setUserId(user.id)
      }
    }
    checkUser()
  }, [router, supabase])

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors }
  } = useForm<OnboardingForm>({
    defaultValues: {
      fullName: '',
      university: '',
      degree: '',
      graduationYear: new Date().getFullYear() + 2,
      linkedinUrl: '',
      githubUrl: '',
      portfolioUrl: ''
    }
  })

  // Watch fields to ensure required steps are filled
  const watchedFullName = watch('fullName')
  const watchedUniversity = watch('university')
  const watchedDegree = watch('degree')

  const handleNextStep = async () => {
    if (step === 1) {
      const isValid = await trigger(['fullName', 'university', 'degree', 'graduationYear'])
      if (!isValid) return
    }
    if (step === 2) {
      if (skills.length === 0) {
        toast.error('Please input at least one technical skill.')
        return
      }
      if (roles.length === 0) {
        toast.error('Please input at least one preferred role.')
        return
      }
    }
    setStep((prev) => prev + 1)
  }

  const handlePrevStep = () => {
    setStep((prev) => Math.max(1, prev - 1))
  }

  // Tags managers
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

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index))
  }

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

  const removeRole = (index: number) => {
    setRoles(roles.filter((_, i) => i !== index))
  }

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

  const removeLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index))
  }

  // File Handlers
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Profile picture must be under 2MB')
        return
      }
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Resume must be under 5MB')
        return
      }
      setResumeFile(file)
      toast.success(`Attached: ${file.name}`)
    }
  }

  const onSubmitForm = async (data: OnboardingForm) => {
    if (!userId) return
    setIsLoading(true)
    try {
      let avatarUrl = ''
      let resumeUrl = ''

      // 1. Upload Avatar if exists
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const filePath = `${userId}/avatar.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true })

        if (!uploadError) {
          avatarUrl = supabase.storage.from('avatars').getPublicUrl(filePath).data.publicUrl
        } else {
          // If avatars bucket is not created, fallback to placeholder url
          console.warn('Avatars upload failed (bucket might be missing):', uploadError.message)
          avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.fullName)}`
        }
      } else {
        avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.fullName)}`
      }

      // 2. Upload Resume if exists
      if (resumeFile) {
        const fileExt = resumeFile.name.split('.').pop()
        const filePath = `${userId}/resume.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(filePath, resumeFile, { upsert: true })

        if (!uploadError) {
          resumeUrl = supabase.storage.from('resumes').getPublicUrl(filePath).data.publicUrl
        } else {
          console.warn('Resumes upload failed (bucket might be missing):', uploadError.message)
          resumeUrl = 'https://docs.google.com/viewer?url=placeholder'
        }
      }

      // 3. Update Profiles Table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName,
          university: data.university,
          degree: data.degree,
          graduation_year: Number(data.graduationYear),
          skills: skills,
          preferred_roles: roles,
          preferred_locations: locations,
          linkedin_url: data.linkedinUrl || null,
          github_url: data.githubUrl || null,
          portfolio_url: data.portfolioUrl || null,
          profile_picture_url: avatarUrl,
          resume_url: resumeUrl || null,
          onboarded: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        toast.error(updateError.message)
      } else {
        toast.success('Onboarding complete! Loading command dashboard.')
        router.refresh() // Clear router session state
        router.push('/dashboard')
      }
    } catch (err: any) {
      toast.error('An error occurred during onboarding profile compilation.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-[calc(100vh-80px)] relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Progress Indicators */}
      <div className="w-full max-w-xl mb-8 flex items-center justify-between text-xs font-mono text-slate-500 relative px-2">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/5 -translate-y-1/2 z-0" />
        <div
          className="absolute top-1/2 left-0 h-0.5 bg-blue-500 -translate-y-1/2 transition-all duration-300 z-0"
          style={{ width: `${((step - 1) / 2) * 100}%` }}
        />

        <div className={`z-10 h-7 w-7 rounded-full flex items-center justify-center border font-bold text-xs ${
          step >= 1 ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-white/5 text-slate-500'
        }`}>
          1
        </div>
        <div className={`z-10 h-7 w-7 rounded-full flex items-center justify-center border font-bold text-xs ${
          step >= 2 ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-white/5 text-slate-500'
        }`}>
          2
        </div>
        <div className={`z-10 h-7 w-7 rounded-full flex items-center justify-center border font-bold text-xs ${
          step >= 3 ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-white/5 text-slate-500'
        }`}>
          3
        </div>
      </div>

      <Card className="w-full max-w-xl bg-slate-950/75 border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        
        <form onSubmit={handleSubmit(onSubmitForm)}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-blue-400" /> Academic Credentials
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs">
                    Please provide your university credentials to configure your console index.
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <Input
                        placeholder="Alex Rivera"
                        {...register('fullName', { required: 'Name is required' })}
                        className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-[10px] text-rose-400 font-medium">{errors.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">University</label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <Input
                        placeholder="Stanford University"
                        {...register('university', { required: 'University is required' })}
                        className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                      />
                    </div>
                    {errors.university && (
                      <p className="text-[10px] text-rose-400 font-medium">{errors.university.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Degree / Major</label>
                      <Input
                        placeholder="B.S. Computer Science"
                        {...register('degree', { required: 'Degree major is required' })}
                        className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                      />
                      {errors.degree && (
                        <p className="text-[10px] text-rose-400 font-medium">{errors.degree.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Graduation Year</label>
                      <Input
                        type="number"
                        placeholder="2028"
                        {...register('graduationYear', {
                          required: 'Grad year is required',
                          valueAsNumber: true
                        })}
                        className="bg-slate-900/50 border-white/10 text-white focus-visible:ring-blue-500"
                      />
                      {errors.graduationYear && (
                        <p className="text-[10px] text-rose-400 font-medium">{errors.graduationYear.message}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="justify-end border-t border-white/5 bg-slate-950/40 py-4">
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    disabled={!watchedFullName || !watchedUniversity || !watchedDegree}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold flex items-center gap-1.5 text-xs py-4 px-6 rounded-lg"
                  >
                    Next Step <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-purple-400" /> Career Targets & Skills
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs">
                    Define your technical skillset and preferred internship roles to optimize routing.
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-5">
                  {/* Skills input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Technical Skills (e.g. React, Python)</label>
                    <div className="flex gap-2">
                      <Input
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={addSkill}
                        placeholder="Add skill (press Enter)"
                        className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
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

                  {/* Roles input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Preferred Roles (e.g. Software Engineer, Backend)</label>
                    <div className="flex gap-2">
                      <Input
                        value={roleInput}
                        onChange={(e) => setRoleInput(e.target.value)}
                        onKeyDown={addRole}
                        placeholder="Add role target"
                        className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
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

                  {/* Locations input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Preferred Locations (e.g. San Francisco, Remote)</label>
                    <div className="flex gap-2">
                      <Input
                        value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value)}
                        onKeyDown={addLocation}
                        placeholder="Add location target"
                        className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
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
                
                <CardFooter className="justify-between border-t border-white/5 bg-slate-950/40 py-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevStep}
                    className="border-white/10 bg-slate-900/30 hover:bg-slate-900/80 text-xs flex items-center gap-1.5 text-slate-300"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold flex items-center gap-1.5 text-xs py-4 px-6 rounded-lg"
                  >
                    Next Step <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Globe className="h-5 w-5 text-emerald-400" /> Digital Footprint & Files
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs">
                    Link your public repositories and upload profile assets to synchronize.
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center justify-center p-4 border border-white/5 bg-slate-900/20 rounded-xl relative group">
                      <label className="cursor-pointer flex flex-col items-center justify-center gap-2 text-center w-full">
                        {avatarPreview ? (
                          <div className="relative h-16 w-16 rounded-full overflow-hidden border border-white/15">
                            <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Camera className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="h-16 w-16 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center hover:bg-slate-700 transition-colors">
                            <Camera className="h-6 w-6 text-slate-500" />
                          </div>
                        )}
                        <span className="text-[10px] font-semibold text-slate-300">Profile Image</span>
                        <span className="text-[8px] text-slate-500">Max size 2MB</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                          disabled={isLoading}
                        />
                      </label>
                    </div>

                    {/* Resume Upload */}
                    <div className="flex flex-col items-center justify-center p-4 border border-white/5 bg-slate-900/20 rounded-xl relative group">
                      <label className="cursor-pointer flex flex-col items-center justify-center gap-2 text-center w-full">
                        <div className="h-16 w-16 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center hover:bg-slate-700 transition-colors">
                          <FileText className={`h-6 w-6 ${resumeFile ? 'text-emerald-400' : 'text-slate-500'}`} />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-300">
                          {resumeFile ? resumeFile.name.substring(0, 15) + '...' : 'Upload Resume'}
                        </span>
                        <span className="text-[8px] text-slate-500">PDF, Word (Max 5MB)</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleResumeChange}
                          className="hidden"
                          disabled={isLoading}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">LinkedIn URL</label>
                    <div className="relative">
                      <Linkedin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <Input
                        placeholder="https://linkedin.com/in/alexrivera"
                        {...register('linkedinUrl')}
                        className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">GitHub URL</label>
                    <div className="relative">
                      <Github className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <Input
                        placeholder="https://github.com/alexrivera"
                        {...register('githubUrl')}
                        className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Portfolio URL</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <Input
                        placeholder="https://alexrivera.dev"
                        {...register('portfolioUrl')}
                        className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="justify-between border-t border-white/5 bg-slate-950/40 py-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevStep}
                    disabled={isLoading}
                    className="border-white/10 bg-slate-900/30 hover:bg-slate-900/80 text-xs flex items-center gap-1.5 text-slate-300"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold flex items-center gap-1.5 text-xs py-4 px-6 rounded-lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Commiling Profile...
                      </>
                    ) : (
                      <>
                        Complete Setup <CheckCircle2 className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </Card>
    </div>
  )
}
