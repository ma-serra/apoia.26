import { Container } from 'react-bootstrap'
import { assertModel, getSelectedModelName, getSelectedModelParams } from '@/lib/ai/model-server'
import TranscriptionPage from './TranscriptionPage'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBook, faKey } from '@fortawesome/free-solid-svg-icons'

export default async function Transcription() {
    await assertModel()
    const model = await getSelectedModelName()
    const { apiKeyFromEnv } = await getSelectedModelParams()

    if (apiKeyFromEnv)
        return (<Container className="mt-5">
            <div className="alert alert-info text-center mb-4" role="alert">
                Degravações consomem muitos tokens e podem incorrer em custos elevados.
                <br />
                A chave de API fornecida pela administração tem limites de uso que podem ser rapidamente atingidos.
                <br />
                Para gerar essas transcrições, você precisa cadastrar sua própria chave de API.{' '}
                <Link href="/prefs" className="alert-link">Cadastre-a aqui</Link>.
                <FontAwesomeIcon icon={faKey} className="ms-2" />
                <br />
                Não sabe o que é uma chave de API ou como usá-la? Consulte o{' '}
                <Link
                    href="https://trf2.gitbook.io/apoia/degravacao"
                    className="alert-link"
                >Manual da Apoia</Link>.
                <FontAwesomeIcon icon={faBook} className="ms-2" />
            </div>
        </Container>)

    return (<Container fluid={false}>
        <TranscriptionPage model={model} />
    </Container>)
}