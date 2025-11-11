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
    setNumber
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
                <TargetText prompt={prompt} apiKeyProvided={apiKeyProvided} />
            ) : prompt.content.target === 'REFINAMENTO' ? (
                <TargetText prompt={prompt} apiKeyProvided={apiKeyProvided} visualization={VisualizationEnum.DIFF} />
            ) : null}
        </Container>
    )
}
