'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { signupSchema, recruiterSignupSchema, type SignupInput, type RecruiterSignupInput } from '@/lib/validations/auth'
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Loader2,
  Sparkles,
  Github,
  Chrome,
  Inbox,
  User,
  Building,
  Globe,
  Linkedin
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function SignupPage() {
  const [role, setRole] = useState<'student' | 'recruiter'>('student')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const supabase = createClient()

  // Student Form
  const {
    register: registerStudent,
    handleSubmit: handleSubmitStudent,
    formState: { errors: errorsStudent }
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: ''
    }
  })

  // Recruiter Form
  const {
    register: registerRecruiter,
    handleSubmit: handleSubmitRecruiter,
    formState: { errors: errorsRecruiter }
  } = useForm<RecruiterSignupInput>({
    resolver: zodResolver(recruiterSignupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      hrName: '',
      companyName: '',
      website: '',
      industry: '',
      companySize: '11-50',
      linkedin: ''
    }
  })

  const onSubmitStudent = async (data: SignupInput) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            role: 'student'
          }
        }
      })

      if (error) {
        toast.error(error.message)
      } else {
        setRegisteredEmail(data.email)
        setIsSuccess(true)
        toast.success('Registration successful! Check your inbox.')
      }
    } catch (err: any) {
      toast.error('An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitRecruiter = async (data: RecruiterSignupInput) => {
    setIsLoading(true)
    try {
      const defaultLogo = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
        data.companyName
      )}&backgroundColor=0f172a,1e293b,334155`

      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            role: 'recruiter',
            hr_name: data.hrName,
            company_name: data.companyName,
            website: data.website,
            industry: data.industry,
            company_size: data.companySize,
            linkedin_url: data.linkedin,
            logo_url: defaultLogo
          }
        }
      })

      if (error) {
        toast.error(error.message)
      } else {
        setRegisteredEmail(data.email)
        setIsSuccess(true)
        toast.success('Recruiter signup successful! Check your inbox.')
      }
    } catch (err: any) {
      toast.error('An unexpected error occurred: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) {
        toast.error(error.message)
      }
    } catch (err: any) {
      toast.error('Could not initialize OAuth registration.')
    }
  }

  const grainUri = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E")`

  if (isSuccess) {
    return (
      <div
        style={{
          backgroundColor: '#F4845F',
          fontFamily: 'var(--font-inter), sans-serif',
        }}
        className="flex-1 flex items-center justify-center p-6 min-h-screen relative overflow-hidden"
      >
        <div
          style={{
            backgroundImage: grainUri,
            backgroundSize: '200px 200px',
            backgroundRepeat: 'repeat',
            opacity: 0.4,
          }}
          className="absolute inset-0 pointer-events-none z-10"
        />

        <Card className="w-full max-w-md bg-white/10 border border-white/20 backdrop-blur-xl shadow-2xl relative overflow-hidden text-center p-6 text-white rounded-2xl z-20">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          
          <CardHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-white/10 flex items-center justify-center mb-4">
              <Inbox className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Verify Your Email</CardTitle>
            <CardDescription className="text-white/80 text-xs mt-1">
              We've sent a verification link to <span className="text-white font-semibold underline">{registeredEmail}</span>.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="py-2 text-xs text-white/80 leading-relaxed">
            Please check your inbox (and spam folder) and click the link to confirm your account and activate your console profile.
          </CardContent>
          
          <CardFooter className="flex-col gap-2 mt-4">
            <Link href="/login" className="w-full">
              <Button className="w-full bg-white/10 border border-white/10 hover:bg-white/20 text-white font-semibold py-4 text-xs h-10 transition-all duration-150 cursor-pointer">
                Back to Sign In
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div
      style={{
        backgroundColor: '#F4845F',
        fontFamily: 'var(--font-inter), sans-serif',
      }}
      className="flex-1 flex items-center justify-center p-6 min-h-screen relative overflow-hidden select-none"
    >
      {/* Grain overlay */}
      <div
        style={{
          backgroundImage: grainUri,
          backgroundSize: '200px 200px',
          backgroundRepeat: 'repeat',
          opacity: 0.4,
        }}
        className="absolute inset-0 pointer-events-none z-10"
      />

      {/* Giant display watermark */}
      <div
        style={{
          top: '20%',
          fontSize: 'clamp(80px, 18vw, 240px)',
          fontWeight: 900,
          lineHeight: 1,
          opacity: 0.15,
          letterSpacing: '-0.02em',
        }}
        className="absolute inset-x-0 flex items-center justify-center pointer-events-none select-none z-0 font-anton text-white uppercase whitespace-nowrap"
      >
        INTERNHQ
      </div>

      <Card className={`w-full transition-all duration-300 bg-white/10 border border-white/20 backdrop-blur-xl shadow-2xl relative overflow-hidden text-white z-20 rounded-2xl ${
        role === 'recruiter' ? 'max-w-2xl' : 'max-w-md'
      }`}>
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        
        <CardHeader className="text-center pb-4">
          <div className="mx-auto h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center font-bold text-white shadow-lg mb-3">
            I
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
            Create Account <Sparkles className="h-4 w-4 text-white animate-pulse" />
          </CardTitle>
          <CardDescription className="text-white/80 text-xs">
            Deploy your InternHQ Career Command console
          </CardDescription>

          {/* Role selector Tabs */}
          <div className="flex bg-black/25 p-0.5 border border-white/10 rounded-lg w-full max-w-xs mx-auto mt-4">
            <button
              onClick={() => setRole('student')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                role === 'student'
                  ? 'bg-white/15 border border-white/20 text-white shadow-sm'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Student Candidate
            </button>
            <button
              onClick={() => setRole('recruiter')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                role === 'recruiter'
                  ? 'bg-white/15 border border-white/20 text-white shadow-sm'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <Building className="h-3.5 w-3.5" />
              Recruiter / Company
            </button>
          </div>
        </CardHeader>
        
        <CardContent>
          {role === 'student' ? (
            /* STUDENT SIGNUP FORM */
            <form onSubmit={handleSubmitStudent(onSubmitStudent)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/90">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                  <Input
                    type="email"
                    placeholder="name@university.edu"
                    {...registerStudent('email')}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/45 focus-visible:ring-0 focus-visible:border-white/40 focus:border-white/40 focus:ring-0"
                    disabled={isLoading}
                  />
                </div>
                {errorsStudent.email && (
                  <p className="text-[10px] text-rose-200 font-semibold">{errorsStudent.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/90">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
                    {...registerStudent('password')}
                    className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/45 focus-visible:ring-0 focus-visible:border-white/40 focus:border-white/40 focus:ring-0"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-3 text-white/60 hover:text-white transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errorsStudent.password && (
                  <p className="text-[10px] text-rose-200 font-semibold">{errorsStudent.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/90">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    {...registerStudent('confirmPassword')}
                    className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/45 focus-visible:ring-0 focus-visible:border-white/40 focus:border-white/40 focus:ring-0"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-3 text-white/60 hover:text-white transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errorsStudent.confirmPassword && (
                  <p className="text-[10px] text-rose-200 font-semibold">{errorsStudent.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-white hover:bg-white/90 text-[#F4845F] font-bold py-5 rounded-lg text-xs shadow-lg flex items-center justify-center gap-2 h-10 mt-2 border-none cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Candidate Account...
                  </>
                ) : (
                  'Create Candidate Account'
                )}
              </Button>
            </form>
          ) : (
            /* RECRUITER SIGNUP FORM */
            <form onSubmit={handleSubmitRecruiter(onSubmitRecruiter)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/90">Company Name *</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                    <Input
                      type="text"
                      placeholder="e.g. Swiggy"
                      {...registerRecruiter('companyName')}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/45 focus-visible:ring-0 focus-visible:border-white/40 focus:border-white/40 focus:ring-0"
                      disabled={isLoading}
                    />
                  </div>
                  {errorsRecruiter.companyName && (
                    <p className="text-[10px] text-rose-200 font-semibold">{errorsRecruiter.companyName.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/90">Website *</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                    <Input
                      type="text"
                      placeholder="e.g. swiggy.com"
                      {...registerRecruiter('website')}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/45 focus-visible:ring-0 focus-visible:border-white/40 focus:border-white/40 focus:ring-0"
                      disabled={isLoading}
                    />
                  </div>
                  {errorsRecruiter.website && (
                    <p className="text-[10px] text-rose-200 font-semibold">{errorsRecruiter.website.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/90">Industry *</label>
                  <Input
                    type="text"
                    placeholder="e.g. Fintech, Hyperlocal"
                    {...registerRecruiter('industry')}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/45 focus-visible:ring-0 focus-visible:border-white/40 focus:border-white/40 focus:ring-0"
                    disabled={isLoading}
                  />
                  {errorsRecruiter.industry && (
                    <p className="text-[10px] text-rose-200 font-semibold">{errorsRecruiter.industry.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/90">Company Size *</label>
                  <select
                    {...registerRecruiter('companySize')}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:ring-0 focus:border-white/40 h-10 select-none cursor-pointer"
                    disabled={isLoading}
                  >
                    <option value="1-10" className="bg-slate-900 text-white">1-10 Employees</option>
                    <option value="11-50" className="bg-slate-900 text-white">11-50 Employees</option>
                    <option value="51-200" className="bg-slate-900 text-white">51-200 Employees</option>
                    <option value="201-500" className="bg-slate-900 text-white">201-500 Employees</option>
                    <option value="500+" className="bg-slate-900 text-white">500+ Employees</option>
                  </select>
                  {errorsRecruiter.companySize && (
                    <p className="text-[10px] text-rose-200 font-semibold">{errorsRecruiter.companySize.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/90">HR / Recruiter Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                    <Input
                      type="text"
                      placeholder="e.g. Jane Doe"
                      {...registerRecruiter('hrName')}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/45 focus-visible:ring-0 focus-visible:border-white/40 focus:border-white/40 focus:ring-0"
                      disabled={isLoading}
                    />
                  </div>
                  {errorsRecruiter.hrName && (
                    <p className="text-[10px] text-rose-200 font-semibold">{errorsRecruiter.hrName.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/90">HR LinkedIn Profile *</label>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                    <Input
                      type="url"
                      placeholder="https://linkedin.com/in/username"
                      {...registerRecruiter('linkedin')}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/45 focus-visible:ring-0 focus-visible:border-white/40 focus:border-white/40 focus:ring-0"
                      disabled={isLoading}
                    />
                  </div>
                  {errorsRecruiter.linkedin && (
                    <p className="text-[10px] text-rose-200 font-semibold">{errorsRecruiter.linkedin.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/90">Company Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                  <Input
                    type="email"
                    placeholder="hr@company.com"
                    {...registerRecruiter('email')}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/45 focus-visible:ring-0 focus-visible:border-white/40 focus:border-white/40 focus:ring-0"
                    disabled={isLoading}
                  />
                </div>
                {errorsRecruiter.email && (
                  <p className="text-[10px] text-rose-200 font-semibold">{errorsRecruiter.email.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/90">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 8 characters"
                      {...registerRecruiter('password')}
                      className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/45 focus-visible:ring-0 focus-visible:border-white/40 focus:border-white/40 focus:ring-0"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-3 text-white/60 hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errorsRecruiter.password && (
                    <p className="text-[10px] text-rose-200 font-semibold">{errorsRecruiter.password.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/90">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      {...registerRecruiter('confirmPassword')}
                      className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/45 focus-visible:ring-0 focus-visible:border-white/40 focus:border-white/40 focus:ring-0"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-3 text-white/60 hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errorsRecruiter.confirmPassword && (
                    <p className="text-[10px] text-rose-200 font-semibold">{errorsRecruiter.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-white hover:bg-white/90 text-[#F4845F] font-bold py-5 rounded-lg text-xs shadow-lg flex items-center justify-center gap-2 h-10 mt-2 border-none cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Recruiter Console...
                  </>
                ) : (
                  'Create Recruiter Account'
                )}
              </Button>
            </form>
          )}

          {/* Social login divider */}
          <div className="relative flex py-2 items-center mt-4">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-4 text-[10px] text-white/60 font-semibold uppercase tracking-wider">
              Or join with
            </span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => handleOAuthLogin('github')}
              className="border-white/20 bg-white/5 hover:bg-white/15 text-white text-xs flex items-center gap-2 cursor-pointer transition-all duration-150"
              disabled={isLoading}
            >
              <Github className="h-4 w-4" />
              GitHub
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => handleOAuthLogin('google')}
              className="border-white/20 bg-white/5 hover:bg-white/15 text-white text-xs flex items-center gap-2 cursor-pointer transition-all duration-150"
              disabled={isLoading}
            >
              <Chrome className="h-4 w-4 text-white" />
              Google
            </Button>
          </div>
        </CardContent>
        
        <CardFooter className="justify-center border-t border-white/10 bg-white/5 py-4 mt-4">
          <p className="text-xs text-white/80">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-white font-semibold hover:text-[#F4845F]/90 hover:underline transition-colors"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
