'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Copy,
  Archive,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  MapPin,
  Calendar,
  Users,
  Building
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface InternshipListing {
  id: string
  title: string
  department: string
  description: string
  skills: string[]
  experience_required: string
  location: string
  location_type: 'remote' | 'hybrid' | 'onsite' | 'unknown'
  stipend: string
  duration: string
  openings: number
  application_deadline: string
  selection_process: string
  status: 'Draft' | 'Published' | 'Closed' | 'Archived'
  posted_date: string
  applicants_count?: number
}

export default function RecruiterInternshipsPage() {
  const [listings, setListings] = useState<InternshipListing[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingListing, setEditingListing] = useState<InternshipListing | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Form State
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [description, setDescription] = useState('')
  const [skillsInput, setSkillsInput] = useState('')
  const [experience, setExperience] = useState('0-1 years')
  const [location, setLocation] = useState('Remote')
  const [locationType, setLocationType] = useState<'remote' | 'hybrid' | 'onsite'>('remote')
  const [stipend, setStipend] = useState('₹15,000 / month')
  const [duration, setDuration] = useState('3 Months')
  const [openings, setOpenings] = useState(2)
  const [deadline, setDeadline] = useState('')
  const [selectionProcess, setSelectionProcess] = useState('')
  const [listingStatus, setListingStatus] = useState<'Draft' | 'Published' | 'Closed'>('Published')

  const supabase = createClient()

  const fetchListings = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch user's listings
      const { data: jobs, error } = await supabase
        .from('internships')
        .select('*')
        .eq('recruiter_id', user.id)
        .order('posted_date', { ascending: false })

      if (error) throw error

      // For each listing, query applicants count
      const listingsWithCount = await Promise.all((jobs || []).map(async (job) => {
        const { count } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .eq('internship_id', job.id)
        return {
          ...job,
          applicants_count: count || 0
        }
      }))

      setListings(listingsWithCount)
    } catch (e: any) {
      toast.error('Failed to load listings: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchListings()
  }, [])

  const handleSaveListing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !department || !description) {
      toast.error('Please fill in required fields')
      return
    }

    try {
      setFormSubmitting(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: recruiter } = await supabase
        .from('recruiters')
        .select('company_id, hr_name, companies(name, logo_url)')
        .eq('id', user.id)
        .single()

      if (!recruiter) throw new Error('Recruiter details not found')

      const parsedSkills = skillsInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)

      const payload = {
        title,
        department,
        description,
        skills: parsedSkills,
        experience_required: experience,
        location,
        location_type: locationType,
        stipend,
        duration,
        openings: parseInt(openings as any) || 1,
        application_deadline: deadline ? new Date(deadline).toISOString() : null,
        selection_process: selectionProcess || null,
        status: listingStatus,
        recruiter_id: user.id,
        company_id: recruiter.company_id,
        company_name: (Array.isArray(recruiter.companies) ? recruiter.companies[0]?.name : (recruiter.companies as any)?.name) || 'My Company',
        company_logo: (Array.isArray(recruiter.companies) ? recruiter.companies[0]?.logo_url : (recruiter.companies as any)?.logo_url) || null,
        source: 'manual',
        url: `${window.location.origin}/dashboard/internships` // dummy fallback url
      }

      if (editingListing) {
        // Edit existing
        const { error } = await supabase
          .from('internships')
          .update(payload)
          .eq('id', editingListing.id)

        if (error) throw error
        toast.success('Listing updated successfully!')
      } else {
        // Create new
        const { error } = await supabase
          .from('internships')
          .insert(payload)

        if (error) throw error
        toast.success('Listing created and published!')
      }

      setIsFormOpen(false)
      resetForm()
      fetchListings()
    } catch (e: any) {
      toast.error('Error saving listing: ' + e.message)
    } finally {
      setFormSubmitting(false)
    }
  }

  const openEdit = (listing: InternshipListing) => {
    setEditingListing(listing)
    setTitle(listing.title)
    setDepartment(listing.department)
    setDescription(listing.description)
    setSkillsInput(listing.skills.join(', '))
    setExperience(listing.experience_required)
    setLocation(listing.location)
    setLocationType(listing.location_type === 'unknown' ? 'remote' : listing.location_type)
    setStipend(listing.stipend)
    setDuration(listing.duration)
    setOpenings(listing.openings)
    setDeadline(listing.application_deadline ? listing.application_deadline.substring(0, 10) : '')
    setSelectionProcess(listing.selection_process || '')
    setListingStatus(listing.status === 'Archived' ? 'Closed' : listing.status)
    setIsFormOpen(true)
  }

  const handleDuplicate = async (listing: InternshipListing) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const duplicatedPayload = {
        ...listing,
        id: undefined,
        applicants_count: undefined,
        title: `${listing.title} (Copy)`,
        posted_date: new Date().toISOString(),
        created_at: undefined,
        status: 'Draft' as const
      }

      const { error } = await supabase
        .from('internships')
        .insert(duplicatedPayload)

      if (error) throw error

      toast.success('Listing duplicated as Draft!')
      fetchListings()
    } catch (e: any) {
      toast.error('Failed to duplicate listing: ' + e.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this listing?')) return

    try {
      const { error } = await supabase
        .from('internships')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Listing deleted')
      setListings(prev => prev.filter(l => l.id !== id))
    } catch (e: any) {
      toast.error('Failed to delete: ' + e.message)
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: 'Draft' | 'Published' | 'Closed' | 'Archived', target: 'Published' | 'Closed' | 'Archived') => {
    try {
      const { error } = await supabase
        .from('internships')
        .update({ status: target })
        .eq('id', id)

      if (error) throw error

      toast.success(`Listing status updated to ${target}`)
      setListings(prev =>
        prev.map(l => l.id === id ? { ...l, status: target } : l)
      )
    } catch (e: any) {
      toast.error('Failed to update status: ' + e.message)
    }
  }

  const resetForm = () => {
    setEditingListing(null)
    setTitle('')
    setDepartment('')
    setDescription('')
    setSkillsInput('')
    setExperience('0-1 years')
    setLocation('Remote')
    setLocationType('remote')
    setStipend('₹15,000 / month')
    setDuration('3 Months')
    setOpenings(2)
    setDeadline('')
    setSelectionProcess('')
    setListingStatus('Published')
  }

  const filteredListings = listings.filter(l => {
    const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          l.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          l.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))

    if (statusFilter === 'All') return matchesSearch
    return matchesSearch && l.status === statusFilter
  })

  // Status badge details
  const statusBadges = {
    Draft: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
    Published: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-bold',
    Closed: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    Archived: 'bg-blue-500/10 border-blue-500/20 text-blue-400'
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Briefcase className="h-7 w-7 text-purple-500" />
            Internship Listings
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Publish openings, draft future listings, track candidate applications, and close filled positions.
          </p>
        </div>
        <Button 
          onClick={() => {
            resetForm()
            setIsFormOpen(true)
          }}
          className="bg-gradient-to-r from-purple-600 to-pink-650 hover:from-purple-500 hover:to-pink-550 text-white font-bold text-xs rounded-lg px-4 py-2.5 flex items-center gap-2 h-10 shadow-lg"
        >
          <Plus className="h-4 w-4" />
          Create Openings
        </Button>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-slate-900/30 border border-white/5 p-4 rounded-xl backdrop-blur-md flex flex-col sm:flex-row gap-4 justify-between items-center">
        {/* Filter Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-white/5 overflow-x-auto w-full sm:w-auto scrollbar-none">
          {['All', 'Published', 'Draft', 'Closed', 'Archived'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                statusFilter === tab 
                  ? 'bg-slate-900 border border-white/10 text-white shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search title, department, skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-white/5 focus:border-white/10 rounded-lg pl-9 pr-4 py-2 text-slate-200 placeholder:text-slate-500 text-xs focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Listings list grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : filteredListings.length === 0 ? (
        <Card className="bg-slate-900/20 border-white/5 p-12 text-center">
          <Briefcase className="h-10 w-10 text-slate-650 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-semibold">No openings cataloged</p>
          <p className="text-slate-500 text-xs mt-1">Click "Create Openings" to publish your first internship listing.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredListings.map((listing) => (
              <motion.div
                key={listing.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-slate-900/40 border border-white/5 p-5 rounded-xl backdrop-blur-md flex flex-col justify-between h-48 group hover:border-white/10 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-100 group-hover:text-purple-400 transition-colors">{listing.title}</h3>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{listing.department} Department</p>
                    </div>
                    <Badge className={`text-[8px] font-mono py-0.5 uppercase scale-95 border ${statusBadges[listing.status]}`}>
                      {listing.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 pt-2 border-t border-white/5">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-blue-500" /> {listing.location} ({listing.location_type})</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-purple-500" /> {listing.applicants_count || 0} applicant(s)</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-amber-500" /> {listing.openings} opening(s)</span>
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    {/* State toggle actions */}
                    {listing.status === 'Draft' && (
                      <Button 
                        onClick={() => handleToggleStatus(listing.id, listing.status, 'Published')}
                        size="icon-sm" className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[9px] px-2 h-7 rounded"
                      >
                        Publish
                      </Button>
                    )}
                    {listing.status === 'Published' && (
                      <Button 
                        onClick={() => handleToggleStatus(listing.id, listing.status, 'Closed')}
                        size="icon-sm" className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 border border-rose-500/20 text-[9px] px-2 h-7 rounded"
                      >
                        Close
                      </Button>
                    )}
                    {listing.status === 'Closed' && (
                      <Button 
                        onClick={() => handleToggleStatus(listing.id, listing.status, 'Published')}
                        size="icon-sm" className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-450 border border-emerald-500/20 text-[9px] px-2 h-7 rounded"
                      >
                        Re-open
                      </Button>
                    )}
                    {listing.status !== 'Archived' && (
                      <button 
                        onClick={() => handleToggleStatus(listing.id, listing.status, 'Archived')}
                        title="Archive" className="p-1.5 border border-white/5 rounded text-slate-500 hover:text-blue-400 hover:bg-white/5"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => openEdit(listing)}
                      title="Edit" className="p-1.5 border border-white/5 rounded text-slate-500 hover:text-white hover:bg-white/5"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDuplicate(listing)}
                      title="Duplicate" className="p-1.5 border border-white/5 rounded text-slate-500 hover:text-purple-400 hover:bg-white/5"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(listing.id)}
                      title="Delete" className="p-1.5 border border-white/5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* CREATE & EDIT FORM MODAL */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-950 border border-white/10 w-full max-w-2xl rounded-2xl p-6 shadow-2xl z-50 text-slate-100 flex flex-col gap-4 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-gradient-to-bl from-purple-500/5 to-pink-500/5 rounded-full blur-[40px] pointer-events-none" />

              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="text-md font-extrabold text-white flex items-center gap-2">
                  <Briefcase className="h-4.5 w-4.5 text-purple-500" />
                  {editingListing ? 'Edit Internship Opening' : 'Post New Internship'}
                </h3>
                <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveListing} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Role Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Frontend Engineer Intern"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Department *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Engineering, Product"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Job Description *</label>
                  <textarea
                    required
                    placeholder="Describe role responsibilities, projects, and ideal candidate details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors resize-none scrollbar-thin"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Skills Required (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="React, TypeScript, Next.js"
                      value={skillsInput}
                      onChange={(e) => setSkillsInput(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Experience Level</label>
                    <input
                      type="text"
                      placeholder="e.g. 0-1 years / Fresher"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Bangalore"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Location Type</label>
                    <select
                      value={locationType}
                      onChange={(e) => setLocationType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors"
                    >
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">On-site</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Openings</label>
                    <input
                      type="number"
                      min="1"
                      value={openings}
                      onChange={(e) => setOpenings(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Stipend details</label>
                    <input
                      type="text"
                      placeholder="e.g. ₹15,000 / month"
                      value={stipend}
                      onChange={(e) => setStipend(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Duration</label>
                    <input
                      type="text"
                      placeholder="e.g. 6 Months"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Deadline</label>
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2 text-slate-100 text-xs focus:outline-none transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Selection Process</label>
                  <textarea
                    placeholder="Rounds (e.g. Resume screen ➔ Coding OA ➔ 2 Tech Rounds ➔ Offer)..."
                    value={selectionProcess}
                    onChange={(e) => setSelectionProcess(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Save Status</label>
                  <select
                    value={listingStatus}
                    onChange={(e) => setListingStatus(e.target.value as any)}
                    className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none transition-colors"
                  >
                    <option value="Published">Publish Immediately</option>
                    <option value="Draft">Save as Draft</option>
                    <option value="Closed">Save as Closed</option>
                  </select>
                </div>

                <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsFormOpen(false)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={formSubmitting}
                    className="bg-gradient-to-r from-purple-600 to-pink-650 hover:from-purple-500 hover:to-pink-550 text-white font-bold text-xs px-4"
                  >
                    {formSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Listing'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
