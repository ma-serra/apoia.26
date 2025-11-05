'use client'

import { IALibrary, IAPrompt, IAPromptList } from "@/lib/db/mysql-types"
import { UserType } from "@/lib/user"
import PromptsTable from "./prompts-table"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import React, { useEffect, useMemo, useRef, useState } from "react"
import ProcessNumberForm from "./process-number-form"
import TargetText from "./target-text"
import { DadosDoProcessoType, Instance, Matter, Scope } from "@/lib/proc/process-types"
import ProcessContents from "./process-contents"
import ProcessTitle from "@/components/slots/process-title"
import { SubtituloLoading } from "@/components/slots/subtitulo"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEdit } from "@fortawesome/free-solid-svg-icons"
import { Button, Dropdown, DropdownButton, Form, FormGroup, FormLabel, FormSelect, Row, Toast, ToastContainer, Tab, Tabs, Breadcrumb } from "react-bootstrap"
import { enumSorted } from "@/lib/ai/model-types"
import { Container, Spinner } from 'react-bootstrap'
import { tua } from "@/lib/proc/tua"
import Link from "next/link"
import { VisualizationEnum } from "@/lib/ui/preprocess"
import { array } from "zod"
import { slugify } from '@/lib/utils/utils'
import ErrorMessage from "@/components/error-message"
import Chat from "@/components/slots/chat"
import { addGenericCookie } from "./add-cookie"
import TermosDeUso from "./termos-de-uso"
import BreadCrumbs from "./breadcrumbs"

export const copyPromptToClipboard = (prompt: IAPromptList) => {
    let s: string = prompt.content.system_prompt
    s = s ? `# PROMPT DE SISTEMA\n\n${s}\n\n# PROMPT\n\n` : ''
    s += prompt.content.prompt
    navigator.clipboard.writeText(s)
}

export function Contents({ prompts, user, user_id, apiKeyProvided, model, isModerator, sidekick }: { prompts: IAPromptList[], user: UserType, user_id: number, apiKeyProvided: boolean, model?: string, isModerator: boolean, sidekick?: boolean }) {
    const currentSearchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()
    // Ref para evitar atualizações redundantes de URL
    const lastQueryRef = useRef<string>('')
    const [prompt, setPrompt] = useState<IAPromptList>(null)
    const [numeroDoProcesso, setNumeroDoProcesso] = useState<string>(null)
    const [arrayDeDadosDoProcesso, setArrayDeDadosDoProcesso] = useState<DadosDoProcessoType[]>(null)
    const [idxProcesso, setIdxProcesso] = useState(0)
    const [dadosDoProcesso, setDadosDoProcesso] = useState<DadosDoProcessoType>(null)
    const [number, setNumber] = useState<string>('')
    const [scope, setScope] = useState<string>()
    const [instance, setInstance] = useState<string>()
    const [matter, setMatter] = useState<string>()
    const [tramFromUrl, setTramFromUrl] = useState<number | null>(null)
    const [promptInitialized, setPromptInitialized] = useState(false)
    const [pieceContent, setPieceContent] = useState({})
    const [allLibraryDocuments, setAllLibraryDocuments] = useState<IALibrary[]>([])
    const [toast, setToast] = useState<string>()
    const [toastVariant, setToastVariant] = useState<string>()
    const [activeTab, setActiveTab] = useState<string>('principal')
    const [termosAceitos, setTermosAceitos] = useState<boolean | null>(null)

    useEffect(() => {
        const getCookie = (name: string): string | null => {
            if (typeof document === 'undefined') return null
            const cookies = document.cookie ? document.cookie.split('; ') : []
            const found = cookies.find((c) => c.startsWith(`${name}=`))
            return found ? decodeURIComponent(found.split('=').slice(1).join('=')) : null
        }
        const raw = getCookie('termos-de-uso')
        setTermosAceitos(raw === '1')
    }, [])

    const toastMessage = (message: string, variant: string) => {
        setToast(message)
        setToastVariant(variant)
    }


    // const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    //     setFilter(e.target.value)
    // }

    useEffect(() => {
        if (number?.length == 20)
            setNumeroDoProcesso(number)
        else
            setNumeroDoProcesso(null)
    }, [number])

    useEffect(() => {
        // Load library documents
        const loadLibraryDocuments = async () => {
            try {
                const response = await fetch('/api/v1/library')
                if (response.ok) {
                    const data = await response.json()
                    // API returns {items: Array}, extract the array
                    const documents = data?.items || data || []
                    setAllLibraryDocuments(documents)
                }
            } catch (error) {
                console.error('Error loading library documents:', error)
            }
        }
        loadLibraryDocuments()
    }, [])

    const promptOnClick = (kind: string, row: any) => {
        switch (kind) {
            case 'executar':
                // if (row.content.target === 'PROCESSO' && !numeroDoProcesso) {
                //     toastMessage('Antes de executar esse prompt é necessário informar o número do processo', 'warning')
                //     // Focus on the process number input field
                //     document.querySelector<HTMLInputElement>('input[name="numeroDoProcesso"]')?.focus()
                //     return
                // }
                setPrompt(row)
                // Se o prompt selecionado não requer PROCESSO, limpar contexto de processo
                if (row.content.target !== 'PROCESSO') {
                    setNumeroDoProcesso(null)
                    setNumber('')
                    setArrayDeDadosDoProcesso(null)
                    setDadosDoProcesso(null)
                    setIdxProcesso(0)
                }
                break;
            case 'copiar':
                copyPromptToClipboard(row)
                toastMessage('Prompt copiado para a área de transferência', 'success')
                break
            case 'copiar link para favoritar':
                navigator.clipboard.writeText(`Clique no link abaixo para adicionar o prompt ${row.name} aos favoritos:\n\n${window.location.origin}/prompts/prompt/${row.base_id}/set-favorite`)
                toastMessage('Link copiado para a área de transferência', 'success')
                break
        }
    }

    const loadProcess = async (numeroDoProcesso: string) => {
        const response = await fetch(`/api/v1/process/${numeroDoProcesso}`)
        if (response.ok) {
            const data = await response.json()
            if (data.errorMsg) {
                toastMessage(data.errorMsg, 'danger')
                setArrayDeDadosDoProcesso(null)
                setDadosDoProcesso(null)
                setNumeroDoProcesso(null)
                return
            }
            setArrayDeDadosDoProcesso(data.arrayDeDadosDoProcesso)
            const idx = data.arrayDeDadosDoProcesso?.length > 1 ? data.arrayDeDadosDoProcesso?.length - 1 : 0
            setIdxProcesso(idx)
            const dadosDoProc = data.arrayDeDadosDoProcesso[idx]
            setDadosDoProcesso(dadosDoProc)
        }
    }

    // Inicialização a partir da query string (efeito único)
    useEffect(() => {
        // Só inicializa uma vez
        if (promptInitialized) return
        const p = currentSearchParams.get('prompt')
        const proc = currentSearchParams.get('process')
        const sc = currentSearchParams.get('scope')
        const inst = currentSearchParams.get('instance')
        const mat = currentSearchParams.get('matter')
        const tram = currentSearchParams.get('tram')
        const tab = currentSearchParams.get('tab')

        // Prompt: pode ser slug (interno) ou número (base_id)
        if (p) {
            let found: IAPromptList = null
            if (/^\d+$/.test(p)) {
                const n = parseInt(p)
                found = prompts.find(pr => pr.base_id === n)
            } else {
                // comparar slug gerado de kind sem '^'
                found = prompts.find(pr => pr.kind?.startsWith('^') && slugify(pr.kind.substring(1)) === p)
            }
            if (found) setPrompt(found)
        }
        if (proc && proc.length === 20) {
            setNumeroDoProcesso(proc)
            setNumber(proc)
        }
        // Decodificar filtros (aceita slug ou nome antigo, por compatibilidade)
        const decodeEnumParam = (param: string | null, enumObj: any): string | undefined => {
            if (!param) return undefined
            const list = enumSorted(enumObj)
            // Tenta nome direto (links antigos)
            const direct = list.find((s: any) => s.value?.name === param)?.value?.name
            if (direct) return direct
            // Tenta comparação por slug do name
            const bySlug = list.find((s: any) => slugify(s.value?.name) === param)?.value?.name
            return bySlug
        }
        const scName = decodeEnumParam(sc, Scope)
        const instName = decodeEnumParam(inst, Instance)
        const matName = decodeEnumParam(mat, Matter)
        if (scName) setScope(scName)
        if (instName) setInstance(instName)
        if (matName) setMatter(matName)
        if (tram && /^\d+$/.test(tram)) setTramFromUrl(parseInt(tram))
        if (tab === 'comunidade') setActiveTab('comunidade')
        setPromptInitialized(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (numeroDoProcesso) {
            loadProcess(numeroDoProcesso)
        } else {
            setDadosDoProcesso(null)
            setArrayDeDadosDoProcesso(null)
            setIdxProcesso(0)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [numeroDoProcesso])

    // Caso o usuário abra diretamente um prompt que não exige processo (via URL), limpar processo carregado anterior
    useEffect(() => {
        if (prompt && prompt.content?.target && prompt.content.target !== 'PROCESSO') {
            if (numeroDoProcesso) setNumeroDoProcesso(null)
            if (number) setNumber('')
            if (arrayDeDadosDoProcesso) setArrayDeDadosDoProcesso(null)
            if (dadosDoProcesso) setDadosDoProcesso(null)
            if (idxProcesso !== 0) setIdxProcesso(0)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prompt])

    useEffect(() => {
        if (!dadosDoProcesso) {
            return
        }
        // Aplicar tramitação do URL se válido
        if (tramFromUrl !== null && arrayDeDadosDoProcesso?.length > 1) {
            if (tramFromUrl >= 0 && tramFromUrl < arrayDeDadosDoProcesso.length) {
                setIdxProcesso(tramFromUrl)
                setDadosDoProcesso(arrayDeDadosDoProcesso[tramFromUrl])
            }
            setTramFromUrl(null) // consumir
        }
    }, [arrayDeDadosDoProcesso, dadosDoProcesso, tramFromUrl])

    // Sincronizar URL com estado
    useEffect(() => {
        if (!promptInitialized) return
        // Preserve existing unknown params (e.g., 'pieces' from ChoosePieces) and manage known keys explicitly
        const params = new URLSearchParams(currentSearchParams.toString())
        // Prompt
        if (prompt) {
            if (prompt.kind?.startsWith('^')) {
                params.set('prompt', slugify(prompt.kind.substring(1)))
            } else if (prompt.base_id != null) {
                params.set('prompt', String(prompt.base_id))
            }
        } else {
            params.delete('prompt')
        }
        // Processo
        if (numeroDoProcesso?.length === 20) params.set('process', numeroDoProcesso)
        else params.delete('process')
        // Tramitação: só quando diferente do índice padrão (último)
        if (arrayDeDadosDoProcesso?.length > 1) {
            const defaultIdx = arrayDeDadosDoProcesso.length - 1
            if (idxProcesso !== defaultIdx) params.set('tram', String(idxProcesso))
            else params.delete('tram')
        } else {
            params.delete('tram')
        }
        // Filtros: gravar como slug
        if (scope) params.set('scope', slugify(scope))
        else params.delete('scope')
        if (instance) params.set('instance', slugify(instance))
        else params.delete('instance')
        if (matter) params.set('matter', slugify(matter))
        else params.delete('matter')
        if (activeTab === 'comunidade') params.set('tab', 'comunidade')
        else params.delete('tab')

        if (!prompt || !numeroDoProcesso) {
            params.delete('pieces')
        }

        const qs = params.toString()
        if (qs === lastQueryRef.current) return
        lastQueryRef.current = qs
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }, [prompt, numeroDoProcesso, idxProcesso, scope, instance, matter, activeTab, arrayDeDadosDoProcesso, promptInitialized, pathname, router, currentSearchParams])



    const PromptTitle = ({ prompt }: { prompt: IAPromptList }) => <div className="text-body-tertiary text-center h-print">Prompt: {prompt.name} - <span onClick={() => { setPrompt(null) /* Mantém processo carregado */ }} className="text-primary" style={{ cursor: 'pointer' }}><FontAwesomeIcon icon={faEdit} /> Alterar</span></div>
    const PromptTitleHeader = ({ prompt }: { prompt: IAPromptList }) => <div className="text-center"><span className="h3">{prompt.name}</span> - <span onClick={() => { setPrompt(null) /* Mantém processo carregado */ }} className="text-primary" style={{ cursor: 'pointer' }}><FontAwesomeIcon icon={faEdit} /> Alterar</span></div>
    const resetProcess = () => {
        setNumeroDoProcesso(null)
        setNumber('')
    }
    const resetPrompt = () => {
        setPrompt(null)
    }
    const resetToHome = () => {
        setNumeroDoProcesso(null)
        setNumber('')
        setPrompt(prompts.find(p => p.kind === '^CHAT_STANDALONE') || null)
    }

    const filteredPromptsBase = prompts.filter((p) => {
        if (scope && !p.content.scope?.includes(scope)) return false
        if (instance && !p.content.instance?.includes(instance)) return false
        if (matter && !p.content.matter?.includes(matter)) return false
        return true
    })

    const promptsPrincipais = filteredPromptsBase.filter((p) => {
        return p.share === 'PADRAO' || p.is_mine
    })

    const promptsComunidade = filteredPromptsBase.filter((p) => {
        return p.share !== 'PADRAO' && !p.is_mine
    })

    const promptsSidekick = useMemo(() => {
        const chatIsCurrentPrompt = prompt?.kind === '^CHAT'
        if (!sidekick) return []
        let list = filteredPromptsBase.filter((p) => p.is_favorite || (p.kind === '^CHAT' && !chatIsCurrentPrompt) || (p.kind === '^CHAT_STANDALONE' && !numeroDoProcesso))
        if (!filteredPromptsBase.find((p) => p.is_favorite))
            list = filteredPromptsBase.filter((p) => p.share === 'PADRAO' || p.is_favorite || (p.kind === '^CHAT' && !chatIsCurrentPrompt))
        const chat = list.find(p => p.kind === '^CHAT')
        if (chat) chat.name = 'Chat com Peças Selecionadas'

        list.sort((a, b) => {
            if (a.kind === '^CHAT_STANDALONE' && b.kind !== '^CHAT_STANDALONE') return -1
            if (a.kind !== '^CHAT_STANDALONE' && b.kind === '^CHAT_STANDALONE') return 1
            if (a.kind === '^CHAT' && b.kind !== '^CHAT') return -1
            if (a.kind !== '^CHAT' && b.kind === '^CHAT') return 1
            if (a.is_favorite && !b.is_favorite) return -1
            if (!a.is_favorite && b.is_favorite) return 1
            if (a.name < b.name) return -1
            if (a.name > b.name) return 1
            return 0
        })
        return list
    }, [filteredPromptsBase, prompt])

    const promptButtons = useMemo(() => {

        return <>
            <div className="d-flex flex-wrap gap-2 justify-content-center">
                {promptsSidekick && promptsSidekick.length > 0 ? (
                    promptsSidekick.filter(p => p?.kind !== prompt?.kind).map((p, i) => (
                        <Button
                            key={p.base_id ?? `${p.kind}-${i}`}
                            onClick={() => setPrompt(p)}
                            variant="light"
                            style={{
                                // HSL hue from 30° (orange) to 280° (purple), avoiding red (0°)
                                // backgroundColor: `hsl(${30 + ((i % 14) / 13) * (330 - 30)}, 85%, 40%)`,
                                borderColor: `hsl(${30 + ((i % 14) / 13) * (330 - 30)}, 85%, 40%)`,
                                color: `hsl(${30 + ((i % 14) / 13) * (330 - 30)}, 85%, 30%)`,
                            }}
                        >
                            {p.name}
                        </Button>
                    ))
                ) : (
                    <div className="text-muted">Nenhum prompt favorito disponível.</div>
                )}
            </div>
        </>
    }, [promptsSidekick])

    const [urlNovaAba, setUrlNovaAba] = useState('')
    useEffect(() => {
        const url = numeroDoProcesso
            ? `${window.location.origin}/prompts?process=${numeroDoProcesso}`
            : `${window.location.origin}/`
        setUrlNovaAba(url)
    }, [numeroDoProcesso])

    if (sidekick) {
        if (termosAceitos === false) {
            return <TermosDeUso onAccept={() => { setTermosAceitos(true); addGenericCookie('termos-de-uso', '1') }} />
        }
        return <Container className="mt-0 mb-4" fluid={true}>
            <BreadCrumbs numeroDoProcesso={numeroDoProcesso} prompt={prompt} resetToHome={resetToHome} resetProcess={resetProcess} resetPrompt={resetPrompt} />
            {(prompt)
                ? <>
                    {/* {(prompt.content.target !== 'PROCESSO' || !numeroDoProcesso) && <PromptTitleHeader prompt={prompt} />} */}
                    {prompt.content.target === 'PROCESSO'
                        ? !numeroDoProcesso
                            ? <ProcessNumberForm id={`${prompt.base_id}`} onChange={setNumber} />
                            : <>
                                <div id="printDiv">
                                    {dadosDoProcesso
                                        ? <>
                                            <ProcessTitle id={dadosDoProcesso?.numeroDoProcesso} />
                                            <ProcessContents prompt={prompt} dadosDoProcesso={dadosDoProcesso} pieceContent={pieceContent} setPieceContent={setPieceContent}
                                                apiKeyProvided={apiKeyProvided} model={model} allLibraryDocuments={allLibraryDocuments}
                                                sidekick={sidekick}
                                                promptButtons={prompt?.kind === '^CHAT' ? <><p className="text-center mt-1x ms-3 me-3">Converse sobre o processo, selecione um dos seus prompts favoritos, ou lance a Apoia em uma <a href={urlNovaAba} target="_blank" rel="noopener noreferrer">nova aba</a>.</p>{promptButtons}</> : undefined}>
                                                {/* <PromptTitle prompt={prompt} /> */}
                                            </ProcessContents>
                                        </>
                                        : <>
                                            <ProcessTitle id={numeroDoProcesso} /><SubtituloLoading />
                                            {/* <PromptTitle prompt={prompt} /> */}
                                        </>}
                                </div>
                            </>
                        : prompt.content.target === 'TEXTO'
                            ? <TargetText prompt={prompt} apiKeyProvided={apiKeyProvided} />
                            : prompt.content.target === 'REFINAMENTO'
                                ? <TargetText prompt={prompt} apiKeyProvided={apiKeyProvided} visualization={VisualizationEnum.DIFF} />
                                : prompt.content.target === 'CHAT'
                                    ? <><Chat definition={{ ...prompt, kind: slugify(prompt.kind) }} data={{ textos: [] }} model={model} withTools={true} key={1}
                                        footer={<div className="text-body-tertiary h-print">O Agente de IA busca informações e peças de qualquer processo. Para contextualizar, inclua o número do processo na sua primeira pergunta.</div>}
                                        sidekick
                                        promptButtons={<><p className="text-center mt-3 ms-3 me-3"><img src="/apoia-logo-horiz-cor-fundo-claro.png" className="mb-3" style={{ height: "3em" }} /><br/>Converse comigo, selecione um dos seus prompts favoritos, ou lance a Apoia em uma <a href={urlNovaAba} target="_blank" rel="noopener noreferrer">nova aba</a>.</p>{promptButtons}</>}
                                    /></>
                                    : <ErrorMessage message={`Tipo de alvo do prompt desconhecido: ${prompt.content.target}`} />
                    }
                </>
                : (numeroDoProcesso)
                    ? <>
                        <ProcessTitle id={dadosDoProcesso?.numeroDoProcesso} onRemove={() => { setNumeroDoProcesso(null); setDadosDoProcesso(null); setNumber(null) }} />
                        <p className="text-center mt-3 ms-3 me-3">Selecione um dos seus prompts favoritos ou lance a Apoia em uma <a href={urlNovaAba} target="_blank" rel="noopener noreferrer">nova aba</a>.</p>
                        <div className="ps-3 pe-3 pb-3">{promptButtons}</div>
                    </>
                    : <>
                        <h1 className="text-center mt-5">Bem vindo à Apoia</h1>
                        <p className="text-center mt-3 ms-3 me-3">Selecione um dos seus prompts favoritos ou lance a Apoia em uma <a href={urlNovaAba} target="_blank" rel="noopener noreferrer">nova aba</a>.</p>
                        <div className="ps-3 pe-3 pb-3">{promptButtons}</div>
                    </>
            }</Container>
    }

    return !prompt
        ? <>
            {/* <div className="" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}> */}
            <div className="bg-primary text-white">
                <Container className="p-2 pb-3" fluid={false}>
                    <FormGroup as={Row} className="">
                        <div className="col col-auto">
                            <FormLabel className="mb-0">Número do Processo</FormLabel>
                            <Form.Control name="numeroDoProcesso" placeholder="(opcional)" autoFocus={true} className="form-control" onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))} value={number} />
                        </div>
                        {numeroDoProcesso && !dadosDoProcesso &&
                            <div className="col col-auto">
                                <FormLabel className="mb-0">&nbsp;</FormLabel>
                                <span className="form-control text-white" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}><Spinner size="sm" animation="border" role="status"><span className="visually-hidden">Loading...</span></Spinner></span>
                            </div>
                        }
                        {numeroDoProcesso && arrayDeDadosDoProcesso && arrayDeDadosDoProcesso.length > 1 &&
                            <div className="col col-auto">
                                <FormLabel className="mb-0">Tramitação</FormLabel>
                                <FormSelect value={idxProcesso} onChange={(e) => { const idx = parseInt(e.target.value); setIdxProcesso(idx); setDadosDoProcesso(arrayDeDadosDoProcesso[idx]) }} className="form-select">
                                    {arrayDeDadosDoProcesso.map((d, idx) => <option key={idx} value={idx}>{d.classe}</option>)}
                                </FormSelect>
                            </div>
                        }
                        {dadosDoProcesso && arrayDeDadosDoProcesso && arrayDeDadosDoProcesso.length === 1 &&
                            <div className="col col-auto">
                                <FormLabel className="mb-0">&nbsp;</FormLabel>
                                <span className="form-control text-white" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>{dadosDoProcesso.classe}</span>
                            </div>
                        }
                        <div className="col col-auto ms-auto">
                            <FormLabel className="mb-0">Segmento</FormLabel>
                            <FormSelect value={scope} onChange={(e) => setScope(e.target.value)} className={`form-select w-auto${scope ? ' bg-warning' : ''}`}>
                                <option value="">Todos</option>
                                {enumSorted(Scope).map((s) => <option key={`key-scope-${s.value.name}`} value={s.value.name}>{s.value.descr}</option>)}
                            </FormSelect>
                        </div>
                        <div className="col col-auto">
                            <FormLabel className="mb-0">Instância</FormLabel>
                            <FormSelect value={instance} onChange={(e) => setInstance(e.target.value)} className={`form-select w-auto${instance ? ' bg-warning' : ''}`}>
                                <option value="">Todas</option>
                                {enumSorted(Instance).map((s) => <option key={`key-instance-${s.value.name}`} value={s.value.name}>{s.value.descr}</option>)}
                            </FormSelect>
                        </div>
                        <div className="col col-auto">
                            <FormLabel className="mb-0">Natureza</FormLabel>
                            <FormSelect value={matter} onChange={(e) => setMatter(e.target.value)} className={`form-select w-auto${matter ? ' bg-warning' : ''}`}>
                                <option value="">Todas</option>
                                {enumSorted(Matter).map((s) => <option key={`key-matter-${s.value.name}`} value={s.value.name}>{s.value.descr}</option>)}
                            </FormSelect>
                        </div>
                    </FormGroup >
                </Container>
            </div >
            <Container className="mt-2 mb-3" fluid={false}>
                {!apiKeyProvided && <p className="text-center mt-3 mb-3">Execute os prompts diretamente na Apoia, cadastrando sua <Link href="/prefs">Chave de API</Link>.</p>}

                <Tabs
                    activeKey={activeTab}
                    onSelect={(k) => setActiveTab(k || 'principal')}
                    className="mt-3"
                >
                    <Tab eventKey="principal" title="Principais">
                        <PromptsTable prompts={promptsPrincipais} onClick={promptOnClick} onProcessNumberChange={setNumeroDoProcesso} isModerator={isModerator}>
                            {CriarNovo()}
                        </PromptsTable>
                    </Tab>

                    <Tab eventKey="comunidade" title="Prompts Não Avaliados">
                        <PromptsTable prompts={promptsComunidade} onClick={promptOnClick} onProcessNumberChange={setNumeroDoProcesso} isModerator={isModerator}>
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
            <ToastContainer className="p-3" position="bottom-end" style={{ zIndex: 1 }}>
                <Toast onClose={() => setToast('')} show={!!toast} delay={10000} bg={toastVariant} autohide key={toast} >
                    <Toast.Header>
                        <strong className="me-auto">Atenção</strong>
                    </Toast.Header>
                    <Toast.Body className={toastVariant !== 'Light' && 'text-white'}><ErrorMessage message={toast} /></Toast.Body>
                </Toast>
            </ToastContainer>

        </>
        : <Container className="mt-4" fluid={false}>
            {(prompt.content.target !== 'PROCESSO' || !numeroDoProcesso) && <PromptTitleHeader prompt={prompt} />}
            {prompt.content.target === 'PROCESSO'
                ? !numeroDoProcesso
                    ? <ProcessNumberForm id={`${prompt.base_id}`} onChange={setNumber} />
                    : <>
                        <div id="printDiv">
                            {dadosDoProcesso
                                ? <><ProcessTitle id={dadosDoProcesso?.numeroDoProcesso} />
                                    <ProcessContents prompt={prompt} dadosDoProcesso={dadosDoProcesso} pieceContent={pieceContent} setPieceContent={setPieceContent} apiKeyProvided={apiKeyProvided} model={model} allLibraryDocuments={allLibraryDocuments}>
                                        <PromptTitle prompt={prompt} />
                                    </ProcessContents>
                                </>
                                : <><ProcessTitle id={numeroDoProcesso} /><SubtituloLoading /><PromptTitle prompt={prompt} /></>}
                        </div>
                    </>
                :
                prompt.content.target === 'TEXTO'
                    ? <TargetText prompt={prompt} apiKeyProvided={apiKeyProvided} />
                    : prompt.content.target === 'REFINAMENTO'
                        ? <TargetText prompt={prompt} apiKeyProvided={apiKeyProvided} visualization={VisualizationEnum.DIFF} />
                        : null
            }
        </Container>

    function CriarNovo() {
        return <div className="col col-auto mt-3">
            <DropdownButton id="criar-novo-dropdown" title="Criar Novo" variant="primary">
                <Dropdown.Item href="/prompts/prompt/new">Prompt</Dropdown.Item>
                <Dropdown.Item href="/prompts/prompt/new?template=true&import=true">Prompt a partir de um modelo pré-existente</Dropdown.Item>
                <Dropdown.Item href="/prompts/prompt/new?template=true">Prompt a partir de um modelo no padrão da Apoia</Dropdown.Item>
            </DropdownButton>
        </div>
    }
}