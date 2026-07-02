'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ShieldAlert,
  Users,
  Building,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Loader2,
  Lock,
  Unlock,
  AlertCircle,
  ExternalLink,
  LogOut,
  Sparkles
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Recruiter {
  id: string
  hr_name: string
  company_email: string
  linkedin_url?: string
  is_approved: boolean
  company_id: string
  companies?: {
    name: string
    website: string
  }
}

interface Company {
  id: string
  name: string
  website: string
  industry: string
  is_verified: boolean
  is_suspended: boolean
}

interface UserProfile {
  id: string
  full_name: string
  university: string
  role: 'student' | 'recruiter' | 'admin'
  onboarded: boolean
}

export default function AdminConsolePage() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentTab, setCurrentTab] = useState<'approvals' | 'companies' | 'users'>('approvals')

  // Data lists
  const [recruiters, setRecruiters] = useState<Recruiter[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const supabase = createClient()

  const checkAdminRole = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (prof?.role !== 'admin') {
        toast.error('Access Denied: Admins Only')
        window.location.href = '/dashboard'
        return
      }

      setIsAdmin(true)
      await loadAdminData()
    } catch (e: any) {
      toast.error('Auth error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const loadAdminData = async () => {
    try {
      // 1. Fetch recruiters with companies joined
      const { data: recs } = await supabase
        .from('recruiters')
        .select('*, companies(*)')
        .order('created_at', { ascending: false })

      setRecruiters(recs || [])

      // 2. Fetch companies
      const { data: comps } = await supabase
        .from('companies')
        .select('*')
        .order('name', { ascending: true })

      setCompanies(comps || [])

      // 3. Fetch user profiles
      const { data: profs } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true })

      setProfiles(profs as any || [])
    } catch (e: any) {
      toast.error('Failed to load dashboard data: ' + e.message)
    }
  }

  useEffect(() => {
    checkAdminRole()
  }, [])

  // Recruiter actions
  const handleApproveRecruiter = async (recId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from('recruiters')
        .update({ is_approved: approved })
        .eq('id', recId)

      if (error) throw error

      toast.success(approved ? 'Recruiter account approved!' : 'Recruiter approval revoked.')
      setRecruiters(prev =>
        prev.map(r => r.id === recId ? { ...r, is_approved: approved } : r)
      )
    } catch (e: any) {
      toast.error('Action failed: ' + e.message)
    }
  }

  // Company actions
  const handleToggleVerification = async (compId: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ is_verified: !current })
        .eq('id', compId)

      if (error) throw error

      toast.success(!current ? 'Company marked as verified!' : 'Company verification removed.')
      setCompanies(prev =>
        prev.map(c => c.id === compId ? { ...c, is_verified: !current } : c)
      )
    } catch (e: any) {
      toast.error('Action failed: ' + e.message)
    }
  }

  const handleToggleSuspension = async (compId: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ is_suspended: !current })
        .eq('id', compId)

      if (error) throw error

      toast.success(!current ? 'Company suspended!' : 'Company suspension lifted.')
      setCompanies(prev =>
        prev.map(c => c.id === compId ? { ...c, is_suspended: !current } : c)
      )

      // Also toggle listings status matching company to Closed if suspended
      if (!current) {
        await supabase
          .from('internships')
          .update({ status: 'Closed' })
          .eq('company_id', compId)
      }
    } catch (e: any) {
      toast.error('Action failed: ' + e.message)
    }
  }

  // User profiles action
  const handleToggleRole = async (userId: string, currentRole: 'student' | 'recruiter' | 'admin') => {
    const target = currentRole === 'student' ? 'recruiter' : currentRole === 'recruiter' ? 'admin' : 'student'
    if (!confirm(`Are you sure you want to change user role to ${target}?`)) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: target })
        .eq('id', userId)

      if (error) throw error

      toast.success(`User role updated to ${target}`)
      setProfiles(prev =>
        prev.map(p => p.id === userId ? { ...p, role: target } : p)
      )
    } catch (e: any) {
      toast.error('Failed to shift role: ' + e.message)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex justify-center items-center">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!isAdmin) return null

  // Filters logic
  const filteredRecruiters = recruiters.filter(r => 
    r.hr_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.company_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.companies?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.industry.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredProfiles = profiles.filter(p => 
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 relative overflow-hidden font-sans">
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none z-0" />
      
      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Header navigation bar */}
        <header className="flex justify-between items-center border-b border-white/5 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-650 flex items-center justify-center font-bold text-white shadow-lg text-xs">
              A
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black tracking-tight text-white flex items-center gap-2">
                InternHQ Administration Panel
                <ShieldAlert className="h-4.5 w-4.5 text-blue-500" />
              </h1>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Control Panel v2.0</p>
            </div>
          </div>

          <Button 
            onClick={handleSignOut}
            className="bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-350 text-xs py-2 px-3 flex items-center gap-2 h-9 rounded-lg"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </header>

        {/* System Stats counters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Student Profiles', val: profiles.filter(p => p.role === 'student').length, sub: 'Registered candidates', icon: <Users className="h-4 w-4 text-blue-450" /> },
            { label: 'Recruiter Accounts', val: recruiters.length, sub: 'Company hiring reps', icon: <Building className="h-4 w-4 text-purple-450" /> },
            { label: 'Pending Approvals', val: recruiters.filter(r => !r.is_approved).length, sub: 'Needs admin review', icon: <AlertCircle className="h-4 w-4 text-amber-450 animate-pulse" /> },
            { label: 'Verified Companies', val: companies.filter(c => c.is_verified).length, sub: 'Approved hiring partners', icon: <CheckCircle className="h-4 w-4 text-emerald-450" /> }
          ].map((stat, i) => (
            <Card key={i} className="bg-slate-900/30 border-white/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">{stat.label}</span>
                  <span className="text-xl font-black text-white mt-1 block">{stat.val}</span>
                  <span className="text-[9px] text-slate-550 block mt-1">{stat.sub}</span>
                </div>
                <div className="h-8 w-8 rounded-lg bg-slate-950/60 border border-white/5 flex items-center justify-center shrink-0">
                  {stat.icon}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tab Controls and search */}
        <div className="bg-slate-900/30 border border-white/5 p-4 rounded-xl flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-white/5 w-full sm:w-auto overflow-x-auto scrollbar-none">
            {[
              { id: 'approvals', label: 'Recruiter Approvals' },
              { id: 'companies', label: 'Companies Directory' },
              { id: 'users', label: 'User Auditing' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as any)}
                className={`px-5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  currentTab === tab.id 
                    ? 'bg-slate-900 border border-white/10 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-550" />
            <input
              type="text"
              placeholder="Search keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/60 border border-white/5 focus:border-white/10 rounded-lg pl-9 pr-4 py-2 text-slate-250 placeholder:text-slate-500 text-xs focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Tab Body list */}
        <Card className="bg-slate-900/10 border-white/5">
          <CardContent className="p-6">
            
            {/* 1. RECRUITER APPROVALS TAB */}
            {currentTab === 'approvals' && (
              <div className="space-y-4">
                <h3 className="font-extrabold text-sm text-slate-200 mb-2">Pending Recruiter Access Requests</h3>
                {filteredRecruiters.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-6 text-center font-medium">No recruiter profiles match search query.</p>
                ) : (
                  <div className="space-y-3">
                    {filteredRecruiters.map((rec) => (
                      <div key={rec.id} className="p-4 bg-slate-950/40 border border-white/5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-[13px] text-slate-100">{rec.hr_name}</span>
                            <Badge className={`text-[8px] font-mono py-0 scale-95 border ${
                              rec.is_approved ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/5 border-amber-500/15 text-amber-450 animate-pulse'
                            }`}>
                              {rec.is_approved ? 'Approved' : 'Pending Verification'}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-slate-455">Email: {rec.company_email} • Company ID: {rec.companies?.name || 'N/A'}</p>
                          {rec.linkedin_url && (
                            <a href={rec.linkedin_url} target="_blank" className="text-blue-400 hover:underline flex items-center gap-0.5 text-[9px] font-semibold mt-1">
                              LinkedIn Profile <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>

                        <div className="flex gap-2 shrink-0">
                          {rec.is_approved ? (
                            <Button
                              onClick={() => handleApproveRecruiter(rec.id, false)}
                              className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-[10px] font-bold h-8 px-3 rounded flex items-center gap-1"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Revoke Access
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleApproveRecruiter(rec.id, true)}
                              className="bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold h-8 px-3 rounded flex items-center gap-1 shadow-lg shadow-emerald-500/5"
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Approve Recruiter
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. COMPANIES DIRECTORY TAB */}
            {currentTab === 'companies' && (
              <div className="space-y-4">
                <h3 className="font-extrabold text-sm text-slate-200 mb-2">Registered Corporate Entities</h3>
                {filteredCompanies.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-6 text-center">No companies found.</p>
                ) : (
                  <div className="space-y-3">
                    {filteredCompanies.map((comp) => (
                      <div key={comp.id} className="p-4 bg-slate-950/40 border border-white/5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-[13px] text-slate-100">{comp.name}</span>
                            {comp.is_verified && (
                              <Badge className="bg-emerald-500/15 border-emerald-500/20 text-emerald-400 text-[8px] font-mono uppercase">Verified</Badge>
                            )}
                            {comp.is_suspended && (
                              <Badge className="bg-rose-500/10 border-rose-500/20 text-rose-400 text-[8px] font-mono uppercase">Suspended</Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-455">Industry: {comp.industry} • Website: <a href={comp.website} target="_blank" className="text-blue-400 hover:underline">{comp.website}</a></p>
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <Button
                            onClick={() => handleToggleVerification(comp.id, comp.is_verified)}
                            className={`text-[10px] font-bold h-8 px-3 rounded flex items-center gap-1 border ${
                              comp.is_verified 
                                ? 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-450 hover:bg-emerald-500/20'
                            }`}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            {comp.is_verified ? 'Unverify' : 'Verify Company'}
                          </Button>

                          <Button
                            onClick={() => handleToggleSuspension(comp.id, comp.is_suspended)}
                            className={`text-[10px] font-bold h-8 px-3 rounded flex items-center gap-1 border ${
                              comp.is_suspended 
                                ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25'
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                            }`}
                          >
                            {comp.is_suspended ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                            {comp.is_suspended ? 'Unsuspend' : 'Suspend Company'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. USER AUDITING TAB */}
            {currentTab === 'users' && (
              <div className="space-y-4">
                <h3 className="font-extrabold text-sm text-slate-200 mb-2">Registered Accounts Directory</h3>
                {filteredProfiles.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-6 text-center">No user profiles matched query.</p>
                ) : (
                  <div className="space-y-3">
                    {filteredProfiles.map((prof) => (
                      <div key={prof.id} className="p-4 bg-slate-950/40 border border-white/5 rounded-xl flex justify-between items-center gap-3 text-xs">
                        <div>
                          <span className="font-extrabold text-[13px] text-slate-100 block">{prof.full_name || 'Student Candidate'}</span>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5">{prof.university} • Onboarded: {prof.onboarded ? 'Yes' : 'No'}</span>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Role:</span>
                          <Badge className={`text-[8px] font-mono py-0.5 uppercase scale-95 border ${
                            prof.role === 'admin'
                              ? 'bg-rose-500/15 border-rose-500/20 text-rose-450 font-black'
                              : prof.role === 'recruiter'
                              ? 'bg-purple-500/15 border-purple-500/20 text-purple-400'
                              : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                          }`}>
                            {prof.role}
                          </Badge>
                          <Button
                            onClick={() => handleToggleRole(prof.id, prof.role)}
                            className="bg-slate-900 hover:bg-slate-800 border border-white/5 text-[9px] px-2 h-7 rounded text-slate-400 font-bold"
                          >
                            Toggle Role
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </CardContent>
        </Card>

      </div>
    </div>
  )
}
