import { NextRequest, NextResponse } from 'next/server'
import { StatsDao } from '@/lib/db/dao'
import { assertApiUser, isUserCorporativo } from '@/lib/user'
import { ForbiddenError, withErrorHandler } from '@/lib/utils/api-error'

/**
 * @swagger
 * /api/v1/stats/global:
 *   get:
 *     summary: Retorna estatísticas globais da comunidade
 *     description: Retorna KPIs globais, ranking de tribunais, top contribuidores e prompts em alta
 *     tags:
 *       - Stats
 *     responses:
 *       200:
 *         description: Estatísticas globais
 *       401:
 *         description: Usuário não autenticado
 *       403:
 *         description: Usuário não é corporativo
 */
async function GET_HANDLER(req: NextRequest) {
    const user = await assertApiUser()
    
    if (!await isUserCorporativo(user)) {
        throw new ForbiddenError('Acesso restrito a usuários corporativos')
    }

    const stats = await StatsDao.getGlobalStats()

    return NextResponse.json(stats)
}

export const GET = withErrorHandler(GET_HANDLER as any)
