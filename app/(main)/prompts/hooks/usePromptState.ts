import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { IAPromptList, IALibrary } from "@/lib/db/mysql-types"
import { slugify } from "@/lib/utils/utils"
import { decodeEnumParam, findPromptFromParam } from "../utils/promptFilters"
import { Instance, Matter, Scope } from "@/lib/proc/process-types"
import { html2md } from "@/lib/utils/html2md"
import { SOURCE_PARAM_THAT_INDICATES_TO_RETRIEVE_USING_MESSAGE_TO_PARENT, MessageWithType, SourceMessageFromParentType, SourceMessageToParentType } from "@/lib/utils/messaging"
import devLog from "@/lib/utils/log"

export interface UsePromptStateResult {
    prompt: IAPromptList | null
    setPrompt: (prompt: IAPromptList | null) => void
    scope: string | undefined
    setScope: (scope: string | undefined) => void
    instance: string | undefined
    setInstance: (instance: string | undefined) => void
    matter: string | undefined
    setMatter: (matter: string | undefined) => void
    activeTab: string
    setActiveTab: (tab: string) => void
    pieceContent: any
    setPieceContent: (content: any) => void
    source: string | null
    setSource: (source: string | null) => void
    allLibraryDocuments: IALibrary[]
    promptInitialized: boolean
}

export function usePromptState(
    prompts: IAPromptList[],
    numeroDoProcesso: string | null,
    idxProcesso: number,
    arrayDeDadosDoProcesso: any[] | null,
    setNumeroDoProcesso: (numero: string | null) => void,
    setNumber: (number: string) => void,
    setArrayDeDadosDoProcesso: (array: any[] | null) => void,
    setDadosDoProcesso: (dados: any | null) => void,
    setIdxProcesso: (idx: number) => void,
    setTramFromUrl: (tram: number | null) => void
): UsePromptStateResult {
    const currentSearchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()
    const lastQueryRef = useRef<string>('')

    const [prompt, setPrompt] = useState<IAPromptList | null>(null)
    const [scope, setScope] = useState<string | undefined>()
    const [instance, setInstance] = useState<string | undefined>()
    const [matter, setMatter] = useState<string | undefined>()
    const [promptInitialized, setPromptInitialized] = useState(false)
    const [pieceContent, setPieceContent] = useState({})
    const [allLibraryDocuments, setAllLibraryDocuments] = useState<IALibrary[]>([])
    const [activeTab, setActiveTab] = useState<string>('principal')
    const [sourceFromURL, setSourceFromURL] = useState<string | null>(null)
    const [source, setSource] = useState<string | null>(null)
    const hasRunSource = useRef(false)

    useEffect(() => {
        const loadLibraryDocuments = async () => {
            try {
                const response = await fetch('/api/v1/library')
                if (response.ok) {
                    const data = await response.json()
                    const documents = data?.items || data || []
                    setAllLibraryDocuments(documents)
                }
            } catch (error) {
                console.error('Error loading library documents:', error)
            }
        }
        loadLibraryDocuments()
    }, [])

    useEffect(() => {
        if (promptInitialized) return

        const p = currentSearchParams.get('prompt')
        const proc = currentSearchParams.get('process')
        const sc = currentSearchParams.get('scope')
        const inst = currentSearchParams.get('instance')
        const mat = currentSearchParams.get('matter')
        const tram = currentSearchParams.get('tram')
        const tab = currentSearchParams.get('tab')
        const sourceFromURL = currentSearchParams.get('source')

        if (p) {
            const found = findPromptFromParam(prompts, p)
            if (found) setPrompt(found)
        }

        if (proc && proc.length === 20) {
            setNumeroDoProcesso(proc)
            setNumber(proc)
        }

        const scName = decodeEnumParam(sc, Scope)
        const instName = decodeEnumParam(inst, Instance)
        const matName = decodeEnumParam(mat, Matter)

        if (scName) setScope(scName)
        if (instName) setInstance(instName)
        if (matName) setMatter(matName)
        if (tram && /^\d+$/.test(tram)) setTramFromUrl(parseInt(tram))
        if (tab === 'comunidade') setActiveTab('comunidade')
        if (sourceFromURL) setSourceFromURL(sourceFromURL)

        setPromptInitialized(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (prompt && prompt.content?.target && prompt.content.target !== 'PROCESSO') {
            if (numeroDoProcesso) setNumeroDoProcesso(null)
            if (arrayDeDadosDoProcesso) setArrayDeDadosDoProcesso(null)
            if (setDadosDoProcesso) setDadosDoProcesso(null)
            if (idxProcesso !== 0) setIdxProcesso(0)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prompt])

    useEffect(() => {
        if (!promptInitialized) return

        const params = new URLSearchParams(currentSearchParams.toString())

        if (prompt) {
            if (prompt.kind?.startsWith('^')) {
                params.set('prompt', slugify(prompt.kind.substring(1)))
            } else if (prompt.base_id != null) {
                params.set('prompt', String(prompt.base_id))
            }
        } else {
            params.delete('prompt')
        }

        if (numeroDoProcesso?.length === 20) params.set('process', numeroDoProcesso)
        else params.delete('process')

        if (arrayDeDadosDoProcesso?.length > 1) {
            const defaultIdx = arrayDeDadosDoProcesso.length - 1
            if (idxProcesso !== defaultIdx) params.set('tram', String(idxProcesso))
            else params.delete('tram')
        } else {
            params.delete('tram')
        }

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

    useEffect(() => {
        devLog('*** Source from URL:', sourceFromURL)
        if (sourceFromURL !== SOURCE_PARAM_THAT_INDICATES_TO_RETRIEVE_USING_MESSAGE_TO_PARENT) return

        // Previne execução dupla em desenvolvimento (React 18 Strict Mode)
        if (hasRunSource.current) return
        hasRunSource.current = true
        parent.postMessage({ type: 'get-source' } satisfies SourceMessageToParentType, '*')

        // Listener para mensagem do popup
        const handleMessage = (event: MessageEvent) => {
            switch (event.data?.type) {
                case 'set-source':
                    const receivedMessage = event.data as SourceMessageFromParentType
                    if (receivedMessage.payload.markdownContent) {
                        const markdownContent = html2md(receivedMessage.payload.markdownContent)
                        setSource(markdownContent)
                        devLog(`Converted HTML to Markdown source from parent message.\n\n${markdownContent}`)
                    } else if (receivedMessage.payload.htmlContent) {
                        setSource(receivedMessage.payload.htmlContent)
                        devLog(`Received source from parent message.\n\n${receivedMessage.payload.htmlContent}`)
                    } else {
                        devLog('No content received in set-source message from parent.')
                    }
            }
        }
        window.addEventListener('message', handleMessage)
        return () => {
            window.removeEventListener('message', handleMessage)
        }
    }, [sourceFromURL])

    return {
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
        source,
        setSource,
        allLibraryDocuments,
        promptInitialized
    }
}
