import { NextRequest, NextResponse } from 'next/server'
import { PromptDao } from '@/lib/db/dao'
import { assertApiUser, isUserModerator } from '@/lib/user'
import { BadRequestError, ForbiddenError, withErrorHandler } from '@/lib/utils/api-error'

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

  const rows = await PromptDao.retrievePromptUsageReport({
    court_id: court_id ? parseInt(court_id, 10) : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })

  return NextResponse.json({ rows })
}

async function POST_HANDLER(req: NextRequest) {
  const user = await assertApiUser()
  const isModerator = await isUserModerator(user)
  
  if (!isModerator) {
    throw new ForbiddenError('Acesso restrito a moderadores')
  }

  const { prompt_key, month, year, court_id } = await req.json()

  if (!prompt_key || !month || !year) {
    throw new BadRequestError('Parâmetros obrigatórios: prompt_key, month, year')
  }

  const rows = await PromptDao.retrievePromptUsageDetail({
    prompt_key,
    month: parseInt(month, 10),
    year: parseInt(year, 10),
    court_id: court_id ? parseInt(court_id, 10) : undefined,
  })

  return NextResponse.json({ rows })
}

export const GET = withErrorHandler(GET_HANDLER as any)
export const POST = withErrorHandler(POST_HANDLER as any)
