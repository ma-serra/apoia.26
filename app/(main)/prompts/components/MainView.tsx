import { Container, Tabs, Tab, Dropdown, DropdownButton } from "react-bootstrap"
import { IAPromptList } from "@/lib/db/mysql-types"
import PromptsTable from "../prompts-table"
import Link from "next/link"
import { ProcessFilters } from "./ProcessFilters"
import { DadosDoProcessoType } from "@/lib/proc/process-types"

interface MainViewProps {
    promptsPrincipais: IAPromptList[]
    promptsComunidade: IAPromptList[]
    promptOnClick: (kind: string, row: any) => void
    onProcessNumberChange: (numero: string) => void
    isModerator: boolean
    apiKeyProvided: boolean
    activeTab: string
    setActiveTab: (tab: string) => void
    number: string
    setNumber: (number: string) => void
    numeroDoProcesso: string | null
    dadosDoProcesso: DadosDoProcessoType | null
    arrayDeDadosDoProcesso: DadosDoProcessoType[] | null
    idxProcesso: number
    setIdxProcesso: (idx: number) => void
    setDadosDoProcesso: (dados: DadosDoProcessoType) => void
    scope: string | undefined
    setScope: (scope: string | undefined) => void
    instance: string | undefined
    setInstance: (instance: string | undefined) => void
    matter: string | undefined
    setMatter: (matter: string | undefined) => void
}

export function MainView({
    promptsPrincipais,
    promptsComunidade,
    promptOnClick,
    onProcessNumberChange,
    isModerator,
    apiKeyProvided,
    activeTab,
    setActiveTab,
    number,
    setNumber,
    numeroDoProcesso,
    dadosDoProcesso,
    arrayDeDadosDoProcesso,
    idxProcesso,
    setIdxProcesso,
    setDadosDoProcesso,
    scope,
    setScope,
    instance,
    setInstance,
    matter,
    setMatter
}: MainViewProps) {
    return (
        <>
            <ProcessFilters
                number={number}
                setNumber={setNumber}
                numeroDoProcesso={numeroDoProcesso}
                dadosDoProcesso={dadosDoProcesso}
                arrayDeDadosDoProcesso={arrayDeDadosDoProcesso}
                idxProcesso={idxProcesso}
                setIdxProcesso={setIdxProcesso}
                setDadosDoProcesso={setDadosDoProcesso}
                scope={scope}
                setScope={setScope}
                instance={instance}
                setInstance={setInstance}
                matter={matter}
                setMatter={setMatter}
            />
            <Container className="mt-2 mb-3" fluid={false}>
                {!apiKeyProvided && (
                    <p className="text-center mt-3 mb-3">
                        Execute os prompts diretamente na Apoia, cadastrando sua <Link href="/prefs">Chave de API</Link>.
                    </p>
                )}

                <Tabs
                    activeKey={activeTab}
                    onSelect={(k) => setActiveTab(k || 'principal')}
                    className="mt-3"
                >
                    <Tab eventKey="principal" title="Principais">
                        <PromptsTable 
                            prompts={promptsPrincipais} 
                            onClick={promptOnClick} 
                            onProcessNumberChange={onProcessNumberChange} 
                            isModerator={isModerator}
                        >
                            {CriarNovo()}
                        </PromptsTable>
                    </Tab>

                    <Tab eventKey="comunidade" title="Prompts Não Avaliados">
                        <PromptsTable 
                            prompts={promptsComunidade} 
                            onClick={promptOnClick} 
                            onProcessNumberChange={onProcessNumberChange} 
                            isModerator={isModerator}
                        >
                            {CriarNovo()}
                        </PromptsTable>

                        <div className="alert alert-warning mt-3">
                            <p className="mb-0">
                                <strong>Atenção:</strong> Os prompts da comunidade são compartilhados publicamente por outros usuários.
                                Esses prompts não passam por nenhum tipo de validação e podem gerar respostas imprecisas,
                                inconsistentes ou inadequadas para seu contexto.
                            </p>
                        </div>
                    </Tab>
                </Tabs>
            </Container>
        </>
    )
}

function CriarNovo() {
    return (
        <div className="col col-auto mt-3">
            <DropdownButton id="criar-novo-dropdown" title="Criar Novo" variant="primary">
                <Dropdown.Item href="/prompts/prompt/new">Prompt</Dropdown.Item>
                <Dropdown.Item href="/prompts/prompt/new?template=true&import=true">
                    Prompt a partir de um modelo pré-existente
                </Dropdown.Item>
                <Dropdown.Item href="/prompts/prompt/new?template=true">
                    Prompt a partir de um modelo no padrão da Apoia
                </Dropdown.Item>
            </DropdownButton>
        </div>
    )
}
