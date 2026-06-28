'use client'

import React, { useState, useEffect } from 'react'
import { Internship } from '@/types/internship'
import { Card } from '@/components/ui/card'
import { MapPin, Clock, ArrowUpRight, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function RecentlyViewedJobs() {
  const [viewedJobs, setViewedJobs] = useState<Internship[]>([])

  useEffect(() => {
    const list = localStorage.getItem('recently_viewed')
    if (list) {
      try {
        setViewedJobs(JSON.parse(list))
      } catch (e) {
        console.error('Failed to parse recently viewed jobs')
      }
    }
  }, [])

  if (viewedJobs.length === 0) {
    return (
      <div className="text-center py-6 border border-dashed border-white/5 rounded-xl text-xs text-slate-500 bg-slate-900/10">
        No recently viewed opportunities.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {viewedJobs.map((job) => {
        const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          job.company_name
        )}&backgroundColor=0f172a,1e293b,334155`

        return (
          <div
            key={job.id}
            className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-white/5 hover:border-white/10 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                <img
                  src={job.company_logo || defaultAvatar}
                  alt={job.company_name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs text-slate-200 truncate">{job.role}</p>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">{job.company_name}</p>
              </div>
            </div>
            
            <Link href="/dashboard/internships">
              <Button size="icon-sm" variant="ghost" className="h-6 w-6 text-blue-400 hover:text-white shrink-0">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        )
      })}
    </div>
  )
}
