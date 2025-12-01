import { NextRequest, NextResponse } from 'next/server'
import { StatsDao, UserDao } from '@/lib/db/dao'
import { assertApiUser, isUserCorporativo } from '@/lib/user'
import { ForbiddenError, withErrorHandler } from '@/lib/utils/api-error'

/**
 * @swagger
 * /api/v1/stats/user/{userId}:
 *   get:
 *     summary: Retorna estatísticas do usuário
 *     description: Retorna estatísticas pessoais, badges e feedback da comunidade
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

    const stats = await StatsDao.getUserStats(userId)

    return NextResponse.json(stats)
}

export const GET = withErrorHandler(GET_HANDLER as any)
