'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Building,
  Globe,
  Settings,
  Users,
  Award,
  Loader2,
  Save,
  Cpu,
  Heart,
  Eye,
  FileText
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

export default function RecruiterProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Company profile states
  const [companyId, setCompanyId] = useState('')
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [industry, setIndustry] = useState('')
  const [size, setSize] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [about, setAbout] = useState('')
  const [techStackInput, setTechStackInput] = useState('')
  const [benefitsInput, setBenefitsInput] = useState('')
  const [isVerified, setIsVerified] = useState(false)

  const supabase = createClient()

  const loadProfile = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch recruiter details joining company details
      const { data: recruiter, error } = await supabase
        .from('recruiters')
        .select('*, companies(*)')
        .eq('id', user.id)
        .single()

      if (error) throw error

      if (recruiter && recruiter.companies) {
        const comp = recruiter.companies
        setCompanyId(comp.id)
        setName(comp.name)
        setWebsite(comp.website)
        setIndustry(comp.industry)
        setSize(comp.size)
        setLogoUrl(comp.logo_url || '')
        setAbout(comp.about || '')
        setTechStackInput(comp.tech_stack?.join(', ') || '')
        setBenefitsInput(comp.benefits?.join(', ') || '')
        setIsVerified(comp.is_verified)
      }
    } catch (e: any) {
      toast.error('Failed to load profile: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return

    try {
      setSaving(true)

      const parsedTech = techStackInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)

      const parsedBenefits = benefitsInput
        .split(',')
        .map(b => b.trim())
        .filter(b => b.length > 0)

      const payload = {
        website,
        industry,
        size,
        logo_url: logoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
        about: about || null,
        tech_stack: parsedTech,
        benefits: parsedBenefits,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('companies')
        .update(payload)
        .eq('id', companyId)

      if (error) throw error

      toast.success('Company profile updated successfully!')
      loadProfile()
    } catch (e: any) {
      toast.error('Failed to save profile: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="border-b border-white/5 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Building className="h-7 w-7 text-purple-500" />
            Company Profile
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Customize details shown on your public company landing page viewed by candidates.
          </p>
        </div>
        <a 
          href={`/dashboard/company/${companyId}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 border border-white/5 hover:border-white/10 rounded-lg text-slate-300 hover:text-white bg-slate-900/30 text-xs font-semibold"
        >
          <Eye className="h-4 w-4" />
          Preview public page
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Profile Card Form */}
        <Card className="lg:col-span-2 bg-slate-900/30 border-white/5 p-6 backdrop-blur-md">
          <form onSubmit={handleSaveProfile} className="space-y-6 text-xs">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Company Name</label>
                <input
                  type="text"
                  disabled
                  value={name}
                  className="w-full bg-slate-950/60 border border-white/5 rounded-lg p-2.5 text-slate-400 cursor-not-allowed font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Website URL *</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-slate-100 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Industry *</label>
                <input
                  type="text"
                  required
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Company Size *</label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:ring-0"
                >
                  <option value="1-10">1-10 Employees</option>
                  <option value="11-50">11-50 Employees</option>
                  <option value="51-200">51-200 Employees</option>
                  <option value="201-500">201-500 Employees</option>
                  <option value="500+">500+ Employees</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Company Logo URL</label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">About Company</label>
              <textarea
                placeholder="Describe your company history, values, products, and culture..."
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                rows={5}
                className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 focus:outline-none resize-none scrollbar-thin"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><Cpu className="h-3.5 w-3.5 text-blue-400" /> Technology stack (comma-separated)</label>
                <input
                  type="text"
                  placeholder="React, Next.js, Node.js, AWS"
                  value={techStackInput}
                  onChange={(e) => setTechStackInput(e.target.value)}
                  className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-rose-455" /> Employee Benefits (comma-separated)</label>
                <input
                  type="text"
                  placeholder="Health Insurance, Free lunches, Remote work, Learning budget"
                  value={benefitsInput}
                  onChange={(e) => setBenefitsInput(e.target.value)}
                  className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-purple-600 to-pink-650 hover:from-purple-500 hover:to-pink-550 text-white font-bold text-xs px-5 flex items-center gap-1.5 h-10 shadow-lg shadow-purple-500/10"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Card>

        {/* Status display panel */}
        <div className="space-y-6">
          <Card className="bg-slate-900/30 border-white/5 p-5 text-center space-y-4">
            <div className="h-16 w-16 mx-auto rounded-xl overflow-hidden border border-white/10 bg-slate-900 flex items-center justify-center shrink-0">
              <img 
                src={logoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`} 
                alt="Logo" 
                className="h-full w-full object-cover" 
              />
            </div>

            <div>
              <h3 className="font-extrabold text-sm text-slate-200">{name}</h3>
              <p className="text-[10px] text-slate-500 mt-1">{industry} • {size} Employees</p>
            </div>

            <div className="pt-4 border-t border-white/5 flex flex-col gap-2 justify-center text-center items-center">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Verification status</span>
              {isVerified ? (
                <Badge className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono py-0.5">
                  Verified enterprise
                </Badge>
              ) : (
                <Badge className="bg-amber-500/5 border border-amber-500/15 text-amber-400 text-[9px] font-mono py-0.5 animate-pulse">
                  Verification Pending
                </Badge>
              )}
            </div>
          </Card>
        </div>

      </div>

    </div>
  )
}
