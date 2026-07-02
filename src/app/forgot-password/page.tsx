'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations/auth'
import {
  Mail,
  Loader2,
  Sparkles,
  Inbox,
  ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [requestedEmail, setRequestedEmail] = useState('')
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ''
    }
  })

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/profile`
      })

      if (error) {
        toast.error(error.message)
      } else {
        setRequestedEmail(data.email)
        setIsSuccess(true)
        toast.success('Password reset link sent!')
      }
    } catch (err: any) {
      toast.error('An unexpected error occurred.')
    } finally {
      setIsLoading(false)
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
            <CardTitle className="text-2xl font-bold text-white">Reset Link Dispatched</CardTitle>
            <CardDescription className="text-white/80 text-xs">
              We've dispatched a recovery link to <span className="text-white font-semibold underline">{requestedEmail}</span>.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="py-4 text-xs text-white/80 leading-relaxed">
            Please check your inbox and follow the secure link to update your credentials and regain portal access.
          </CardContent>
          
          <CardFooter className="flex-col gap-2">
            <Link href="/login" className="w-full">
              <Button className="w-full bg-white/10 border border-white/10 hover:bg-white/20 text-white font-semibold py-4 text-xs cursor-pointer transition-all duration-150">
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

      <Card className="w-full max-w-md bg-white/10 border border-white/20 backdrop-blur-xl shadow-2xl relative overflow-hidden text-white z-20 rounded-2xl">
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        
        <CardHeader className="text-center pb-4">
          <div className="mx-auto h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center font-bold text-white shadow-lg mb-3">
            I
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
            Reset Password <Sparkles className="h-4 w-4 text-white animate-pulse" />
          </CardTitle>
          <CardDescription className="text-white/80 text-xs">
            Recover access to your Career Command console
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
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

            <Button
              type="submit"
              className="w-full bg-white hover:bg-white/90 text-[#F4845F] font-bold py-5 rounded-lg text-xs shadow-lg flex items-center justify-center gap-2 transition-all duration-150 border-none cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending link...
                </>
              ) : (
                'Send Recovery Link'
              )}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="justify-center border-t border-white/10 bg-white/5 py-4">
          <Link
            href="/login"
            className="text-xs text-white hover:text-white/85 transition-colors flex items-center gap-1.5 font-semibold"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
