'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Loader2,
  Sparkles,
  Github,
  Chrome,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const errorParam = searchParams.get('error')

  useEffect(() => {
    if (errorParam) {
      toast.error(errorParam)
    }
  }, [errorParam])

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  })

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      })

      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Signed in successfully!')
        router.refresh() // Refreshes middleware state
        router.push('/dashboard')
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
      toast.error('Could not initialize OAuth login.')
    }
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
            Command Portal <Sparkles className="h-4 w-4 text-blue-400" />
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Sign in to access your Career Command Center
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {errorParam && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorParam}</span>
            </div>
          )}

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
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
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

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="rememberMe"
                {...register('rememberMe')}
                className="rounded border-white/10 bg-slate-900/50 text-blue-600 focus:ring-0 focus:ring-offset-0 h-4 w-4 cursor-pointer"
                disabled={isLoading}
              />
              <label
                htmlFor="rememberMe"
                className="text-xs text-slate-400 select-none cursor-pointer"
              >
                Remember me for 30 days
              </label>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-5 rounded-lg text-xs shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-4 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              Or continue with
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
            Don't have an account?{' '}
            <Link
              href="/signup"
              className="text-blue-400 hover:text-blue-300 hover:underline transition-colors font-medium"
            >
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center p-6 min-h-[calc(100vh-80px)]">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
