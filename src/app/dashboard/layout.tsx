import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/sidebar'
import { TopNav } from '@/components/dashboard/topnav'

export default async function DashboardLayout({
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

  // Fetch the student profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    profile?.full_name || user.email || 'User'
  )}`

  const studentProfile = {
    fullName: profile?.full_name || 'Student Candidate',
    email: user.email || '',
    avatarUrl: profile?.profile_picture_url || defaultAvatar,
    university: profile?.university || 'University Candidate',
    degree: profile?.degree || 'Major Degree',
    graduationYear: profile?.graduation_year || 2028
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar profile={studentProfile} />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Glow behind main viewport */}
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none z-0" />
        
        {/* Top Header Controls */}
        <TopNav profile={studentProfile} />

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
