'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  MessageSquare,
  Send,
  Video,
  Award,
  Loader2,
  User,
  ExternalLink,
  ChevronRight,
  Briefcase,
  CheckCircle,
  X,
  FileText
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface Contact {
  user_id: string
  full_name: string
  university: string
  internship_title: string
  application_id: string
}

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  message_type: 'General' | 'Interview Request' | 'Offer'
  metadata: {
    round?: string
    interview_date?: string
    meeting_link?: string
    stipend?: string
    duration?: string
    offer_status?: 'Pending' | 'Accepted' | 'Declined'
    application_id?: string
  }
  created_at: string
}

export default function RecruiterMessagesPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string>('')

  // Interview Invite Dialog State
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteRound, setInviteRound] = useState('Technical')
  const [inviteDate, setInviteDate] = useState('')
  const [inviteLink, setInviteLink] = useState('')

  // Offer Dialog State
  const [isOfferOpen, setIsOfferOpen] = useState(false)
  const [offerStipend, setOfferStipend] = useState('₹20,005 / month')
  const [offerDuration, setOfferDuration] = useState('6 Months')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Load Contacts (Applicants)
  const loadContacts = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      // Fetch recruiter internships
      const { data: jobs } = await supabase
        .from('internships')
        .select('id, title')
        .eq('recruiter_id', user.id)

      const jobIds = (jobs || []).map(j => j.id)

      if (jobIds.length > 0) {
        // Fetch applications to populate contacts list
        const { data: apps } = await supabase
          .from('applications')
          .select('*, profiles(id, full_name, university), internships(title)')
          .in('internship_id', jobIds)

        const formattedContacts: Contact[] = (apps || []).map(a => ({
          user_id: a.user_id,
          full_name: a.profiles?.full_name || 'Student Candidate',
          university: a.profiles?.university || 'N/A',
          internship_title: a.internships?.title || 'Intern',
          application_id: a.id
        }))

        // Deduplicate contacts by user_id
        const uniqueContactsMap = new Map<string, Contact>()
        formattedContacts.forEach(c => uniqueContactsMap.set(c.user_id, c))
        setContacts(Array.from(uniqueContactsMap.values()))
      }
    } catch (e: any) {
      toast.error('Failed to load contacts: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // Load Messages for selected contact
  const loadMessages = async (contactId: string) => {
    if (!currentUserId) return
    try {
      setMessagesLoading(true)
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (e: any) {
      toast.error('Failed to load messages: ' + e.message)
    } finally {
      setMessagesLoading(false)
    }
  }

  // Poll for new messages every 3 seconds (real-time light)
  useEffect(() => {
    loadContacts()
  }, [])

  useEffect(() => {
    if (selectedContact) {
      loadMessages(selectedContact.user_id)
      
      const interval = setInterval(() => {
        loadMessages(selectedContact.user_id)
      }, 4000)

      return () => clearInterval(interval)
    }
  }, [selectedContact, currentUserId])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send Text Message
  const handleSendMessage = async (e?: React.FormEvent, type: 'General' | 'Interview Request' | 'Offer' = 'General', customMeta = {}) => {
    if (e) e.preventDefault()
    if (!selectedContact || (!newMessage.trim() && type === 'General')) return

    try {
      const messagePayload = {
        sender_id: currentUserId,
        receiver_id: selectedContact.user_id,
        content: type === 'General' ? newMessage : `Sent an official ${type}`,
        message_type: type,
        metadata: {
          ...customMeta,
          application_id: selectedContact.application_id
        }
      }

      const { error } = await supabase
        .from('messages')
        .insert(messagePayload)

      if (error) throw error

      setNewMessage('')
      loadMessages(selectedContact.user_id)
    } catch (e: any) {
      toast.error('Message failed: ' + e.message)
    }
  }

  // Send Interview Request message
  const handleSendInterviewInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteDate || !selectedContact) return

    try {
      const meta = {
        round: inviteRound,
        interview_date: new Date(inviteDate).toISOString(),
        meeting_link: inviteLink || 'https://meet.google.com'
      }

      await handleSendMessage(undefined, 'Interview Request', meta)
      setIsInviteOpen(false)
      setInviteDate('')
      setInviteLink('')
      toast.success('Interview Invite sent in chat!')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // Send Internship Offer message
  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedContact) return

    try {
      const meta = {
        stipend: offerStipend,
        duration: offerDuration,
        offer_status: 'Pending'
      }

      await handleSendMessage(undefined, 'Offer', meta)
      setIsOfferOpen(false)
      toast.success('Internship Offer sent in chat!')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="h-[75vh] flex bg-slate-900/25 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-xl animate-fade-in relative">
      
      {/* GLow background */}
      <div className="absolute top-0 right-0 w-[180px] h-[180px] bg-gradient-to-bl from-purple-500/5 to-transparent rounded-full blur-[40px] pointer-events-none" />

      {/* Left Contacts list */}
      <div className="w-80 border-r border-white/5 flex flex-col bg-slate-950/40">
        <div className="p-4 border-b border-white/5 shrink-0">
          <h2 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
            <MessageSquare className="h-4.5 w-4.5 text-purple-400" />
            Conversations
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-850">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            </div>
          ) : contacts.length === 0 ? (
            <p className="text-center py-10 text-[10px] text-slate-500 italic">No contacts found</p>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact.user_id}
                onClick={() => setSelectedContact(contact)}
                className={`p-3 rounded-xl cursor-pointer transition-colors border ${
                  selectedContact?.user_id === contact.user_id
                    ? 'bg-white/5 border-white/10 text-white shadow-sm'
                    : 'bg-transparent border-transparent hover:bg-white/5 text-slate-400'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-xs leading-tight truncate max-w-[160px]">{contact.full_name}</h4>
                  <Badge variant="outline" className="border-white/5 bg-slate-950 text-[7px] font-mono py-0 px-1 leading-none uppercase">
                    {contact.internship_title.substring(0, 12)}
                  </Badge>
                </div>
                <p className="text-[9px] text-slate-550 truncate mt-1 leading-none">{contact.university}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Chat window */}
      <div className="flex-1 flex flex-col justify-between bg-slate-950/20">
        {selectedContact ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-white/5 bg-slate-950/40 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-extrabold text-xs text-slate-100">{selectedContact.full_name}</h3>
                <p className="text-[9px] text-slate-500 mt-0.5">{selectedContact.internship_title} • {selectedContact.university}</p>
              </div>

              {/* Chat action shortcuts */}
              <div className="flex items-center gap-2 text-xs">
                <Button
                  onClick={() => setIsInviteOpen(true)}
                  className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-[10px] font-bold px-2.5 h-7 rounded flex items-center gap-1"
                >
                  <Video className="h-3.5 w-3.5" />
                  Invite Interview
                </Button>
                <Button
                  onClick={() => setIsOfferOpen(true)}
                  className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 text-[10px] font-bold px-2.5 h-7 rounded flex items-center gap-1"
                >
                  <Award className="h-3.5 w-3.5" />
                  Send Offer
                </Button>
              </div>
            </div>

            {/* Chat log messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800 bg-slate-950/10">
              {messagesLoading && messages.length === 0 ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.sender_id === currentUserId
                  
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] rounded-2xl p-3.5 text-xs shadow-md border ${
                        isOwn 
                          ? 'bg-blue-600/10 border-blue-500/20 text-slate-100 rounded-tr-none' 
                          : 'bg-slate-900 border-white/5 text-slate-200 rounded-tl-none'
                      }`}>
                        
                        {/* 1. GENERAL TEXT MESSAGE */}
                        {msg.message_type === 'General' && (
                          <p className="leading-relaxed text-[13px]">{msg.content}</p>
                        )}

                        {/* 2. INTERVIEW REQUEST MESSAGE CARD */}
                        {msg.message_type === 'Interview Request' && (
                          <div className="space-y-2 text-xs">
                            <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full block w-fit uppercase tracking-wider font-mono">
                              Interview invitation
                            </span>
                            <p className="font-extrabold text-slate-200">Scheduled: {msg.metadata?.round} Round</p>
                            <p className="text-[10px] text-slate-400 font-mono">Date: {msg.metadata?.interview_date ? new Date(msg.metadata.interview_date).toLocaleString() : 'N/A'}</p>
                            {msg.metadata?.meeting_link && (
                              <a href={msg.metadata.meeting_link} target="_blank" className="flex items-center gap-1 mt-2 text-blue-400 font-bold hover:underline">
                                Join Video Link <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        )}

                        {/* 3. OFFER LETTER CARD */}
                        {msg.message_type === 'Offer' && (
                          <div className="space-y-2 text-xs">
                            <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full block w-fit uppercase tracking-wider font-mono">
                              Corporate Offer Letter
                            </span>
                            <p className="font-extrabold text-slate-200">Position: {selectedContact.internship_title}</p>
                            <p className="text-[10px] text-slate-400">Duration: {msg.metadata?.duration} • Stipend: {msg.metadata?.stipend}</p>
                            
                            <div className="mt-3 flex items-center justify-between gap-4 pt-2.5 border-t border-white/5">
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">STATUS:</span>
                              <Badge className={`text-[8px] font-mono py-0 uppercase ${
                                msg.metadata?.offer_status === 'Accepted'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                                  : msg.metadata?.offer_status === 'Declined'
                                  ? 'bg-rose-500/10 text-rose-450 border border-rose-500/25'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/25 animate-pulse'
                              }`}>
                                {msg.metadata?.offer_status || 'Pending'}
                              </Badge>
                            </div>
                          </div>
                        )}

                        <span className="block text-[8px] text-slate-500 text-right mt-1.5 font-mono">
                          {new Date(msg.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>

                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <form onSubmit={(e) => handleSendMessage(e)} className="p-4 border-t border-white/5 bg-slate-950/40 flex gap-2 shrink-0">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-slate-900 border border-white/5 focus:border-white/10 rounded-xl px-4 py-2.5 text-slate-200 placeholder:text-slate-550 text-xs focus:outline-none focus:ring-0 focus:border-blue-500"
              />
              <Button
                type="submit"
                className="bg-blue-650 hover:bg-blue-550 text-white rounded-xl p-2.5 w-10 h-9.5 flex items-center justify-center shrink-0 shadow-lg shadow-blue-550/15"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center p-6 text-center">
            <MessageSquare className="h-10 w-10 text-slate-750 mb-3" />
            <p className="text-slate-400 text-sm font-semibold">Select a Conversation</p>
            <p className="text-slate-550 text-xs mt-1">Select an applicant candidate from the panel to coordinate interviews and offers.</p>
          </div>
        )}
      </div>

      {/* MODAL: INTERVIEW INVITE SCHEDULER */}
      <AnimatePresence>
        {isInviteOpen && selectedContact && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInviteOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-slate-950 border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl z-50 text-slate-100 flex flex-col gap-4"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Video className="h-4.5 w-4.5 text-amber-500" />
                  Format Interview Invite
                </h3>
                <button onClick={() => setIsInviteOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSendInterviewInvite} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Round (Type)</label>
                  <select
                    value={inviteRound}
                    onChange={(e) => setInviteRound(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 focus:outline-none"
                  >
                    <option>Technical</option>
                    <option>HR</option>
                    <option>Behavioral</option>
                    <option>System Design</option>
                    <option>Online Assessment</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={inviteDate}
                    onChange={(e) => setInviteDate(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2 text-slate-100 focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Meeting link</label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com"
                    value={inviteLink}
                    onChange={(e) => setInviteLink(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsInviteOpen(false)}
                    className="text-slate-450 text-xs hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-450 text-white font-bold text-xs px-4"
                  >
                    Send Invitation
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: SEND OFFER */}
      <AnimatePresence>
        {isOfferOpen && selectedContact && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOfferOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-slate-950 border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl z-50 text-slate-100 flex flex-col gap-4"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Award className="h-4.5 w-4.5 text-purple-500" />
                  Format Official Offer
                </h3>
                <button onClick={() => setIsOfferOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSendOffer} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Stipend offered *</label>
                  <input
                    type="text"
                    required
                    value={offerStipend}
                    onChange={(e) => setOfferStipend(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Duration *</label>
                  <input
                    type="text"
                    required
                    value={offerDuration}
                    onChange={(e) => setOfferDuration(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-slate-100 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsOfferOpen(false)}
                    className="text-slate-450 text-xs hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4"
                  >
                    Send Offer Letter
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
