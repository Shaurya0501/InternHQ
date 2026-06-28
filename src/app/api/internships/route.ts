import { NextRequest, NextResponse } from 'next/server'
import { internshipApiService } from '@/lib/services/internship-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || undefined
    
    const jobs = await internshipApiService.search(query)
    
    return NextResponse.json(jobs)
  } catch (error: any) {
    console.error('API Route Error in /api/internships:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
