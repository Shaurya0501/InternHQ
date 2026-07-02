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
  AlertTriangle,
  ArrowLeft
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

  const grainUri = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E")`

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

      <Card className="w-full max-w-md bg-white/10 border-white/20 backdrop-blur-xl shadow-2xl relative overflow-hidden text-white z-20 rounded-2xl">
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        
        <CardHeader className="text-center pb-4">
          <div className="mx-auto h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center font-bold text-white shadow-lg mb-3">
            I
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
            Command Portal <Sparkles className="h-4 w-4 text-white animate-pulse" />
          </CardTitle>
          <CardDescription className="text-white/80 text-xs">
            Sign in to access your Career Command Center
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {errorParam && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-100 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorParam}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/90">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                <Input
                  type="email"
                  placeholder="name@university.edu"
                  {...register('email')}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/45 focus-visible:ring-0 focus-visible:border-white/40 focus:border-white/40 focus:ring-0"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-[10px] text-rose-200 font-semibold">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-white/90">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-[10px] text-white/80 hover:text-white hover:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
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
              {errors.password && (
                <p className="text-[10px] text-rose-200 font-semibold">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="rememberMe"
                {...register('rememberMe')}
                className="rounded border-white/20 bg-white/5 text-[#F4845F] focus:ring-0 focus:ring-offset-0 h-4 w-4 cursor-pointer"
                disabled={isLoading}
              />
              <label
                htmlFor="rememberMe"
                className="text-xs text-white/80 select-none cursor-pointer"
              >
                Remember me for 30 days
              </label>
            </div>

            <Button
              type="submit"
              className="w-full bg-white hover:bg-white/90 text-[#F4845F] font-bold py-5 rounded-lg text-xs shadow-lg flex items-center justify-center gap-2 transition-all duration-150 border-none cursor-pointer"
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
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-4 text-[10px] text-white/60 font-semibold uppercase tracking-wider">
              Or continue with
            </span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
        
        <CardFooter className="justify-center border-t border-white/10 bg-white/5 py-4">
          <p className="text-xs text-white/80">
            Don't have an account?{' '}
            <Link
              href="/signup"
              className="text-white font-semibold hover:text-white/90 hover:underline transition-colors"
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
  const grainUri = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E")`

  return (
    <Suspense fallback={
      <div
        style={{ backgroundColor: '#F4845F' }}
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
        <Loader2 className="h-8 w-8 text-white animate-spin z-20" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
