'use server'

import { LibraryDao } from '@/lib/db/dao'
import { assertCurrentUser } from '@/lib/user'
import Contents from './contents'

export default async function ServerContents() {
  await assertCurrentUser()
  const items = await LibraryDao.listLibraryHeaders()

  return <Contents items={items} />
}
