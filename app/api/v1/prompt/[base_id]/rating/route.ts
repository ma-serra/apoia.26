'use server'

import { NextRequest, NextResponse } from 'next/server'
import { Dao } from '@/lib/db/mysql'
import { assertCurrentUser } from '@/lib/user'

/**
 * GET /api/v1/prompt/[base_id]/rating
 * Retorna o rating do usuário atual e as estatísticas do prompt
 * 
 * Exemplo de resposta:
 * {
 *   "userRating": { "stars": 4, "createdAt": "2025-11-03T...", "updatedAt": "2025-11-03T..." },
 *   "stats": { "voter_count": 15, "avg_laplace": 4.2, "wilson_score": 3.8 }
 * }
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ base_id: string }> }
) {
  try {
    await assertCurrentUser()
    const params = await props.params
    const baseId = parseInt(params.base_id)

    if (isNaN(baseId)) {
      return NextResponse.json(
        { error: 'ID do prompt inválido' },
        { status: 400 }
      )
    }

    // Busca o rating do usuário e as estatísticas
    const [userRating, stats] = await Promise.all([
      Dao.getUserPromptRating(baseId),
      Dao.getPromptRatingStats(baseId)
    ])

    return NextResponse.json({
      userRating: userRating ? {
        stars: userRating.stars,
        createdAt: userRating.created_at,
        updatedAt: userRating.updated_at
      } : null,
      stats: stats || {
        voter_count: 0,
        avg_laplace: 0,
        wilson_score: 0
      }
    })
  } catch (error: any) {
    console.error('Error getting prompt rating:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar rating' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/prompt/[base_id]/rating
 * Cria ou atualiza o rating do usuário para o prompt
 * 
 * Body: { "stars": 1-5 }
 * 
 * Exemplo de resposta:
 * {
 *   "success": true,
 *   "stats": { "voter_count": 16, "avg_laplace": 4.3, "wilson_score": 3.9 }
 * }
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ base_id: string }> }
) {
  try {
    await assertCurrentUser()
    const params = await props.params
    const baseId = parseInt(params.base_id)

    if (isNaN(baseId)) {
      return NextResponse.json(
        { error: 'ID do prompt inválido' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { stars } = body

    if (!stars || stars < 1 || stars > 5) {
      return NextResponse.json(
        { error: 'Stars deve estar entre 1 e 5' },
        { status: 400 }
      )
    }

    await Dao.upsertPromptRating(baseId, stars)

    // Retorna as estatísticas atualizadas
    const stats = await Dao.getPromptRatingStats(baseId)

    return NextResponse.json({
      success: true,
      stats: stats || {
        voter_count: 0,
        avg_laplace: 0,
        wilson_score: 0
      }
    })
  } catch (error: any) {
    console.error('Error setting prompt rating:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar rating' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/prompt/[base_id]/rating
 * Remove o rating do usuário para o prompt
 */
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ base_id: string }> }
) {
  try {
    await assertCurrentUser()
    const params = await props.params
    const baseId = parseInt(params.base_id)

    if (isNaN(baseId)) {
      return NextResponse.json(
        { error: 'ID do prompt inválido' },
        { status: 400 }
      )
    }

    const deleted = await Dao.deletePromptRating(baseId)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Rating não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting prompt rating:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao remover rating' },
      { status: 500 }
    )
  }
}
