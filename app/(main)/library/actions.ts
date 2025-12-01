'use server'

import { assertCurrentUser } from '@/lib/user'
import { LibraryDao } from '@/lib/db/dao'
import { revalidatePath } from 'next/cache'

export async function deleteLibraryAction(formData: FormData) {
  'use server'
  await assertCurrentUser()
  const idRaw = formData.get('id')
  const id = typeof idRaw === 'string' ? Number(idRaw) : Number(idRaw as any)
  if (!Number.isFinite(id)) return
  await LibraryDao.deleteLibrary(id)
  revalidatePath('/library')
}
