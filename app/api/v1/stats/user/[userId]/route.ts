import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { StatsDao, UserDao } from '@/lib/db/dao'
import { assertApiUser, isUserCorporativo } from '@/lib/user'
import { ForbiddenError, withErrorHandler } from '@/lib/utils/api-error'
import devLog from '@/lib/utils/log'

// Cache de 24 horas para as estatísticas do usuário
// A função será executada apenas 1x a cada 24h por usuário
const getUserStatsCached = (userId: number) => unstable_cache(
    async () => {
        devLog(`Cache miss: fetching user stats for userId=${userId}`)
        return await StatsDao.getUserStats(userId)
    },
    [`user-stats-${userId}`], // cache key única por usuário
    {
        revalidate: 86400, // 24 horas em segundos
        tags: [`user-stats-${userId}`] // permite invalidação manual com revalidateTag(`user-stats-${userId}`)
    }
)

/**
 * @swagger
 * /api/v1/stats/user/{userId}:
 *   get:
 *     summary: Retorna estatísticas do usuário
 *     description: Retorna estatísticas pessoais, badges e feedback da comunidade (cache de 24h)
 *     tags:
 *       - Stats
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         description: ID do usuário ou "me" para o usuário atual
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estatísticas do usuário
 *       401:
 *         description: Usuário não autenticado
 *       403:
 *         description: Usuário não é corporativo
 */
async function GET_HANDLER(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    // IMPORTANTE: Valida autenticação e permissões ANTES de buscar dados cacheados
    const user = await assertApiUser()
    
    if (!await isUserCorporativo(user)) {
        throw new ForbiddenError('Acesso restrito a usuários corporativos')
    }

    const { userId: userIdParam } = await params
    
    // Se userId for "me", buscar o ID do usuário atual
    let userId: number
    if (userIdParam === 'me') {
        userId = await UserDao.getCurrentUserId()
    } else {
        userId = parseInt(userIdParam, 10)
        if (isNaN(userId)) {
            return NextResponse.json({ error: 'ID de usuário inválido' }, { status: 400 })
        }
    }

    // Busca dados do cache (StatsDao.getUserStats só executa 1x a cada 24h por usuário)
    const stats = await getUserStatsCached(userId)()

    return NextResponse.json(stats)
}

export const GET = withErrorHandler(GET_HANDLER as any)
