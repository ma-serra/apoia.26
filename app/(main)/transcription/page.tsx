import { Container } from 'react-bootstrap'
import { assertModel, getSelectedModelName, getSelectedModelParams } from '@/lib/ai/model-server'
import TranscriptionPage from './TranscriptionPage'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBook, faKey } from '@fortawesome/free-solid-svg-icons'

export default async function Transcription() {
    await assertModel()
    const model = await getSelectedModelName()

    return (<Container fluid={false}>
        <TranscriptionPage model={model} />
    </Container>)
}