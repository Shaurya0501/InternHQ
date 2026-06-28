'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FileText,
  Star,
  Trash,
  Plus,
  Edit,
  Copy,
  Eye,
  UploadCloud,
  Check,
  Loader2,
  FolderOpen,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  Download,
  AlertCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

type Resume = {
  id: string
  filename: string
  version: number
  upload_date: string
  primary_skills: string[]
  is_favorite: boolean
  last_used_at: string | null
  file_url: string
}

type UserDocument = {
  id: string
  filename: string
  type: 'Cover Letter' | 'Certificate' | 'Transcript' | 'Portfolio PDF' | 'Recommendation Letter'
  file_url: string
  upload_date: string
}

const DOCUMENT_TYPES = [
  'Cover Letter',
  'Certificate',
  'Transcript',
  'Portfolio PDF',
  'Recommendation Letter'
] as const

export default function VaultPage() {
  const [activeTab, setActiveTab] = useState<'resumes' | 'documents'>('resumes')
  const [resumes, setResumes] = useState<Resume[]>([])
  const [documents, setDocuments] = useState<UserDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  // Upload state
  const [isUploading, setIsUploading] = useState(false)
  const [skillsInput, setSkillsInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Doc Upload state
  const [selectedDocType, setSelectedDocType] = useState<UserDocument['type']>('Cover Letter')
  const docInputRef = useRef<HTMLInputElement>(null)

  // Modal states
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState('')
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  const [editResume, setEditResume] = useState<Resume | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [isSubmittingRename, setIsSubmittingRename] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const initVault = async () => {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserId(user.id)

        // Fetch resumes
        const { data: resData, error: resErr } = await supabase
          .from('resumes')
          .select('*')
          .eq('user_id', user.id)
          .order('is_favorite', { ascending: false })
          .order('upload_date', { ascending: false })

        if (resErr) throw resErr
        setResumes(resData || [])

        // Fetch documents
        const { data: docData, error: docErr } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', user.id)
          .order('upload_date', { ascending: false })

        if (docErr) throw docErr
        setDocuments(docData || [])
      } catch (err: any) {
        toast.error('Error loading vault: ' + err.message)
      } finally {
        setLoading(false)
      }
    }

    initVault()
  }, [])

  // ----------------------------------------
  // RESUME OPERATIONS
  // ----------------------------------------

  const triggerResumeUpload = () => {
    fileInputRef.current?.click()
  }

  const handleResumeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setIsUploading(true)
    try {
      // 1. Upload to Supabase Storage resumes bucket
      const fileExt = file.name.split('.').pop()
      const storagePath = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      
      const { data: storageData, error: storageErr } = await supabase.storage
        .from('resumes')
        .upload(storagePath, file)

      if (storageErr) throw storageErr

      // Parse Skills Input
      const skillsArray = skillsInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)

      // 2. Insert into resumes table
      const { data: dbData, error: dbErr } = await supabase
        .from('resumes')
        .insert({
          user_id: userId,
          filename: file.name,
          version: 1,
          primary_skills: skillsArray,
          is_favorite: resumes.length === 0, // Automatically favorite first resume
          file_url: storageData.path
        })
        .select()
        .single()

      if (dbErr) throw dbErr

      setResumes(prev => {
        const newResumes = [dbData, ...prev]
        if (dbData.is_favorite) {
          // ensure no other is favorite
          return newResumes.map(r => r.id === dbData.id ? r : { ...r, is_favorite: false })
        }
        return newResumes
      })

      setSkillsInput('')
      toast.success('Resume uploaded successfully!')
    } catch (err: any) {
      toast.error('Failed to upload resume: ' + err.message)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFavoriteToggle = async (resume: Resume) => {
    try {
      // Set this one as favorite and disable others
      const { error: updateErr } = await supabase
        .from('resumes')
        .update({ is_favorite: true })
        .eq('id', resume.id)

      if (updateErr) throw updateErr

      // Turn off favorite for all other resumes
      await supabase
        .from('resumes')
        .update({ is_favorite: false })
        .neq('id', resume.id)
        .eq('user_id', userId)

      setResumes(prev =>
        prev.map(r => ({
          ...r,
          is_favorite: r.id === resume.id
        })).sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0))
      )

      toast.success(`${resume.filename} set as favorite primary resume.`)
    } catch (err: any) {
      toast.error('Failed to set favorite resume: ' + err.message)
    }
  }

  const handleRenameClick = (resume: Resume) => {
    setEditResume(resume)
    setRenameValue(resume.filename)
    setShowRenameModal(true)
  }

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editResume || !renameValue.trim()) return

    setIsSubmittingRename(true)
    try {
      const { error } = await supabase
        .from('resumes')
        .update({ filename: renameValue.trim() })
        .eq('id', editResume.id)

      if (error) throw error

      setResumes(prev =>
        prev.map(r => r.id === editResume.id ? { ...r, filename: renameValue.trim() } : r)
      )

      toast.success('Resume renamed successfully.')
      setShowRenameModal(false)
      setEditResume(null)
    } catch (err: any) {
      toast.error('Failed to rename resume: ' + err.message)
    } finally {
      setIsSubmittingRename(false)
    }
  }

  const handleDuplicate = async (resume: Resume) => {
    try {
      // 1. Create a copy of the database entry with bumped version
      const { data, error } = await supabase
        .from('resumes')
        .insert({
          user_id: userId,
          filename: `Copy of ${resume.filename}`,
          version: resume.version + 1,
          primary_skills: resume.primary_skills,
          is_favorite: false,
          file_url: resume.file_url
        })
        .select()
        .single()

      if (error) throw error

      setResumes(prev => [data, ...prev])
      toast.success(`Duplicated ${resume.filename} as Version ${resume.version + 1}`)
    } catch (err: any) {
      toast.error('Failed to duplicate resume: ' + err.message)
    }
  }

  const handleDeleteResume = async (resume: Resume) => {
    if (!confirm(`Are you sure you want to delete ${resume.filename}? This will remove it permanently.`)) return

    try {
      // Delete from storage
      const { error: storageErr } = await supabase.storage
        .from('resumes')
        .remove([resume.file_url])

      if (storageErr) console.warn('Failed to delete storage file (it might have been deleted already):', storageErr)

      // Delete from DB
      const { error: dbErr } = await supabase
        .from('resumes')
        .delete()
        .eq('id', resume.id)

      if (dbErr) throw dbErr

      setResumes(prev => prev.filter(r => r.id !== resume.id))
      toast.success('Resume deleted successfully.')
    } catch (err: any) {
      toast.error('Failed to delete resume: ' + err.message)
    }
  }

  const handlePreview = async (filePath: string, title: string, bucket: 'resumes' | 'documents') => {
    try {
      // Generate signed url to view private pdf
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 600) // 10 minutes

      if (error) throw error

      setPreviewUrl(data.signedUrl)
      setPreviewTitle(title)
      setShowPreviewModal(true)
    } catch (err: any) {
      toast.error('Error generating preview link: ' + err.message)
    }
  }

  // ----------------------------------------
  // DOCUMENT OPERATIONS
  // ----------------------------------------

  const triggerDocUpload = (type: UserDocument['type']) => {
    setSelectedDocType(type)
    docInputRef.current?.click()
  }

  const handleDocFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const storagePath = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

      const { data: storageData, error: storageErr } = await supabase.storage
        .from('documents')
        .upload(storagePath, file)

      if (storageErr) throw storageErr

      const { data: dbData, error: dbErr } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          type: selectedDocType,
          filename: file.name,
          file_url: storageData.path
        })
        .select()
        .single()

      if (dbErr) throw dbErr

      setDocuments(prev => [dbData, ...prev])
      toast.success(`${selectedDocType} uploaded successfully!`)
    } catch (err: any) {
      toast.error('Failed to upload document: ' + err.message)
    } finally {
      setIsUploading(false)
      if (docInputRef.current) docInputRef.current.value = ''
    }
  }

  const handleDeleteDoc = async (doc: UserDocument) => {
    if (!confirm(`Are you sure you want to delete this ${doc.type} (${doc.filename})?`)) return

    try {
      // Delete storage
      const { error: storageErr } = await supabase.storage
        .from('documents')
        .remove([doc.file_url])

      if (storageErr) console.warn('Failed to delete storage file:', storageErr)

      // Delete DB
      const { error: dbErr } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id)

      if (dbErr) throw dbErr

      setDocuments(prev => prev.filter(d => d.id !== doc.id))
      toast.success('Document deleted successfully.')
    } catch (err: any) {
      toast.error('Failed to delete document: ' + err.message)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Title Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-blue-500" /> Vault Console
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Secure vault cataloging your career credentials, resumes, transcripts, and portfolios.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-900/80 p-0.5 rounded-lg border border-white/5">
          <button
            onClick={() => setActiveTab('resumes')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'resumes'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Resumes
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'documents'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Document Vault
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'resumes' ? (
            <motion.div
              key="resumes"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Resumes Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Upload Section (Left Column) */}
                <div className="lg:col-span-1 space-y-6">
                  <Card className="bg-slate-900/40 border-white/5 p-6 backdrop-blur-md relative overflow-hidden">
                    <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2 mb-4">
                      <UploadCloud className="h-4.5 w-4.5 text-blue-500" /> Upload Resume
                    </h3>

                    <div 
                      onClick={triggerResumeUpload}
                      className="border border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-300 flex flex-col items-center justify-center gap-3 group"
                    >
                      <UploadCloud className="h-10 w-10 text-slate-500 group-hover:text-blue-400 group-hover:scale-110 transition-all duration-300" />
                      <div>
                        <p className="text-xs font-bold text-slate-300">Click or drag PDF here</p>
                        <p className="text-[10px] text-slate-500 mt-1">Accepts PDF files only up to 5MB</p>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleResumeFileChange}
                        accept=".pdf"
                        className="hidden"
                      />
                    </div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Primary Skills (Comma Separated)</label>
                        <Input
                          placeholder="e.g. React, Next.js, TypeScript"
                          value={skillsInput}
                          onChange={(e) => setSkillsInput(e.target.value)}
                          className="mt-1 bg-slate-950/80 border-white/5 focus:border-blue-500 text-xs h-8"
                        />
                        <p className="text-[9px] text-slate-500 mt-1">Skills entered here will be mapped to match score metrics.</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Resumes List (Right Column) */}
                <div className="lg:col-span-2 space-y-4">
                  {resumes.length === 0 ? (
                    <div className="text-center py-16 bg-slate-900/10 border border-dashed border-white/5 rounded-xl">
                      <FileText className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-400">No resumes in vault</p>
                      <p className="text-xs text-slate-500 mt-1">Upload your first resume to unlock match score metrics.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {resumes.map((resume) => (
                        <Card 
                          key={resume.id} 
                          className={`bg-slate-900/30 border p-5 backdrop-blur-md flex flex-col justify-between hover:border-white/10 transition-all duration-300 group ${
                            resume.is_favorite ? 'border-blue-500/20' : 'border-white/5'
                          }`}
                        >
                          <div className="space-y-4">
                            {/* Title & Version Info */}
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 shrink-0">
                                  <FileText className="h-4.5 w-4.5" />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-xs text-slate-200 truncate group-hover:text-white transition-colors">
                                    {resume.filename}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="border-white/10 bg-slate-950 text-[8px] font-mono py-0 scale-95 uppercase">
                                      v{resume.version}
                                    </Badge>
                                    <span className="text-[9px] text-slate-500 font-mono">
                                      {new Date(resume.upload_date).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric'
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Favorite Pin */}
                              <button
                                onClick={() => handleFavoriteToggle(resume)}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  resume.is_favorite
                                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                    : 'bg-white/3 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                }`}
                              >
                                <Star className={`h-3.5 w-3.5 ${resume.is_favorite ? 'fill-current' : ''}`} />
                              </button>
                            </div>

                            {/* Primary Skills tag array */}
                            {resume.primary_skills.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {resume.primary_skills.map((s, idx) => (
                                  <span key={idx} className="bg-blue-500/5 border border-blue-500/10 text-blue-400 text-[8px] px-1.5 py-0.5 rounded font-mono">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}

                            {resume.last_used_at && (
                              <p className="text-[9px] text-slate-500 font-mono flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-slate-600" />
                                Last used: {new Date(resume.last_used_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>

                          {/* Quick Controls Actions */}
                          <div className="mt-6 pt-3 border-t border-white/5 flex justify-between items-center">
                            <Button
                              onClick={() => handlePreview(resume.file_url, resume.filename, 'resumes')}
                              variant="ghost"
                              className="text-[10px] text-blue-400 hover:text-white p-0 h-auto hover:bg-transparent flex items-center gap-1 font-bold"
                            >
                              <Eye className="h-3.5 w-3.5" /> Preview
                            </Button>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRenameClick(resume)}
                                title="Rename"
                                className="p-1.5 rounded bg-white/3 border border-white/5 hover:border-white/10 text-slate-400 hover:text-white transition-colors"
                              >
                                <Edit className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDuplicate(resume)}
                                title="Duplicate version"
                                className="p-1.5 rounded bg-white/3 border border-white/5 hover:border-white/10 text-slate-400 hover:text-white transition-colors"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteResume(resume)}
                                title="Delete"
                                className="p-1.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors"
                              >
                                <Trash className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          ) : (
            <motion.div
              key="documents"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Document categories grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {DOCUMENT_TYPES.map((type) => {
                  const filteredDocs = documents.filter(d => d.type === type)

                  return (
                    <Card key={type} className="bg-slate-900/40 border-white/5 p-5 backdrop-blur-md flex flex-col justify-between min-h-[220px]">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <h4 className="font-extrabold text-xs text-slate-200 tracking-wide">{type}s</h4>
                          <Badge variant="outline" className="border-white/5 bg-slate-950 text-slate-400 text-[9px] font-mono py-0 scale-95">
                            {filteredDocs.length} files
                          </Badge>
                        </div>

                        {/* List of files in this category */}
                        {filteredDocs.length === 0 ? (
                          <p className="text-[10px] text-slate-500 italic py-6 text-center">No uploads logged.</p>
                        ) : (
                          <div className="space-y-2 max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 pr-1">
                            {filteredDocs.map((doc) => (
                              <div key={doc.id} className="flex justify-between items-center text-xs p-1.5 rounded hover:bg-white/2 border border-transparent hover:border-white/5 group">
                                <span className="text-slate-300 font-medium truncate pr-2" title={doc.filename}>{doc.filename}</span>
                                <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handlePreview(doc.file_url, doc.filename, 'documents')}
                                    className="p-1 text-blue-400 hover:text-white"
                                    title="View"
                                  >
                                    <Eye className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDoc(doc)}
                                    className="p-1 text-rose-400 hover:text-rose-300"
                                    title="Delete"
                                  >
                                    <Trash className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Add file button */}
                      <div className="mt-4 pt-2 border-t border-white/5">
                        <Button
                          onClick={() => triggerDocUpload(type)}
                          size="sm"
                          className="w-full bg-slate-950 border border-white/5 hover:bg-slate-900 hover:border-white/10 text-[10px] font-bold text-slate-300 py-1.5 flex items-center justify-center gap-1 rounded-lg"
                        >
                          <Plus className="h-3 w-3" /> Add {type}
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </div>

              {/* Hidden file input for document uploading */}
              <input
                type="file"
                ref={docInputRef}
                onChange={handleDocFileChange}
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Global Uploading Indicator Overlay */}
      {isUploading && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-center items-center gap-3">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
          <p className="text-xs font-bold text-white tracking-widest font-mono uppercase animate-pulse">Syncing credential to database...</p>
        </div>
      )}

      {/* Rename Dialog Modal */}
      <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
        <DialogContent className="max-w-xs bg-slate-950 border border-white/10 p-5 text-slate-100 backdrop-blur-xl">
          <form onSubmit={handleRenameSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-extrabold text-white">Rename Resume</DialogTitle>
              <DialogDescription className="text-slate-400 text-[10px] mt-0.5">
                Key in a new identifier for your resume file.
              </DialogDescription>
            </DialogHeader>

            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="bg-slate-900 border-white/5 text-xs h-8 focus:border-blue-500"
              required
            />

            <DialogFooter className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRenameModal(false)}
                className="border-white/10 hover:bg-white/5 text-slate-300 text-[10px] h-7 px-3"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingRename}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[10px] h-7 px-3 flex items-center gap-1"
              >
                {isSubmittingRename && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Document/PDF Preview Dialog Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl w-[90vw] h-[85vh] bg-slate-950 border border-white/10 p-6 text-slate-100 backdrop-blur-xl flex flex-col justify-between">
          <DialogHeader className="border-b border-white/5 pb-3">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-sm font-extrabold text-white">{previewTitle}</DialogTitle>
              {previewUrl && (
                <a 
                  href={previewUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:underline mr-4"
                >
                  <Download className="h-3 w-3" /> External Link
                </a>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 bg-slate-900 rounded-lg overflow-hidden border border-white/5 relative my-4">
            {previewUrl ? (
              <iframe 
                src={previewUrl} 
                className="w-full h-full border-0" 
                title="PDF Preview"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading file preview...
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-white/5 pt-3">
            <Button
              onClick={() => {
                setShowPreviewModal(false)
                setPreviewUrl(null)
              }}
              className="bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 text-xs px-4"
            >
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
