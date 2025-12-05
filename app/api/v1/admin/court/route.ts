'use server'

import { NextResponse } from 'next/server'
import { CourtDao } from '@/lib/db/dao/court.dao'
import { assertApiUser, isUserModerator } from '@/lib/user'
import { ApiError, withErrorHandler } from '@/lib/utils/api-error'

async function GET_HANDLER() {
    const user = await assertApiUser()
    const isModerator = await isUserModerator(user)
    if (!isModerator) {
        throw new ApiError('Acesso negado', 403)
    }

    const courts = await CourtDao.getAllCourts()
    return NextResponse.json({ items: courts })
}

async function POST_HANDLER(req: Request) {
    const user = await assertApiUser()
    const isModerator = await isUserModerator(user)
    if (!isModerator) {
        throw new ApiError('Acesso negado', 403)
    }

    const body = await req.json()
    const { id, sigla, nome, tipo, seq_tribunal_pai, uf } = body

    if (!id || !sigla || !nome) {
        return NextResponse.json({ errormsg: 'id, sigla e nome são obrigatórios' }, { status: 400 })
    }

    await CourtDao.upsertCourt({
        id: Number(id),
        sigla,
        nome,
        tipo: tipo || null,
        seq_tribunal_pai: seq_tribunal_pai ? Number(seq_tribunal_pai) : null,
        uf: uf || null
    })

    return NextResponse.json({ success: true })
}

export const GET = withErrorHandler(GET_HANDLER as any)
export const POST = withErrorHandler(POST_HANDLER as any)
