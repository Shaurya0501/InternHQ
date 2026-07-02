'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  MessageSquare,
  Send,
  Video,
  Award,
  Loader2,
  ExternalLink,
  Building,
  Check,
  X,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Contact {
  recruiter_id: string
  hr_name: string
  company_name: string
  company_logo?: string
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

export default function StudentMessagesPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string>('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Load Contacts (Recruiters who messaged or whose jobs the student applied to)
  const loadContacts = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      // Fetch student applications
      const { data: apps } = await supabase
        .from('applications')
        .select('*, internships(*)')

      if (!apps || apps.length === 0) {
        setContacts([])
        return
      }

      // Fetch recruiters for these internships
      const recruiterIds = apps.map(a => a.internships?.recruiter_id).filter(Boolean)

      if (recruiterIds.length > 0) {
        const { data: recs } = await supabase
          .from('recruiters')
          .select('*, companies(*)')
          .in('id', recruiterIds)

        const formattedContacts: Contact[] = (apps || []).map(a => {
          const rec = recs?.find(r => r.id === a.internships?.recruiter_id)
          return {
            recruiter_id: a.internships?.recruiter_id,
            hr_name: rec?.hr_name || 'HR Representative',
            company_name: rec?.companies?.name || a.internships?.company_name || 'Hiring Manager',
            company_logo: rec?.companies?.logo_url || null,
            application_id: a.id
          }
        }).filter(c => c.recruiter_id)

        // Deduplicate contacts by recruiter_id
        const uniqueContactsMap = new Map<string, Contact>()
        formattedContacts.forEach(c => uniqueContactsMap.set(c.recruiter_id, c))
        setContacts(Array.from(uniqueContactsMap.values()))
      }
    } catch (e: any) {
      toast.error('Failed to load contacts: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // Load Messages
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

  useEffect(() => {
    loadContacts()
  }, [])

  useEffect(() => {
    if (selectedContact) {
      loadMessages(selectedContact.recruiter_id)
      
      const interval = setInterval(() => {
        loadMessages(selectedContact.recruiter_id)
      }, 4000)

      return () => clearInterval(interval)
    }
  }, [selectedContact, currentUserId])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedContact || !newMessage.trim()) return

    try {
      const messagePayload = {
        sender_id: currentUserId,
        receiver_id: selectedContact.recruiter_id,
        content: newMessage,
        message_type: 'General',
        metadata: {
          application_id: selectedContact.application_id
        }
      }

      const { error } = await supabase
        .from('messages')
        .insert(messagePayload)

      if (error) throw error

      setNewMessage('')
      loadMessages(selectedContact.recruiter_id)
    } catch (e: any) {
      toast.error('Message failed: ' + e.message)
    }
  }

  // Accept or Decline Offer Letter
  const handleOfferResponse = async (msgId: string, currentMeta: any, action: 'Accepted' | 'Declined') => {
    try {
      const updatedMeta = {
        ...currentMeta,
        offer_status: action
      }

      // 1. Update message metadata
      const { error: msgErr } = await supabase
        .from('messages')
        .update({ metadata: updatedMeta })
        .eq('id', msgId)

      if (msgErr) throw msgErr

      // 2. Update Student Application Status in applications table
      if (selectedContact) {
        const { error: appErr } = await supabase
          .from('applications')
          .update({ status: action === 'Accepted' ? 'Offer' : 'Withdrawn' })
          .eq('id', selectedContact.application_id)

        if (appErr) throw appErr
      }

      // 3. Send Notification to Recruiter
      if (selectedContact) {
        await supabase.from('notifications').insert({
          user_id: selectedContact.recruiter_id,
          title: `Offer ${action}`,
          body: `Candidate has ${action.toLowerCase()} the internship offer at ${selectedContact.company_name}.`,
          type: 'milestone_unlocked'
        })
      }

      toast.success(`Offer ${action} successfully!`)
      if (selectedContact) loadMessages(selectedContact.recruiter_id)
    } catch (e: any) {
      toast.error('Failed to log response: ' + e.message)
    }
  }

  return (
    <div className="h-[75vh] flex bg-slate-900/25 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-xl animate-fade-in relative">
      <div className="absolute top-0 right-0 w-[180px] h-[180px] bg-gradient-to-bl from-blue-500/5 to-transparent rounded-full blur-[40px] pointer-events-none" />

      {/* Left Contacts list */}
      <div className="w-80 border-r border-white/5 flex flex-col bg-slate-950/40">
        <div className="p-4 border-b border-white/5 shrink-0">
          <h2 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
            <MessageSquare className="h-4.5 w-4.5 text-blue-400" />
            Recruiter Chats
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-850">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            </div>
          ) : contacts.length === 0 ? (
            <p className="text-center py-10 text-[10px] text-slate-500 italic">No recruiters messaged yet.</p>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact.recruiter_id}
                onClick={() => setSelectedContact(contact)}
                className={`p-3 rounded-xl cursor-pointer transition-colors border ${
                  selectedContact?.recruiter_id === contact.recruiter_id
                    ? 'bg-white/5 border-white/10 text-white shadow-sm'
                    : 'bg-transparent border-transparent hover:bg-white/5 text-slate-400'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-xs leading-tight truncate max-w-[160px]">{contact.company_name}</h4>
                </div>
                <p className="text-[9px] text-slate-550 truncate mt-1 leading-none">{contact.hr_name} • HR Representative</p>
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
                <h3 className="font-extrabold text-xs text-slate-100">{selectedContact.company_name}</h3>
                <p className="text-[9px] text-slate-500 mt-0.5">{selectedContact.hr_name} (HR Head)</p>
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
                              Interview Round Scheduled
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
                          <div className="space-y-2.5 text-xs">
                            <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full block w-fit uppercase tracking-wider font-mono">
                              Corporate Offer Letter
                            </span>
                            <p className="font-extrabold text-slate-250">Position: {selectedContact.company_name} Intern</p>
                            <p className="text-[10px] text-slate-400">Duration: {msg.metadata?.duration} • Stipend: {msg.metadata?.stipend}</p>
                            
                            {/* Offer response actions for student */}
                            {msg.metadata?.offer_status === 'Pending' ? (
                              <div className="flex gap-2 pt-2 border-t border-white/5">
                                <Button
                                  onClick={() => handleOfferResponse(msg.id, msg.metadata, 'Accepted')}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold h-7 py-1 px-2.5 flex items-center gap-1 rounded"
                                >
                                  <Check className="h-3 w-3" /> Accept
                                </Button>
                                <Button
                                  onClick={() => handleOfferResponse(msg.id, msg.metadata, 'Declined')}
                                  className="bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-bold h-7 py-1 px-2.5 flex items-center gap-1 rounded"
                                >
                                  <X className="h-3 w-3" /> Decline
                                </Button>
                              </div>
                            ) : (
                              <div className="mt-3 flex items-center justify-between gap-4 pt-2.5 border-t border-white/5">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Offer choice:</span>
                                <Badge className={`text-[8px] font-mono py-0 uppercase ${
                                  msg.metadata?.offer_status === 'Accepted'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                                    : 'bg-rose-500/10 text-rose-450 border border-rose-500/25'
                                }`}>
                                  {msg.metadata?.offer_status}
                                </Badge>
                              </div>
                            )}
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
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-slate-950/40 flex gap-2 shrink-0">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your reply..."
                className="flex-1 bg-slate-900 border border-white/5 focus:border-white/10 rounded-xl px-4 py-2.5 text-slate-200 placeholder:text-slate-550 text-xs focus:outline-none focus:ring-0 focus:border-blue-500"
              />
              <Button
                type="submit"
                className="bg-blue-650 hover:bg-blue-550 text-white rounded-xl p-2.5 w-10 h-9.5 flex items-center justify-center shrink-0 shadow-lg"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center p-6 text-center">
            <MessageSquare className="h-10 w-10 text-slate-750 mb-3" />
            <p className="text-slate-400 text-sm font-semibold">Select a Conversation</p>
            <p className="text-slate-550 text-xs mt-1">Select a recruiter contact from the panel to view messages, interviews, and official offers.</p>
          </div>
        )}
      </div>

    </div>
  )
}
