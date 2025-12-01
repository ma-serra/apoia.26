import { Container } from 'react-bootstrap'
import PromptTests from '../../../prompt-tests'
import { PromptDao, ModelDao, TestsetDao } from '@/lib/db/dao'
import { PublicError } from '@/lib/utils/public-error';

export default async function New(props: { params: Promise<{ kind: string, slug: string, id: number }> }) {
    const params = await props.params;
    const { kind, slug, id } = params

    const record = await PromptDao.retrievePromptById(id)
    if (!record) throw new PublicError('Prompt não encontrado')
    const models = await ModelDao.retrieveModels()
    const prompts = await PromptDao.retrieveOfficialPromptsIdsAndNamesByKind(kind)
    const testsets = await TestsetDao.retrieveOfficialTestsetsIdsAndNamesByKind(kind)

    record.base_id = record.id
    return (<Container fluid={false}>
        <h1 className="mt-5 mb-3">Testes de Prompt</h1>
        <PromptTests record={record} models={models} testsets={testsets} />
    </Container>)
}