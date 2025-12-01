import { getCurrentUser, assertApiUser } from '@/lib/user'
import { BatchDao } from '@/lib/db/dao'
import { UnauthorizedError, ForbiddenError, withErrorHandler } from '@/lib/utils/api-error'

export const maxDuration = 60

async function POST_HANDLER(_req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await assertApiUser()
  const { id } = await props.params
  const batchId = Number(id)
  const owns = await BatchDao.assertBatchOwnership(batchId)
  if (!owns) throw new ForbiddenError()
  await BatchDao.setBatchPaused(batchId, true)
  const summary = await BatchDao.getBatchSummary(batchId)
  return Response.json({ status: 'OK', summary })
}

export const POST = withErrorHandler(POST_HANDLER as any)
