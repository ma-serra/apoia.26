'use server'

import { NextResponse } from 'next/server'
import { CourtDao } from '@/lib/db/dao/court.dao'
import { assertApiUser, isUserModerator } from '@/lib/user'
import { ApiError, withErrorHandler } from '@/lib/utils/api-error'
import knex from '@/lib/db/knex'

async function GET_HANDLER(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await assertApiUser()
    const isModerator = await isUserModerator(user)
    if (!isModerator) {
        throw new ApiError('Acesso negado', 403)
    }

    const { id } = await params
    const court = await CourtDao.getCourtById(Number(id))
    if (!court) {
        throw new ApiError('Tribunal não encontrado', 404)
    }

    return NextResponse.json(court)
}

async function PUT_HANDLER(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await assertApiUser()
    const isModerator = await isUserModerator(user)
    if (!isModerator) {
        throw new ApiError('Acesso negado', 403)
    }

    const { id } = await params
    const body = await req.json()
    const { sigla, nome, tipo, seq_tribunal_pai, uf } = body

    if (!sigla || !nome) {
        return NextResponse.json({ errormsg: 'sigla e nome são obrigatórios' }, { status: 400 })
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

async function DELETE_HANDLER(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await assertApiUser()
    const isModerator = await isUserModerator(user)
    if (!isModerator) {
        throw new ApiError('Acesso negado', 403)
    }

    const { id } = await params
    
    if (!knex) {
        throw new ApiError('Banco de dados não disponível', 500)
    }

    await knex('ia_court').where({ id: Number(id) }).delete()
    return NextResponse.json({ success: true })
}

export const GET = withErrorHandler(GET_HANDLER as any)
export const PUT = withErrorHandler(PUT_HANDLER as any)
export const DELETE = withErrorHandler(DELETE_HANDLER as any)
