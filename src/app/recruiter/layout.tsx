import React from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  LayoutDashboard,
  Briefcase,
  ClipboardList,
  Video,
  MessageSquare,
  TrendingUp,
  Building,
  Settings,
  Menu,
  X,
  Bell,
  LogOut,
  Clock,
  Lock,
  ChevronRight
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

export default async function RecruiterLayout({
  children
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 1. Fetch profiles role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarded')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'recruiter') {
    redirect('/dashboard')
  }

  // 2. Fetch Recruiter and Company details
  const { data: recruiter } = await supabase
    .from('recruiters')
    .select('*, companies(*)')
    .eq('id', user.id)
    .maybeSingle()

  if (!recruiter) {
    // Fallback if db trigger failed
    redirect('/login')
  }

  const company = recruiter.companies
  const companyName = company?.name || 'Unnamed Enterprise'
  const companyLogo = company?.logo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(companyName)}`

  // PENDING APPROVAL LOCK SCREEN
  if (!recruiter.is_approved) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-slate-100 relative overflow-hidden">
        {/* Glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-[250px] h-[250px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <Card className="w-full max-w-lg bg-slate-900/40 border-white/5 backdrop-blur-xl shadow-2xl relative overflow-hidden text-center p-6">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
          
          <CardHeader>
            <div className="mx-auto h-14 w-14 rounded-full bg-amber-500/10 flex items-center justify-center mb-4 border border-amber-500/20">
              <Clock className="h-7 w-7 text-amber-450 animate-pulse" />
            </div>
            <CardTitle className="text-xl font-extrabold text-white">Verification Pending</CardTitle>
            <CardDescription className="text-slate-400 text-xs mt-1">
              Recruiter console for <span className="text-blue-400 font-semibold">{companyName}</span> is awaiting administrator audit.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="py-4 text-xs text-slate-400 leading-relaxed space-y-4">
            <p>
              To maintain candidate quality and prevent spam listings, InternHQ manually verifies all recruiter credentials before authorizing hiring dashboards.
            </p>
            <div className="p-3 bg-slate-950/60 border border-white/5 rounded-lg text-left text-[11px] space-y-2">
              <p className="text-slate-200 font-semibold border-b border-white/5 pb-1">Reviewing Registration Profile:</p>
              <p><span className="text-slate-500">Representative HR:</span> {recruiter.hr_name}</p>
              <p><span className="text-slate-500">Corporate Email:</span> {recruiter.company_email}</p>
              <p><span className="text-slate-500">Corporate Website:</span> <a href={company?.website} target="_blank" className="text-blue-400 hover:underline">{company?.website}</a></p>
            </div>
          </CardContent>
          
          <CardFooter className="flex-col gap-2 mt-2">
            <Link href="/login" className="w-full">
              <Button 
                onClick={async () => {
                  'use server'
                  const clientSupabase = await createClient()
                  await clientSupabase.auth.signOut()
                }}
                className="w-full bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs h-10"
              >
                Sign Out
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // APPROVED RECRUITER SYSTEM INTERFACE
  const navItems: NavItem[] = [
    { label: 'Overview', href: '/recruiter', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Internships', href: '/recruiter/internships', icon: <Briefcase className="h-4 w-4" /> },
    { label: 'Applicants', href: '/recruiter/applicants', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Interviews', href: '/recruiter/interviews', icon: <Video className="h-4 w-4" /> },
    { label: 'Messages', href: '/recruiter/messages', icon: <MessageSquare className="h-4 w-4" /> },
    { label: 'Analytics', href: '/recruiter/analytics', icon: <TrendingUp className="h-4 w-4" /> },
    { label: 'Company Profile', href: '/recruiter/profile', icon: <Building className="h-4 w-4" /> }
  ]

  const handleSignOut = async () => {
    'use server'
    const s = await createClient()
    await s.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-100 font-sans">
      
      {/* Sidebar navigation */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-950/80 border-r border-white/5 backdrop-blur-xl shrink-0">
        
        {/* Brand Banner */}
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-white/5 bg-slate-950/40">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-650 flex items-center justify-center font-bold text-white shadow-lg text-xs shrink-0">
            H
          </div>
          <span className="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            InternHQ
          </span>
          <Badge className="border-purple-500/20 bg-purple-500/5 text-purple-400 text-[8px] px-1 font-mono uppercase scale-90">
            Hiring
          </Badge>
        </div>

        {/* Company context tray */}
        <div className="px-4 py-4 border-b border-white/5 bg-slate-950/10 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg overflow-hidden border border-white/10 bg-slate-900 flex items-center justify-center shrink-0">
            <img src={companyLogo} alt="Company Logo" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-extrabold text-xs text-slate-200 truncate leading-tight">{companyName}</h4>
            <p className="text-[9px] text-slate-500 truncate mt-0.5">{recruiter.hr_name}</p>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 space-y-1.5 px-3 py-4">
          {navItems.map((item, idx) => (
            <Link
              key={idx}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent transition-all duration-150"
            >
              <span className="text-slate-450">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Sign out bottom button */}
        <div className="p-4 border-t border-white/5 bg-slate-950/40">
          <form action={handleSignOut}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 transition-all border border-transparent"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Workspace Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-purple-650/5 rounded-full blur-[120px] pointer-events-none z-0" />
        
        {/* Header Controls */}
        <header className="h-16 border-b border-white/5 bg-slate-950/40 backdrop-blur-md px-6 flex items-center justify-between z-30 shrink-0 relative">
          <div className="text-xs text-slate-500 font-mono">
            Hiring Console v2.0
          </div>
          <div className="flex items-center gap-4">
            <Badge className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono py-0">
              Approved Partner
            </Badge>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="max-w-5xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>

    </div>
  )
}
