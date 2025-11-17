import { assertCurrentUser, isUserModerator } from '@/lib/user'
import { redirect } from 'next/navigation'
import PromptUsageReportClient from './prompt-usage-report-client'

export default async function PromptUsageReportPage() {
    const user = await assertCurrentUser()
    const isModerator = await isUserModerator(user)
    
    if (!isModerator) {
        redirect('/')
    }
    
    return <PromptUsageReportClient />
}
