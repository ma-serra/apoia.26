'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState } from 'react'
import AiContent from '@/components/ai-content'
import { Button, Col, Row } from 'react-bootstrap'
import { ContentType, PromptConfigType, PromptDefinitionType } from '@/lib/ai/prompt-types'
import { slugify } from '@/lib/utils/utils'
import { IAPrompt } from '@/lib/db/mysql-types'
import { VisualizationEnum } from '@/lib/ui/preprocess'
import Print from '@/components/slots/print'
import { getInternalPrompt, promptExecuteBuilder } from '@/lib/ai/prompt'
import { TipoDeSinteseMap } from '@/lib/proc/combinacoes'
import { infoDeProduto } from '@/lib/proc/info-de-produto'
import { SinkFromURLType, SourcePayloadType } from '@/lib/utils/messaging'
import { sendApproveMessageToParent } from '@/lib/utils/messaging-helper'

const EditorComp = dynamic(() => import('@/components/EditorComponent'), { ssr: false })

const buildDefinition = (prompt: IAPrompt): PromptDefinitionType => {
    if (prompt.kind?.startsWith('^')) {
        const key = prompt.kind.substring(1)
        const def = TipoDeSinteseMap[key]
        const produtos = def.produtos.map(p => infoDeProduto(p))
        return getInternalPrompt(produtos[0].prompt)
    }

    return {
        kind: `prompt-${prompt.id}`,
        prompt: prompt.content.prompt,
        systemPrompt: prompt.content.system_prompt,
        jsonSchema: prompt.content.json_schema,
        format: prompt.content.format,
        cacheControl: true,
    }
}

export default function TargetText({ prompt, source, sinkFromURL, sinkButtonText, visualization, apiKeyProvided, sourcePayload }: { prompt: IAPrompt, source?: string, sinkFromURL?: SinkFromURLType, sinkButtonText?: string | null, visualization?: VisualizationEnum, apiKeyProvided: boolean, sourcePayload?: SourcePayloadType | null }) {
    const [markdown, setMarkdown] = useState(source || '')
    const [hidden, setHidden] = useState(!source)
    const [promptConfig, setPromptConfig] = useState({} as PromptConfigType)
    const [content, setContent] = useState<ContentType>()

    const textChanged = (text) => {
        setMarkdown(text)
        setHidden(true)
        setContent(undefined)
    }

    const definition: PromptDefinitionType = buildDefinition(prompt)

    const textoDescr = prompt.content.editor_label || 'Texto'

    const handleReady = (content: ContentType) => {
        setContent(content)
        if (sinkFromURL === 'to-parent-automatic') {
            sendApproveMessageToParent(content, sourcePayload, prompt?.slug, prompt?.content?.target)
        }
    }

    const PromptParaCopiar = () => {
        if (!prompt || !markdown) return ''
        const exec = promptExecuteBuilder(definition, { textos: [{ numeroDoProcesso: '', descr: prompt.content?.editor_label || 'Texto', slug: slugify(prompt.content?.editor_label || 'texto'), texto: markdown, sigilo: '0' }] })
        const s: string = exec?.message.map(m => m.role === 'system' ? `# PROMPT DE SISTEMA\n\n${m.content}\n\n# PROMPT` : m.content).join('\n\n')
        if (s)
            navigator.clipboard.writeText(s)

        return <>
            <p className="alert alert-warning text-center mt-3">Prompt copiado para a área de transferência, já com o conteúdo do texto informado acima!</p>
            <h2>{prompt.name}</h2>
            <textarea name="prompt" className="form-control" rows={10}>{s}</textarea>
        </>
    }

    return (
        <div className="mb-3">
            {/* <h2 className="mt-3">{prompt.content.editor_label}</h2> */}
            {/* <PromptConfig kind="ementa" setPromptConfig={setPromptConfig} /> */}
            {!source && <>
                <div className="form-group"><label>{textoDescr}</label></div>
                <div className="alert alert-secondary mb-1 p-0">
                    <Suspense fallback={null}>
                        <EditorComp markdown={markdown} onChange={textChanged} />
                    </Suspense>
                </div>
                {hidden && <>
                    <div className="text-body-tertiary">Cole o texto acima e clique em prosseguir.</div>
                </>}
            </>}

            {hidden && <>
                {/* <Button disabled={!markdown || !orgaoJulgador} className="mt-3" onClick={() => setHidden(false)}>Gerar Ementa</Button> */}
                <Button disabled={!markdown} className="mt-3" onClick={() => setHidden(false)}>Prosseguir</Button>
            </>}
            {!hidden && markdown && <div id="printDiv">

                {apiKeyProvided
                    ? <>
                        <h2 className="mt-3">{prompt.name}</h2>
                        <AiContent
                            definition={definition}
                            data={{ textos: [{ numeroDoProcesso: '', descr: textoDescr, slug: slugify(textoDescr), texto: markdown, sigilo: '0' }] }}
                            options={{ cacheControl: true }} config={promptConfig} visualization={visualization} dossierCode={undefined} onReady={(content) => handleReady(content)} />
                        <Row>
                            {content && sinkFromURL === 'to-parent' && <Col><Button variant="success" onClick={() => sendApproveMessageToParent(content, sourcePayload, prompt?.slug, prompt?.content?.target)} className="float-end">{sinkButtonText || 'Aprovar'}</Button></Col>}
                            {/* <Col><Print numeroDoProcesso={slugify(prompt.name)} /></Col> */}
                        </Row>
                    </>
                    : <PromptParaCopiar></PromptParaCopiar>
                }
            </div>}
        </div>
    )
}



