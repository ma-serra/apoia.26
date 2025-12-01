import { Container } from 'react-bootstrap'
import TestsetForm from '../testset-form'
import { ModelDao, TestsetDao } from '@/lib/db/dao'

export default async function New(props: { params: Promise<{ kind: string }> }) {
    const params = await props.params;
    const { kind } = params

    const models = await ModelDao.retrieveModels()
    const testsets = await TestsetDao.retrieveOfficialTestsetsIdsAndNamesByKind(kind)

    return (<Container fluid={false}>
        <h1 className="mt-5">Nova Coleção de Testes</h1>
        <TestsetForm record={{ kind, content: { tests: [] } }} models={models} testsets={testsets} />
    </Container>)
}