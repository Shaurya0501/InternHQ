'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { signupSchema, type SignupInput } from '@/lib/validations/auth'
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Loader2,
  Sparkles,
  Github,
  Chrome,
  CheckCircle,
  Inbox
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: ''
    }
  })

  const onSubmit = async (data: SignupInput) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
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

  if (isSuccess) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-[calc(100vh-80px)] relative">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <Card className="w-full max-w-md bg-slate-950/75 border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden text-center p-6">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
          
          <CardHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
              <Inbox className="h-6 w-6 text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Verify Your Email</CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              We've sent a verification link to <span className="text-blue-400 font-semibold">{registeredEmail}</span>.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="py-4 text-xs text-slate-400 leading-relaxed">
            Please check your inbox (and spam folder) and click the link to confirm your account and begin your onboarding.
          </CardContent>
          
          <CardFooter className="flex-col gap-2">
            <Link href="/login" className="w-full">
              <Button className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 font-semibold py-4 text-xs">
                Back to Sign In
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6 min-h-[calc(100vh-80px)] relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[250px] h-[250px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md bg-slate-950/75 border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        
        <CardHeader className="text-center pb-4">
          <div className="mx-auto h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 mb-3">
            I
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
            Create Account <Sparkles className="h-4 w-4 text-purple-400" />
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Deploy your Career Command console today
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  type="email"
                  placeholder="name@university.edu"
                  {...register('email')}
                  className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500 focus-visible:border-blue-500"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-[10px] text-rose-400 font-medium">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
                  {...register('password')}
                  className="pl-10 pr-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500 focus-visible:border-blue-500"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[10px] text-rose-400 font-medium">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  {...register('confirmPassword')}
                  className="pl-10 pr-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500 focus-visible:border-blue-500"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-[10px] text-rose-400 font-medium">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-5 rounded-lg text-xs shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-4 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              Or join with
            </span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => handleOAuthLogin('github')}
              className="border-white/10 bg-slate-900/30 hover:bg-slate-900/80 text-xs flex items-center gap-2"
              disabled={isLoading}
            >
              <Github className="h-4 w-4" />
              GitHub
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => handleOAuthLogin('google')}
              className="border-white/10 bg-slate-900/30 hover:bg-slate-900/80 text-xs flex items-center gap-2"
              disabled={isLoading}
            >
              <Chrome className="h-4 w-4 text-rose-500" />
              Google
            </Button>
          </div>
        </CardContent>
        
        <CardFooter className="justify-center border-t border-white/5 bg-slate-950/40 py-4">
          <p className="text-xs text-slate-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-blue-400 hover:text-blue-300 hover:underline transition-colors font-medium"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
