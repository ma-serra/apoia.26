
/**
 * # Sistema de Troca de Mensagens (PostMessage API)
 * 
 * Tipos e constantes para comunicação entre janelas/iframes usando window.postMessage.
 * 
 * ## Contextos de Uso
 * 
 * 1. **Autenticação** - Popup/iframe de login comunicando com página principal
 * 2. **Editor Sidekick** - Iframe do editor trocando conteúdo com página principal  
 * 3. **Visualização Diff** - Popup/modal de diff enviando aprovações
 * 
 * ## 1. Fluxo de Autenticação
 * 
 * ```
 * Página Principal          Popup/Iframe Login
 *      │                           │
 *      │─── window.open() ────────>│
 *      │                           │ (usuário faz login)
 *      │<── auth-completed ────────│
 *      │                           │ window.close()
 *      └─ reload/redirect
 * ```
 * 
 * Arquivos: `wait.tsx`, `ready.tsx`, `client.tsx`
 * 
 * ## 2. Fluxo do Editor Sidekick
 * 
 * ```
 * Página Principal          Iframe Editor
 *      │                         │
 *      │                         │ (detecta source=from-parent)
 *      │<── get-source ──────────│
 *      │─── set-source ─────────>│
 *      │    {markdown/html}      │ (usuário edita)
 *      │<── approved ────────────│
 *      │    {markdown, html}     │
 * ```
 * 
 * Arquivos: `usePromptState.ts`, `target-text.tsx`
 * 
 * ## 3. Fluxo de Diff
 * 
 * ```
 * Página Principal          Popup/Modal Diff
 *      │                         │
 *      │─── INIT ───────────────>│
 *      │    {old, new, vis}      │ (usuário revisa)
 *      │<── APPROVED ────────────│
 *      │    {approved}           │
 * ```
 * 
 * Mensagens: `APOIA_DIFF_{READY,INIT,APPROVED,CANCELED,ERROR}`
 * 
 * Arquivos: `diff.js`, `diff/page.tsx`
 * 
 * ## Segurança
 * 
 * - Usa `targetOrigin: '*'` (aceita qualquer origem)
 * - Em produção, validar `event.origin` nos listeners
 * - Sempre validar estrutura e tipos das mensagens
 * - Sanitizar HTML com DOMPurify quando aplicável
 */

import { InstanceType } from "../proc/process-types"

// ============================================================================
// CONSTANTES
// ============================================================================

export const INSTANCE_PARAM = 'instance'
export const INSTANCE_PARAM_FIRST = 'first'
export const INSTANCE_PARAM_SECOND = 'second'
export const INSTANCE_PARAM_THIRD = 'third'

/** 
 * Parâmetro URL que indica para buscar conteúdo via postMessage.
 * Usado em: `?source=from-parent`
 */
export const SOURCE_PARAM_THAT_INDICATES_TO_RETRIEVE_USING_MESSAGE_TO_PARENT = 'from-parent'
export const SINK_PARAM_THAT_INDICATES_TO_SEND_AS_A_MESSAGE_TO_PARENT = 'to-parent'
export const SINK_PARAM_THAT_INDICATES_TO_SEND_AS_A_MESSAGE_TO_PARENT_AUTOMATICALLY = 'to-parent-automatic'
export type SourceFromURLType = 'from-parent'
export type SinkFromURLType = 'to-parent' | 'to-parent-automatic'

// ============================================================================
// TIPOS DE MENSAGENS
// ============================================================================

/** Tipos de mensagens suportados pelo sistema */
export type MessageTypeType = 'auth-popup' | 'auth-completed' | 'get-source' | 'set-source' | 'approved' | 'get-sink' | 'set-sink'

/** Union type de todas as mensagens possíveis */
export type MessageWithType = {
    type: MessageTypeType
} & (
        | AuthPopupMessageType
        | AuthCompletedMessageType
        | SourceMessageToParentType
        | SourceMessageFromParentType
        | ApproveMessageToParentType
        | SinkMessageToParentType
        | SinkMessageFromParentType
    )

/** Solicita abertura de popup de autenticação */
export type AuthPopupMessageType = {
    type: 'auth-popup'
    payload: {
        url: string
    }
}

/** Confirma autenticação completada */
export type AuthCompletedMessageType = {
    type: 'auth-completed'
}

/** 
 * Iframe solicita conteúdo fonte ao parent.
 * Direção: Iframe → Parent
 */
export type SourceMessageToParentType = {
    type: 'get-source'
}

/** 
 * Parent envia conteúdo fonte ao iframe.
 * Direção: Parent → Iframe
 */
export type SourceMessageFromParentType = {
    type: 'set-source'
    payload: {
        markdownContent?: string
        htmlContent?: string
    }
}

/** 
 * Iframe envia conteúdo aprovado ao parent.
 * Direção: Iframe → Parent
 */
export type ApproveMessageToParentType = {
    type: 'approved'
    payload: {
        markdownContent: string
        htmlContent: string
    }
}

/** 
 * Iframe pergunta ao parent se deve devolver o resultado para a minuta.
 * Direção: Iframe → Parent
 */
export type SinkMessageToParentType = {
    type: 'get-sink'
    payload: {
        promptSlug?: string
    }
}

/** 
 * Parent informa 'to-parent' no kind e 'Enviar para a Minuta' no buttonText ao iframe.
 * Direção: Parent → Iframe
 */
export type SinkMessageFromParentType = {
    type: 'set-sink'
    payload: {
        kind?: 'to-parent' | 'to-parent-automatic' | null
        buttonText?: string
    }
}

