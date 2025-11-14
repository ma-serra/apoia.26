import { Container } from "react-bootstrap"
import { IAPromptList, IALibrary } from "@/lib/db/mysql-types"
import { DadosDoProcessoType } from "@/lib/proc/process-types"
import ProcessNumberForm from "../process-number-form"
import ProcessContents from "../process-contents"
import ProcessTitle from "@/components/slots/process-title"
import { SubtituloLoading } from "@/components/slots/subtitulo"
import TargetText from "../target-text"
import { VisualizationEnum } from "@/lib/ui/preprocess"
import { PromptHeader } from "./PromptHeader"
import { SinkFromURLType } from "@/lib/utils/messaging"

interface PromptExecutionViewProps {
    prompt: IAPromptList
    numeroDoProcesso: string | null
    dadosDoProcesso: DadosDoProcessoType | null
    pieceContent: any
    setPieceContent: (content: any) => void
    apiKeyProvided: boolean
    model?: string
    allLibraryDocuments: IALibrary[]
    setPrompt: (prompt: IAPromptList | null) => void
    setNumber: (number: string) => void
    source: string | null
    sinkFromURL: SinkFromURLType | null
    sinkButtonText?: string | null
}

export function PromptExecutionView({
    prompt,
    numeroDoProcesso,
    dadosDoProcesso,
    pieceContent,
    setPieceContent,
    apiKeyProvided,
    model,
    allLibraryDocuments,
    setPrompt,
    setNumber,
    source,
    sinkFromURL,
    sinkButtonText
}: PromptExecutionViewProps) {
    return (
        <Container className="mt-4" fluid={false}>
            {(prompt.content.target !== 'PROCESSO' || !numeroDoProcesso) && (
                <PromptHeader prompt={prompt} onPromptChange={() => setPrompt(null)} variant="header" />
            )}
            {prompt.content.target === 'PROCESSO' ? (
                !numeroDoProcesso ? (
                    <ProcessNumberForm id={`${prompt.base_id}`} onChange={setNumber} />
                ) : (
                    <div id="printDiv">
                        {dadosDoProcesso ? (
                            <>
                                <ProcessTitle id={dadosDoProcesso?.numeroDoProcesso} />
                                <ProcessContents
                                    prompt={prompt}
                                    dadosDoProcesso={dadosDoProcesso}
                                    pieceContent={pieceContent}
                                    setPieceContent={setPieceContent}
                                    apiKeyProvided={apiKeyProvided}
                                    model={model}
                                    allLibraryDocuments={allLibraryDocuments}
                                    sinkFromURL={sinkFromURL}
                                    sinkButtonText={sinkButtonText}
                                >
                                    <PromptHeader prompt={prompt} onPromptChange={() => setPrompt(null)} />
                                </ProcessContents>
                            </>
                        ) : (
                            <>
                                <ProcessTitle id={numeroDoProcesso} />
                                <SubtituloLoading />
                                <PromptHeader prompt={prompt} onPromptChange={() => setPrompt(null)} />
                            </>
                        )}
                    </div>
                )
            ) : prompt.content.target === 'TEXTO' ? (
                <TargetText key={`${prompt};${!!source}`} prompt={prompt} apiKeyProvided={apiKeyProvided} source={source} />
            ) : prompt.content.target === 'REFINAMENTO' ? (
                <TargetText key={`${prompt};${!!source}`} prompt={prompt} apiKeyProvided={apiKeyProvided} visualization={VisualizationEnum.DIFF} source={source} />
            ) : null}
        </Container>
    )
}
