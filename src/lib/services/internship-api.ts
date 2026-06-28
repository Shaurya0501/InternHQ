import { Internship } from '@/types/internship'

export interface InternshipProvider {
  name: string
  fetchInternships(query?: string): Promise<Internship[]>
}

export class RemotiveProvider implements InternshipProvider {
  name = 'remotive'

  async fetchInternships(query?: string): Promise<Internship[]> {
    let url = 'https://remotive.com/api/remote-jobs?category=software-development&limit=80'
    if (query) {
      url += `&search=${encodeURIComponent(query)}`
    }
    
    try {
      const res = await fetch(url, { 
        next: { revalidate: 1800 }, // Cache for 30 minutes
        headers: {
          'Accept': 'application/json'
        }
      })
      
      if (!res.ok) {
        throw new Error(`Remotive API responded with status: ${res.status}`)
      }
      
      const data = await res.json()
      const jobs = data.jobs || []
      
      return jobs.map((job: any) => {
        // Parse skills from tags
        const skills = Array.isArray(job.tags) ? job.tags : []
        
        return {
          id: `remotive-${job.id}`,
          external_id: String(job.id),
          source: 'remotive',
          company_name: job.company_name,
          company_logo: job.company_logo || undefined,
          role: job.title,
          location: job.candidate_required_location || 'Remote',
          location_type: 'remote' as const,
          stipend: job.salary || undefined,
          experience_required: undefined,
          skills: skills,
          application_deadline: undefined,
          posted_date: job.publication_date,
          url: job.url
        }
      })
    } catch (error) {
      console.error('Error fetching from Remotive API:', error)
      return []
    }
  }
}

export class ArbeitnowProvider implements InternshipProvider {
  name = 'arbeitnow'

  async fetchInternships(query?: string): Promise<Internship[]> {
    const url = 'https://www.arbeitnow.com/api/job-board-api'
    try {
      const res = await fetch(url, { 
        next: { revalidate: 1800 },
        headers: {
          'Accept': 'application/json'
        }
      })
      
      if (!res.ok) {
        throw new Error(`Arbeitnow API responded with status: ${res.status}`)
      }
      
      const data = await res.json()
      const jobs = data.data || []
      
      let mapped = jobs.map((job: any) => {
        let locType: 'remote' | 'hybrid' | 'onsite' | 'unknown' = 'unknown'
        if (job.remote === true) {
          locType = 'remote'
        } else if (job.location) {
          locType = 'onsite'
        }
        
        const skills = Array.isArray(job.tags) ? job.tags : []
        
        return {
          id: `arbeitnow-${job.slug}`,
          external_id: job.slug,
          source: 'arbeitnow',
          company_name: job.company_name,
          company_logo: undefined,
          role: job.title,
          location: job.location || 'Europe',
          location_type: locType,
          stipend: undefined,
          experience_required: undefined,
          skills: skills,
          application_deadline: undefined,
          posted_date: job.created_at ? new Date(job.created_at * 1000).toISOString() : new Date().toISOString(),
          url: job.url
        }
      })

      if (query) {
        const lowerQuery = query.toLowerCase()
        mapped = mapped.filter((job: Internship) => 
          job.role.toLowerCase().includes(lowerQuery) ||
          job.company_name.toLowerCase().includes(lowerQuery) ||
          job.skills.some(s => s.toLowerCase().includes(lowerQuery)) ||
          (job.location && job.location.toLowerCase().includes(lowerQuery))
        )
      }
      
      return mapped
    } catch (error) {
      console.error('Error fetching from Arbeitnow API:', error)
      return []
    }
  }
}

export class LocalIndianProvider implements InternshipProvider {
  name = 'local_india'

  async fetchInternships(query?: string): Promise<Internship[]> {
    const indianJobs: Internship[] = [
      {
        id: 'india-flipkart-1',
        external_id: 'flipkart-1',
        source: 'InternHQ India',
        company_name: 'Flipkart',
        company_logo: 'https://api.dicebear.com/7.x/initials/svg?seed=Flipkart&backgroundColor=0284c7',
        role: 'Software Engineer Intern',
        location: 'Bangalore, Karnataka, India',
        location_type: 'onsite',
        stipend: '₹50,000 / month',
        experience_required: '0-1 years',
        skills: ['React', 'Node.js', 'Data Structures', 'Algorithms'],
        posted_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        url: 'https://www.flipkart.com/careers'
      },
      {
        id: 'india-razorpay-2',
        external_id: 'razorpay-2',
        source: 'InternHQ India',
        company_name: 'Razorpay',
        company_logo: 'https://api.dicebear.com/7.x/initials/svg?seed=Razorpay&backgroundColor=4f46e5',
        role: 'Frontend Developer Intern',
        location: 'Bangalore / Remote, India',
        location_type: 'hybrid',
        stipend: '₹35,000 / month',
        experience_required: 'Entry Level',
        skills: ['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript'],
        posted_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        url: 'https://razorpay.com/jobs'
      },
      {
        id: 'india-cred-5',
        external_id: 'cred-5',
        source: 'InternHQ India',
        company_name: 'CRED',
        company_logo: 'https://api.dicebear.com/7.x/initials/svg?seed=CRED&backgroundColor=020617',
        role: 'Backend Engineer Intern',
        location: 'Bangalore, Karnataka, India',
        location_type: 'hybrid',
        stipend: '₹60,000 / month',
        experience_required: 'Entry Level',
        skills: ['Node.js', 'Express', 'MongoDB', 'Redis', 'Docker'],
        posted_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        url: 'https://cred.club/careers'
      },
      {
        id: 'india-swiggy-6',
        external_id: 'swiggy-6',
        source: 'InternHQ India',
        company_name: 'Swiggy',
        company_logo: 'https://api.dicebear.com/7.x/initials/svg?seed=Swiggy&backgroundColor=ea580c',
        role: 'Backend Developer Intern',
        location: 'Bangalore, Karnataka, India',
        location_type: 'hybrid',
        stipend: '₹40,000 / month',
        experience_required: '0-1 years',
        skills: ['Java', 'Spring Boot', 'Microservices', 'PostgreSQL'],
        posted_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        url: 'https://careers.swiggy.com'
      },
      {
        id: 'india-zomato-7',
        external_id: 'zomato-7',
        source: 'InternHQ India',
        company_name: 'Zomato',
        company_logo: 'https://api.dicebear.com/7.x/initials/svg?seed=Zomato&backgroundColor=dc2626',
        role: 'Frontend Developer Intern',
        location: 'Gurgaon, Haryana, India',
        location_type: 'onsite',
        stipend: '₹45,000 / month',
        experience_required: 'Entry Level',
        skills: ['React', 'Next.js', 'TailwindCSS', 'JavaScript'],
        posted_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        url: 'https://www.zomato.com/careers'
      },
      {
        id: 'india-paytm-8',
        external_id: 'paytm-8',
        source: 'InternHQ India',
        company_name: 'Paytm',
        company_logo: 'https://api.dicebear.com/7.x/initials/svg?seed=Paytm&backgroundColor=0369a1',
        role: 'Web Developer Intern',
        location: 'Noida, Uttar Pradesh, India',
        location_type: 'onsite',
        stipend: '₹25,000 / month',
        experience_required: '0-1 years',
        skills: ['HTML', 'CSS', 'JavaScript', 'jQuery', 'Node.js'],
        posted_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        url: 'https://careers.paytm.com'
      },
      {
        id: 'india-reliancejio-9',
        external_id: 'reliancejio-9',
        source: 'InternHQ India',
        company_name: 'Reliance Jio',
        company_logo: 'https://api.dicebear.com/7.x/initials/svg?seed=Jio&backgroundColor=1d4ed8',
        role: 'Cloud Engineer Intern',
        location: 'Navi Mumbai, Maharashtra, India',
        location_type: 'onsite',
        stipend: '₹30,000 / month',
        experience_required: '0-1 years',
        skills: ['AWS', 'Linux', 'Python', 'Networking'],
        posted_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        url: 'https://careers.jio.com'
      },
      {
        id: 'india-tcs-3',
        external_id: 'tcs-3',
        source: 'InternHQ India',
        company_name: 'Tata Consultancy Services',
        company_logo: 'https://api.dicebear.com/7.x/initials/svg?seed=TCS&backgroundColor=0891b2',
        role: 'React Developer Intern',
        location: 'Mumbai, Maharashtra, India',
        location_type: 'onsite',
        stipend: '₹15,000 / month',
        experience_required: 'Entry Level',
        skills: ['React', 'Redux', 'CSS', 'Bootstrap'],
        posted_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        url: 'https://www.tcs.com/careers'
      },
      {
        id: 'india-infosys-4',
        external_id: 'infosys-4',
        source: 'InternHQ India',
        company_name: 'Infosys',
        company_logo: 'https://api.dicebear.com/7.x/initials/svg?seed=Infosys&backgroundColor=059669',
        role: 'Software Developer Intern',
        location: 'Pune, Maharashtra, India',
        location_type: 'onsite',
        stipend: '₹20,000 / month',
        experience_required: '0-1 years',
        skills: ['Java', 'Spring Boot', 'SQL', 'Hibernate'],
        posted_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        url: 'https://www.infosys.com/careers'
      }
    ]

    if (query) {
      const lowerQuery = query.toLowerCase()
      return indianJobs.filter(job => 
        job.role.toLowerCase().includes(lowerQuery) ||
        job.company_name.toLowerCase().includes(lowerQuery) ||
        job.skills.some(s => s.toLowerCase().includes(lowerQuery)) ||
        (job.location && job.location.toLowerCase().includes(lowerQuery))
      )
    }

    return indianJobs
  }
}

export class TheMuseProvider implements InternshipProvider {
  name = 'themuse'

  async fetchInternships(query?: string): Promise<Internship[]> {
    let url = 'https://www.themuse.com/api/public/jobs?category=Software%20Engineering&level=Internship&level=Entry%20Level&page=1'
    if (query) {
      // The Muse API query parameter is 'search'
      url += `&search=${encodeURIComponent(query)}`
    }

    try {
      const res = await fetch(url, {
        next: { revalidate: 1800 },
        headers: {
          'Accept': 'application/json'
        }
      })
      
      if (!res.ok) {
        throw new Error(`The Muse API responded with status: ${res.status}`)
      }
      
      const data = await res.json()
      const jobs = data.results || []

      const mapped = jobs.map((job: any) => {
        const loc = job.locations?.[0]?.name || 'USA'
        const locLower = loc.toLowerCase()
        let locType: 'remote' | 'hybrid' | 'onsite' = 'onsite'
        if (locLower.includes('remote')) {
          locType = 'remote'
        } else if (locLower.includes('hybrid')) {
          locType = 'hybrid'
        }

        return {
          id: `themuse-${job.id}`,
          external_id: String(job.id),
          source: 'The Muse',
          company_name: job.company?.name || 'Company',
          company_logo: undefined,
          role: job.name,
          location: loc,
          location_type: locType,
          stipend: undefined,
          experience_required: job.levels?.[0]?.name || 'Internship',
          skills: ['Software Engineering', 'Development', 'Web Services'],
          posted_date: job.publication_date,
          url: job.refs?.landing_page || 'https://www.themuse.com'
        }
      })

      return mapped
    } catch (error) {
      console.error('Error fetching from The Muse API:', error)
      return []
    }
  }
}

export class InternshipApiService {
  private providers: InternshipProvider[] = [
    new RemotiveProvider(),
    new ArbeitnowProvider(),
    new TheMuseProvider(),
    new LocalIndianProvider()
  ]

  async search(query?: string): Promise<Internship[]> {
    const results = await Promise.allSettled(
      this.providers.map(p => p.fetchInternships(query))
    )

    const merged: Internship[] = []
    const seen = new Set<string>()

    results.forEach((result, idx) => {
      const providerName = this.providers[idx].name
      if (result.status === 'fulfilled') {
        result.value.forEach(job => {
          // Normalize names for unique keys
          const key = `${job.company_name.toLowerCase()}|${job.role.toLowerCase()}`
          if (!seen.has(key)) {
            seen.add(key)
            merged.push(job)
          }
        })
      } else {
        console.error(`Failed to fetch from ${providerName}:`, result.reason)
      }
    })

    // Retain all foreign and domestic jobs without strict geographic exclusion
    const filtered = merged.filter(job => job.role && job.company_name)

    return filtered.sort((a, b) => {
      const dateA = a.posted_date ? new Date(a.posted_date).getTime() : 0
      const dateB = b.posted_date ? new Date(b.posted_date).getTime() : 0
      return dateB - dateA
    })
  }
}

export const internshipApiService = new InternshipApiService()
