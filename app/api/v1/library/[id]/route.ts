'use server'

import { NextResponse } from 'next/server'
import { LibraryDao } from '@/lib/db/dao'
import { assertCurrentUser } from '@/lib/user'

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  await assertCurrentUser()
  const { id } = await props.params
  const item = await LibraryDao.getLibraryById(Number(id))
  if (!item) return NextResponse.json({ errormsg: 'Not found' }, { status: 404 })
  const { content_binary, ...safe } = item as any
  return NextResponse.json(safe)
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  await assertCurrentUser()
  const { id } = await props.params
  const body = await req.json()
  const ok = await LibraryDao.updateLibrary(Number(id), body)
  if (!ok) return NextResponse.json({ errormsg: 'Not found' }, { status: 404 })
  return NextResponse.json({ status: 'OK' })
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  await assertCurrentUser()
  const { id } = await props.params
  const ok = await LibraryDao.deleteLibrary(Number(id))
  if (!ok) return NextResponse.json({ errormsg: 'Not found' }, { status: 404 })
  return NextResponse.json({ status: 'OK' })
}
