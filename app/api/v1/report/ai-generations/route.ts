import { NextRequest, NextResponse } from 'next/server'
import { Dao } from '@/lib/db/mysql'
import { assertApiUser, isUserModerator } from '@/lib/user'
import { ForbiddenError, withErrorHandler } from '@/lib/utils/api-error'

async function GET_HANDLER(req: NextRequest) {
  const user = await assertApiUser()
  const isModerator = await isUserModerator(user)
  
  if (!isModerator) {
    throw new ForbiddenError('Acesso restrito a moderadores')
  }

  const { searchParams } = new URL(req.url)
  const court_id = searchParams.get('court_id')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const limit = searchParams.get('limit')

  const rows = await Dao.retrieveAIGenerationsReport({
    court_id: court_id ? parseInt(court_id, 10) : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    limit: limit ? parseInt(limit, 10) : 5000,
  })

  return NextResponse.json({ rows, total: rows.length })
}

export const GET = withErrorHandler(GET_HANDLER as any)
