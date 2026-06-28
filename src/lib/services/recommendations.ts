import { createClient } from '@/lib/supabase/server'
import { Internship } from '@/types/internship'
import { internshipApiService } from './internship-api'

export interface RecommendedCategory {
  title: string
  description: string
  jobs: (Internship & { score: number; reasons: string[] })[]
}

export class SmartRecommendationEngine {
  async getCategorizedRecommendations(userId: string): Promise<RecommendedCategory[]> {
    const supabase = await createClient()

    // 1. Fetch profiles and skill_profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    const { data: skillProfile } = await supabase
      .from('skill_profile')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (!profile) return []

    const userSkills: string[] = skillProfile?.skills || profile.skills || []
    const preferredRoles: string[] = skillProfile?.preferred_roles || profile.preferred_roles || []
    const preferredLocations: string[] = skillProfile?.preferred_locations || profile.preferred_locations || []
    const remotePreference = skillProfile?.remote_preference || 'any'
    const techStack = skillProfile?.preferred_tech_stack || []

    // 2. Fetch saved & applied internships
    const { data: saved } = await supabase
      .from('saved_internships')
      .select('internship_id, internships(*)')
      .eq('user_id', userId)

    const { data: applied } = await supabase
      .from('applications')
      .select('internship_id, internships(*)')
      .eq('user_id', userId)

    // 3. Fetch followed companies
    const { data: followed } = await supabase
      .from('company_follows')
      .select('company_name')
      .eq('user_id', userId)

    const followedCompanies = new Set(followed?.map(f => f.company_name.toLowerCase()) || [])
    const appliedIds = new Set(applied?.map((a: any) => a.internship_id) || [])
    const savedIds = new Set(saved?.map((s: any) => s.internship_id) || [])

    // Get applied roles for "Because you applied to..." category
    const appliedRoles = new Set(applied?.map((a: any) => a.internships?.role.toLowerCase()) || [])

    // 4. Fetch live internships
    const liveJobs = await internshipApiService.search()

    // 5. Scoring Algorithm
    const scoredJobs = liveJobs.map(job => {
      let score = 40 // base score
      const reasons: string[] = []
      const jobSkillsLower = job.skills.map((s: string) => s.toLowerCase())
      const userSkillsLower = userSkills.map((s: string) => s.toLowerCase())
      const techStackLower = techStack.map((t: string) => t.toLowerCase())
      const roleLower = job.role.toLowerCase()
      const companyLower = job.company_name.toLowerCase()
      const locLower = (job.location || '').toLowerCase()

      // A. Skills match (Max 25)
      if (job.skills.length > 0) {
        const matchedSkills = job.skills.filter(s => userSkillsLower.includes(s.toLowerCase()))
        const pct = matchedSkills.length / job.skills.length
        score += Math.round(pct * 25)
        if (matchedSkills.length > 0) {
          reasons.push(`Matches your skills (${matchedSkills.slice(0, 1).join(', ')})`)
        }
      }

      // B. Tech stack match (Max 15)
      if (techStack.length > 0 && job.skills.length > 0) {
        const matchedStack = job.skills.filter(s => techStackLower.includes(s.toLowerCase()))
        if (matchedStack.length > 0) {
          score += 15
          reasons.push('Fits preferred tech stack')
        }
      }

      // C. Preferred Role match (Max 15)
      let roleMatched = false
      for (const prefRole of preferredRoles) {
        if (roleLower.includes(prefRole.toLowerCase())) {
          score += 15
          roleMatched = true
          reasons.push(`Fits preferred role ${prefRole}`)
          break
        }
      }

      // D. Company Follow match (Max 10)
      if (followedCompanies.has(companyLower)) {
        score += 10
        reasons.push(`Posted by followed company ${job.company_name}`)
      }

      // E. Location / Remote Preference match (Max 15)
      const isJobRemote = job.location_type === 'remote' || locLower.includes('remote')
      if (remotePreference === 'remote' && isJobRemote) {
        score += 15
        reasons.push('Matches remote work preference')
      } else if (remotePreference === 'hybrid' && job.location_type === 'hybrid') {
        score += 15
        reasons.push('Matches hybrid work preference')
      } else if (remotePreference === 'onsite' && job.location_type === 'onsite') {
        score += 15
        reasons.push('Matches onsite work preference')
      }

      return {
        ...job,
        score: Math.min(100, score),
        reasons
      }
    })

    const unappliedScoredJobs = scoredJobs.filter(item => {
      // match by URL or company name + role
      const matchesUrl = Array.from(applied || []).some((a: any) => a.internships?.url === item.url)
      return !matchesUrl && !appliedIds.has(item.id)
    })

    // Category 1: Recommended for You (Score > 75%)
    const recs = unappliedScoredJobs
      .filter(item => item.score >= 70)
      .sort((a,b) => b.score - a.score)
      .slice(0, 4)

    // Category 2: Trending (High score or from prominent companies, or top of unapplied list)
    const trending = unappliedScoredJobs
      .filter(item => item.source !== 'manual')
      .sort((a, b) => b.score - a.score)
      .slice(2, 6) // shift offset slightly for variety

    // Category 3: New Today (Posted in last 48 hours)
    const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000
    const newToday = unappliedScoredJobs
      .filter(item => item.posted_date ? new Date(item.posted_date).getTime() >= fortyEightHoursAgo : false)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)

    // Category 4: Because You Applied To...
    // Find jobs that have similar roles to what the user applied to
    let becauseApplied: any[] = []
    if (appliedRoles.size > 0) {
      becauseApplied = unappliedScoredJobs
        .filter(item => {
          const roleLower = item.role.toLowerCase()
          return Array.from(appliedRoles).some(appliedRole => 
            roleLower.includes(appliedRole) || appliedRole.includes(roleLower)
          )
        })
        .slice(0, 4)
    }

    const categories: RecommendedCategory[] = [
      {
        title: 'Recommended for You',
        description: 'Opportunities highly relevant to your career preferences and skills.',
        jobs: recs
      },
      {
        title: 'Trending Opportunities',
        description: 'Highly viewed internships in software engineering and frontend development.',
        jobs: trending
      },
      {
        title: 'New Today',
        description: 'Opportunities posted in the last 48 hours.',
        jobs: newToday
      }
    ]

    if (becauseApplied.length > 0) {
      categories.push({
        title: 'Because You Applied To Similar Roles',
        description: 'Opportunities matching your active application categories.',
        jobs: becauseApplied
      })
    }

    return categories
  }

  // Fallback signature to preserve compatibility with existing code
  async getRecommendations(userId: string): Promise<Internship[]> {
    const categories = await this.getCategorizedRecommendations(userId)
    const recs = categories.find(c => c.title === 'Recommended for You')?.jobs || []
    return recs
  }
}

export const recommendationEngine = new SmartRecommendationEngine()
