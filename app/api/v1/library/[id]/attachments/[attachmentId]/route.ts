'use server'

import { NextResponse } from 'next/server'
import { Dao } from '@/lib/db/mysql'
import { assertCurrentUser } from '@/lib/user'
import { withErrorHandler } from '@/lib/utils/api-error'

async function GET_HANDLER(_req: Request, props: { params: Promise<{ id: string, attachmentId: string }> }) {
  await assertCurrentUser()
  const { id, attachmentId } = await props.params
  
  const attachment = await Dao.getLibraryAttachmentById(Number(attachmentId), Number(id))
  
  if (!attachment) {
    return NextResponse.json({ errormsg: 'Anexo não encontrado' }, { status: 404 })
  }

  const headers = new Headers()
  headers.append('Content-Disposition', `attachment; filename="${attachment.filename}"`)
  headers.append('Content-Type', attachment.content_type)
  headers.append('Content-Length', attachment.content_binary.length.toString())

  return new Response(attachment.content_binary as any, { headers })
}

async function DELETE_HANDLER(_req: Request, props: { params: Promise<{ id: string, attachmentId: string }> }) {
  await assertCurrentUser()
  const { id, attachmentId } = await props.params
  
  const deleted = await Dao.deleteLibraryAttachment(Number(attachmentId), Number(id))
  
  if (!deleted) {
    return NextResponse.json({ errormsg: 'Anexo não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}

export const GET = withErrorHandler(GET_HANDLER as any)
export const DELETE = withErrorHandler(DELETE_HANDLER as any)
