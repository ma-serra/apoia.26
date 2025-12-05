'use server'

import { NextResponse } from 'next/server'
import { assertApiUser, isUserModerator } from '@/lib/user'
import { ApiError, withErrorHandler } from '@/lib/utils/api-error'
import knex from '@/lib/db/knex'

async function POST_HANDLER(req: Request, { params }: { params: Promise<{ baseId: string }> }) {
    const user = await assertApiUser()
    const isModerator = await isUserModerator(user)
    if (!isModerator) {
        throw new ApiError('Acesso negado', 403)
    }

    const { baseId } = await params
    const base_id = Number(baseId)

    if (!base_id || isNaN(base_id)) {
        throw new ApiError('base_id inválido', 400)
    }

    const body = await req.json()
    const { newOwnerId } = body

    if (!newOwnerId) {
        throw new ApiError('newOwnerId é obrigatório', 400)
    }

    if (!knex) {
        throw new ApiError('Banco de dados não disponível', 500)
    }

    // Verificar se o prompt existe
    const prompt = await knex('ia_prompt')
        .select('id')
        .where({ base_id })
        .first()

    if (!prompt) {
        throw new ApiError('Prompt não encontrado', 404)
    }

    // Verificar se o novo owner existe
    const newOwner = await knex('ia_user')
        .select('id', 'username', 'name')
        .where({ id: newOwnerId })
        .first()

    if (!newOwner) {
        throw new ApiError('Usuário não encontrado', 404)
    }

    // Atualizar o created_by de todas as versões do prompt
    const updated = await knex('ia_prompt')
        .where({ base_id })
        .update({ created_by: newOwnerId })

    return NextResponse.json({
        success: true,
        updated,
        newOwner: {
            id: newOwner.id,
            username: newOwner.username,
            name: newOwner.name
        }
    })
}

export const POST = withErrorHandler(POST_HANDLER as any)
