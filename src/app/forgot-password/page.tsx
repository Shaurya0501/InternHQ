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
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/profile` // redirects to profile to change password
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
            <CardTitle className="text-2xl font-bold text-white">Reset Link Dispatched</CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              We've dispatched a recovery link to <span className="text-blue-400 font-semibold">{requestedEmail}</span>.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="py-4 text-xs text-slate-400 leading-relaxed">
            Please check your inbox and follow the secure link to update your credentials and regain portal access.
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
            Reset Password <Sparkles className="h-4 w-4 text-blue-400" />
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Recover access to your Career Command console
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

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-5 rounded-lg text-xs shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2"
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
        
        <CardFooter className="justify-center border-t border-white/5 bg-slate-950/40 py-4">
          <Link
            href="/login"
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 font-medium"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
