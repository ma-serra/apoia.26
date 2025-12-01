import { updateWithLatestAndOfficial } from '@/lib/db/mysql-types'
import Ranking from './ranking'
import { ModelDao, PromptDao, TestsetDao } from '@/lib/db/dao'


export default async function RankingContents(props: { kind: string }) {
    const { kind } = props
    const models = await ModelDao.retrieveModels()
    const prompts = await PromptDao.retrievePromptsIdsAndNamesByKind(kind)
    const testsets = await TestsetDao.retrieveOfficialTestsetsIdsAndNamesByKind(kind)

    const promptsWithLatestAndOfficial = updateWithLatestAndOfficial(prompts)

    return (
        <Ranking kind={kind} prompts={promptsWithLatestAndOfficial} models={models} testsets={testsets} />
    )
}