'use server'

import { NextResponse } from 'next/server'
import { assertApiUser, isUserModerator } from '@/lib/user'
import { ApiError, withErrorHandler } from '@/lib/utils/api-error'
import knex from '@/lib/db/knex'

async function GET_HANDLER(req: Request) {
    const user = await assertApiUser()
    const isModerator = await isUserModerator(user)
    if (!isModerator) {
        throw new ApiError('Acesso negado', 403)
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length < 2) {
        return NextResponse.json({ users: [] })
    }

    if (!knex) {
        throw new ApiError('Banco de dados não disponível', 500)
    }

    const searchTerm = `%${query.trim()}%`

    // Buscar usuários por nome, username ou CPF
    const users = await knex('ia_user')
        .select('id', 'username', 'name', 'cpf', 'court_name')
        .where(function() {
            this.where('name', 'ilike', searchTerm)
                .orWhere('username', 'ilike', searchTerm)
                .orWhere('cpf', 'like', searchTerm.replace(/%/g, '') + '%')
        })
        .orderBy('name', 'asc')
        .limit(20)

    return NextResponse.json({ users })
}

export const GET = withErrorHandler(GET_HANDLER as any)
