import { RatingDao } from "@/lib/db/dao"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/v1/prompt/[base_id]/rating/distribution
 * Retorna a distribuição de votos por estrelas para um prompt
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ base_id: string }> }
) {
    try {
        const { base_id } = await params
        const promptBaseId = parseInt(base_id)
        
        if (isNaN(promptBaseId)) {
            return NextResponse.json(
                { error: 'Invalid prompt base_id' },
                { status: 400 }
            )
        }

        // Busca a distribuição de votos
        const distribution = await RatingDao.getPromptRatingDistribution(promptBaseId)

        return NextResponse.json({ 
            distribution 
        })
    } catch (error) {
        console.error('Error fetching rating distribution:', error)
        return NextResponse.json(
            { error: 'Failed to fetch rating distribution' },
            { status: 500 }
        )
    }
}
