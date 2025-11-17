import { assertCurrentUser, isUserModerator } from '@/lib/user'
import { redirect } from 'next/navigation'
import AIGenerationsReportClient from './ai-generations-report-client'

export default async function AIGenerationsReportPage() {
    const user = await assertCurrentUser()
    const isModerator = await isUserModerator(user)
    
    if (!isModerator) {
        redirect('/')
    }
    
    return <AIGenerationsReportClient />
}
