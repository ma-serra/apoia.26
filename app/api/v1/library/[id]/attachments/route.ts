'use server'

import { NextResponse } from 'next/server'
import { LibraryDao } from '@/lib/db/dao'
import { assertCurrentUser } from '@/lib/user'
import { pdfToText } from '@/lib/pdf/pdf'
import { withErrorHandler } from '@/lib/utils/api-error'

const MAX_FILE_SIZE = 1 * 1024 * 1024 // 1MB
const MAX_ATTACHMENTS = 10

const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length
}

async function GET_HANDLER(_req: Request, props: { params: Promise<{ id: string }> }) {
  await assertCurrentUser()
  const { id } = await props.params
  const attachments = await LibraryDao.listLibraryAttachments(Number(id))
  return NextResponse.json({ attachments })
}

async function POST_HANDLER(req: Request, props: { params: Promise<{ id: string }> }) {
  await assertCurrentUser()
  const { id } = await props.params
  const library_id = Number(id)

  // Check attachment limit
  const currentCount = await LibraryDao.countLibraryAttachments(library_id)
  if (currentCount >= MAX_ATTACHMENTS) {
    return NextResponse.json(
      { errormsg: `Limite de ${MAX_ATTACHMENTS} anexos atingido` },
      { status: 400 }
    )
  }

  const form = await req.formData()
  const file = form.get('file') as File | null

  if (!file) {
    return NextResponse.json({ errormsg: 'Arquivo não fornecido' }, { status: 400 })
  }

  // Validate file type
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ errormsg: 'Apenas arquivos PDF são permitidos' }, { status: 400 })
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ errormsg: 'Arquivo maior que 1MB' }, { status: 400 })
  }

  try {
    // Read file content
    const bytes = await file.arrayBuffer()
    const content_binary = Buffer.from(bytes)

    // Extract text from PDF
    let content_text: string | null = null
    let word_count: number | null = null

    try {
      content_text = await pdfToText(bytes, {})
      if (content_text) {
        word_count = countWords(content_text)
      }
    } catch (error) {
      console.error('Error extracting text from PDF:', error)
      // Continue without text extraction
    }

    // Insert attachment
    const attachmentId = await LibraryDao.insertLibraryAttachment({
      library_id,
      filename: file.name,
      content_type: file.type,
      file_size: file.size,
      word_count,
      content_text,
      content_binary,
    })

    return NextResponse.json({ id: attachmentId, success: true })
  } catch (error: any) {
    console.error('Error uploading attachment:', error)
    return NextResponse.json(
      { errormsg: error.message || 'Erro ao fazer upload do anexo' },
      { status: 500 }
    )
  }
}

export const GET = withErrorHandler(GET_HANDLER as any)
export const POST = withErrorHandler(POST_HANDLER as any)
