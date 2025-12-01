import { assertApiUser } from '@/lib/user'
import { BatchDao } from '@/lib/db/dao'
import { ForbiddenError, withErrorHandler } from '@/lib/utils/api-error'

export const maxDuration = 60

async function POST_HANDLER(_req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await assertApiUser()
  const { id } = await props.params
  const batchId = Number(id)
  const owns = await BatchDao.assertBatchOwnership(batchId)
  if (!owns) throw new ForbiddenError()
  // If there are no pending jobs, keep it paused and return summary
  const current = await BatchDao.getBatchSummary(batchId)
  if (current && current.totals.pending === 0) {
    await BatchDao.setBatchPaused(batchId, true)
    const summary = await BatchDao.getBatchSummary(batchId)
    return Response.json({ status: 'OK', summary })
  }
  await BatchDao.setBatchPaused(batchId, false)
  const summary = await BatchDao.getBatchSummary(batchId)
  return Response.json({ status: 'OK', summary })
}

export const POST = withErrorHandler(POST_HANDLER as any)
