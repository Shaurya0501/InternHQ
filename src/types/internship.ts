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
  internships?: Internship // Joined relation from Supabase
  application_timeline?: ApplicationTimelineEvent[] // Joined relation from Supabase
}

export interface ApplicationTimelineEvent {
  id: string
  application_id: string
  status: ApplicationStatus
  event_date: string
  notes?: string
  created_at: string
}

export interface RecommendationCache {
  id: string
  user_id: string
  internship_id: string
  score: number
  recommended_at: string
  internships?: Internship
}
