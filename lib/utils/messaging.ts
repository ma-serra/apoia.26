
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

// ============================================================================
// CONSTANTES
// ============================================================================

/** 
 * Parâmetro URL que indica para buscar conteúdo via postMessage.
 * Usado em: `?source=from-parent`
 */
export const SOURCE_PARAM_THAT_INDICATES_TO_RETRIEVE_USING_MESSAGE_TO_PARENT = 'from-parent'

// ============================================================================
// TIPOS DE MENSAGENS
// ============================================================================

/** Tipos de mensagens suportados pelo sistema */
export type MessageTypeType = 'auth-popup' | 'auth-completed' | 'get-source' | 'set-source' | 'approved'

/** Union type de todas as mensagens possíveis */
export type MessageWithType = {
    type: MessageTypeType
} & (
        | AuthPopupMessageType
        | AuthCompletedMessageType
        | SourceMessageToParentType
        | SourceMessageFromParentType
        | ApproveMessageToParentType
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
