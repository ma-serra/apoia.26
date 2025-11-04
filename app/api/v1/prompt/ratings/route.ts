'use server'

import { NextResponse } from 'next/server'
import { Dao } from '@/lib/db/mysql'
import { assertCurrentUser } from '@/lib/user'

/**
 * GET /api/v1/prompt/ratings
 * Retorna as estatísticas de rating de todos os prompts
 */
export async function GET() {
  try {
    await assertCurrentUser()
    const stats = await Dao.getAllPromptRatingStats()
    return NextResponse.json({ stats })
  } catch (error: any) {
    console.error('Error getting all prompt ratings:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar ratings' },
      { status: 500 }
    )
  }
}
