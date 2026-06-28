import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recommendationEngine } from '@/lib/services/recommendations'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recommendations = await recommendationEngine.getRecommendations(user.id)
    
    return NextResponse.json(recommendations)
  } catch (error: any) {
    console.error('API Route Error in /api/recommendations:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
