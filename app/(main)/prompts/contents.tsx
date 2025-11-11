'use client'

import { IAPromptList } from "@/lib/db/mysql-types"
import { UserType } from "@/lib/user"
import React, { useEffect, useMemo, useState } from "react"
import { Toast, ToastContainer } from "react-bootstrap"
import ErrorMessage from "@/components/error-message"
import { addGenericCookie } from "./add-cookie"
import TermosDeUso from "./termos-de-uso"
import { usePromptState } from "./hooks/usePromptState"
import { useProcessData } from "./hooks/useProcessData"
import { filterPrompts, getPromptsPrincipais, getPromptsComunidade, getPromptsSidekick } from "./utils/promptFilters"
import { MainView } from "./components/MainView"
import { SidekickView } from "./components/SidekickView"
import { PromptExecutionView } from "./components/PromptExecutionView"

export const copyPromptToClipboard = (prompt: IAPromptList) => {
    let s: string = prompt.content.system_prompt
    s = s ? `# PROMPT DE SISTEMA\n\n${s}\n\n# PROMPT\n\n` : ''
    s += prompt.content.prompt
    navigator.clipboard.writeText(s)
}

export function Contents({ prompts, user, user_id, apiKeyProvided, model, isModerator, sidekick }: { prompts: IAPromptList[], user: UserType, user_id: number, apiKeyProvided: boolean, model?: string, isModerator: boolean, sidekick?: boolean }) {
    const [toast, setToast] = useState<string>()
    const [toastVariant, setToastVariant] = useState<string>()
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

    const processData = useProcessData(toastMessage)
    const {
        numeroDoProcesso,
        setNumeroDoProcesso,
        arrayDeDadosDoProcesso,
        dadosDoProcesso,
        idxProcesso,
        setIdxProcesso,
        setDadosDoProcesso,
        number,
        setNumber,
        setTramFromUrl
    } = processData

    const promptState = usePromptState(
        prompts,
        numeroDoProcesso,
        idxProcesso,
        arrayDeDadosDoProcesso,
        setNumeroDoProcesso,
        setNumber,
        setDadosDoProcesso as any,
        setDadosDoProcesso,
        setIdxProcesso,
        setTramFromUrl
    )

    const {
        prompt,
        setPrompt,
        scope,
        setScope,
        instance,
        setInstance,
        matter,
        setMatter,
        activeTab,
        setActiveTab,
        pieceContent,
        setPieceContent,
        allLibraryDocuments
    } = promptState

    const promptOnClick = (kind: string, row: any) => {
        switch (kind) {
            case 'executar':
                setPrompt(row)
                if (row.content.target !== 'PROCESSO') {
                    setNumeroDoProcesso(null)
                    setNumber('')
                }
                break
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

    const filteredPromptsBase = useMemo(
        () => filterPrompts(prompts, { scope, instance, matter }),
        [prompts, scope, instance, matter]
    )

    const promptsPrincipais = useMemo(
        () => getPromptsPrincipais(filteredPromptsBase),
        [filteredPromptsBase]
    )

    const promptsComunidade = useMemo(
        () => getPromptsComunidade(filteredPromptsBase),
        [filteredPromptsBase]
    )

    const promptsSidekick = useMemo(
        () => getPromptsSidekick(filteredPromptsBase, prompt, numeroDoProcesso),
        [filteredPromptsBase, prompt, numeroDoProcesso]
    )

    if (sidekick) {
        if (termosAceitos === false) {
            return <TermosDeUso onAccept={() => { setTermosAceitos(true); addGenericCookie('termos-de-uso', '1') }} />
        }

        return (
            <SidekickView
                prompt={prompt}
                numeroDoProcesso={numeroDoProcesso}
                dadosDoProcesso={dadosDoProcesso}
                pieceContent={pieceContent}
                setPieceContent={setPieceContent}
                apiKeyProvided={apiKeyProvided}
                model={model}
                allLibraryDocuments={allLibraryDocuments}
                promptsSidekick={promptsSidekick}
                setPrompt={setPrompt}
                setNumber={setNumber}
                resetToHome={resetToHome}
                resetProcess={resetProcess}
                resetPrompt={resetPrompt}
            />
        )
    }

    return !prompt ? (
        <>
            <MainView
                promptsPrincipais={promptsPrincipais}
                promptsComunidade={promptsComunidade}
                promptOnClick={promptOnClick}
                onProcessNumberChange={setNumeroDoProcesso}
                isModerator={isModerator}
                apiKeyProvided={apiKeyProvided}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
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
            <ToastContainer className="p-3" position="bottom-end" style={{ zIndex: 1 }}>
                <Toast onClose={() => setToast('')} show={!!toast} delay={10000} bg={toastVariant} autohide key={toast}>
                    <Toast.Header>
                        <strong className="me-auto">Atenção</strong>
                    </Toast.Header>
                    <Toast.Body className={toastVariant !== 'Light' && 'text-white'}>
                        <ErrorMessage message={toast} />
                    </Toast.Body>
                </Toast>
            </ToastContainer>
        </>
    ) : (
        <PromptExecutionView
            prompt={prompt}
            numeroDoProcesso={numeroDoProcesso}
            dadosDoProcesso={dadosDoProcesso}
            pieceContent={pieceContent}
            setPieceContent={setPieceContent}
            apiKeyProvided={apiKeyProvided}
            model={model}
            allLibraryDocuments={allLibraryDocuments}
            setPrompt={setPrompt}
            setNumber={setNumber}
        />
    )
}