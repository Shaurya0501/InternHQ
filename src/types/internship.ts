export interface Internship {
  id: string
  external_id?: string
  source: string // 'remotive' | 'arbeitnow' | 'manual'
  company_name: string
  company_logo?: string
  role: string
  location?: string
  location_type: 'remote' | 'hybrid' | 'onsite' | 'unknown'
  stipend?: string
  experience_required?: string
  skills: string[]
  application_deadline?: string
  posted_date?: string
  url: string
  created_at?: string
}

export interface SavedInternship {
  id: string
  user_id: string
  internship_id: string
  created_at: string
  internships?: Internship // Joined relation from Supabase
}

export type ApplicationStatus =
  | 'Saved'
  | 'Applied'
  | 'Online Assessment'
  | 'Interview'
  | 'Offer'
  | 'Rejected'
  | 'Withdrawn'

export interface Application {
  id: string
  user_id: string
  internship_id: string
  status: ApplicationStatus
  applied_date: string
  notes?: string
  created_at: string
  updated_at: string
  resume_id?: string
  internships?: Internship // Joined relation from Supabase
  application_timeline?: ApplicationTimelineEvent[] // Joined relation from Supabase
  email_events?: EmailEvent[]
  calendar_events?: CalendarEvent[]
}

export interface ApplicationTimelineEvent {
  id: string
  application_id: string
  status: ApplicationStatus
  event_date: string
  notes?: string
  created_at: string
  update_type: 'manual' | 'email' | 'system'
  email_subject?: string
  email_preview?: string
  email_event_id?: string
}

export interface RecommendationCache {
  id: string
  user_id: string
  internship_id: string
  score: number
  recommended_at: string
  internships?: Internship
}

export interface ParsedEmail {
  gmailMessageId: string
  subject: string
  sender: string
  preview: string
  body: string
  company: string
  date: Date
}

export interface EmailEvent {
  id: string
  user_id: string
  application_id?: string
  gmail_message_id: string
  subject: string
  sender: string
  preview?: string
  body?: string
  company?: string
  classification: 'Application Confirmation' | 'Assessment' | 'Interview Invitation' | 'Interview Reminder' | 'Offer Letter' | 'Rejected' | 'Waitlisted' | 'General Updates'
  date: string
  created_at: string
}

export interface CalendarEvent {
  id: string
  user_id: string
  application_id?: string
  google_event_id?: string
  title: string
  description?: string
  start_time: string
  end_time: string
  event_type: 'Interview' | 'Assessment' | 'Offer Discussion' | 'Deadline Reminder'
  created_at: string
}

export interface ReminderSettings {
  user_id: string
  interview_reminder_enabled: boolean
  interview_reminder_timing: number
  assessment_reminder_enabled: boolean
  assessment_reminder_timing: number
  deadline_reminder_enabled: boolean
  deadline_reminder_timing: number
  created_at?: string
  updated_at?: string
}

export interface OAuthToken {
  user_id: string
  access_token: string
  refresh_token?: string
  expires_at?: string
  token_type?: string
  scope?: string
  created_at?: string
  updated_at?: string
}

