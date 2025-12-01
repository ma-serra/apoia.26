import { assertApiUser } from '@/lib/user'
import { BatchDao } from '@/lib/db/dao'

export const maxDuration = 60

// POST /api/v1/batch/{id}/play
async function POST_HANDLER(req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await assertApiUser()
  const { id } = await props.params
  try {
    await BatchDao.setBatchPaused(Number(id), false)
    const summary = await BatchDao.getBatchSummary(Number(id))
    return Response.json({ status: 'OK', summary })
  } catch (e: any) {
    return Response.json({ errormsg: e?.message || String(e) }, { status: 500 })
  }
}

export const POST = POST_HANDLER as any