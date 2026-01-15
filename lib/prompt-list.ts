import { cookies } from 'next/headers'
import { PromptDao } from './db/dao'
import { IAPromptList } from './db/mysql-types'
import { TipoDeSinteseMap } from './proc/combinacoes'
import { Instance, Matter, Scope, Share, StatusDeLancamento } from './proc/process-types'

/**
 * Synchronizes internal prompts in database based on TipoDeSinteseMap
 * Adds missing prompts and removes obsolete ones
 */
async function syncInternalPrompts(basePrompts: IAPromptList[]): Promise<Map<string, IAPromptList>> {
    const baseByKind = new Map<string, IAPromptList>()
    for (const p of basePrompts) {
        if (p.kind?.startsWith('^')) {
            baseByKind.set(p.kind, p)
        }
    }

    // Ensure all prompts from TipoDeSinteseMap exist in database
    const allMapKeys = Object.keys(TipoDeSinteseMap)
    for (const key of allMapKeys) {
        const kind = `^${key}`
        if (!baseByKind.has(kind)) {
            const newPrompt = await PromptDao.addInternalPrompt(kind) as IAPromptList
            baseByKind.set(kind, newPrompt)
        }
    }

    // Remove prompts that no longer exist in TipoDeSinteseMap
    const validKinds = new Set(allMapKeys.map(k => `^${k}`))
    for (const [kind, prompt] of baseByKind.entries()) {
        if (!validKinds.has(kind)) {
            await PromptDao.removeInternalPrompt(kind)
            baseByKind.delete(kind)
        }
    }

    return baseByKind
}

/**
 * Builds list of visible prompts with overlays based on user permissions and settings
 */
async function buildVisiblePrompts(
    baseByKind: Map<string, IAPromptList>, 
    isBetaTester: boolean, 
    showChatPadrao: boolean
): Promise<IAPromptList[]> {
    const seededOverlay: IAPromptList[] = []
    
    for (const key of Object.keys(TipoDeSinteseMap)) {
        const def = TipoDeSinteseMap[key]
        
        // Skip CHAT_STANDALONE if not showing chat padrão
        if (!showChatPadrao && key === 'CHAT_STANDALONE') continue
        
        // Skip development features for non-beta testers
        if (def.status === StatusDeLancamento.EM_DESENVOLVIMENTO && !isBetaTester) continue
        
        const base = baseByKind.get(`^${key}`)
        if (!base) continue // Should not happen after sync, but defensive programming
        
        // Overlay display fields: name and filters (content.*)
        const over: IAPromptList = {
            ...base,
            name: def.nome,
            // Ensure content exists
            content: {
                ...base.content,
                author: def.author || '-',
                target: def.target || 'PROCESSO',
                scope: def.scope?.length ? def.scope : Object.keys(Scope),
                instance: def.instance?.length ? def.instance : Object.keys(Instance),
                matter: def.matter?.length ? def.matter : Object.keys(Matter),
            },
            share: def.status === StatusDeLancamento.EM_DESENVOLVIMENTO ? Share.NAO_LISTADO.name : Share.PADRAO.name,
            // Defaults when coming from `seed` (not in base list)
            is_internal: true,
            is_mine: false,
            is_favorite: (base as any).is_favorite ?? 0,
            favorite_count: (base as any).favorite_count ?? 0,
        }
        seededOverlay.push(over)
    }

    return seededOverlay
}

/**
 * Main function that orchestrates prompt list processing
 */
export async function fixPromptList(basePrompts: IAPromptList[], showChatPadrao = false, isBetaTester?: boolean): Promise<IAPromptList[]> {
    // Determine beta tester cookie (only if not provided as parameter)
    if (isBetaTester === undefined) {
        const cookieStore = await cookies()
        const betaCookie = cookieStore.get('beta-tester')?.value
        isBetaTester = betaCookie === '2'
    }

    // Step 1: Sync internal prompts with database
    const syncedPrompts = await syncInternalPrompts(basePrompts)
    
    // Step 2: Build visible prompts list
    const seededOverlay = await buildVisiblePrompts(syncedPrompts, isBetaTester, showChatPadrao)
    
    // Step 3: Combine with non-seeded prompts and sort
    const nonSeeded = basePrompts.filter(p => !p.kind?.startsWith('^'))
    const prompts: IAPromptList[] = [...nonSeeded, ...seededOverlay]

    prompts.sort((a, b) => {
        if (!!a.is_favorite > !!b.is_favorite) return -1
        if (!!a.is_favorite < !!b.is_favorite) return 1
        if (parseIntSafe(a.favorite_count) > parseIntSafe(b.favorite_count)) return -1
        if (parseIntSafe(a.favorite_count) < parseIntSafe(b.favorite_count)) return 1
        if (a.is_mine > b.is_mine) return -1
        if (a.is_mine < b.is_mine) return 1
        if (a.is_internal && !b.is_internal) return -1
        if (!a.is_internal && b.is_internal) return 1
        if (a.created_at > b.created_at) return -1
        if (a.created_at < b.created_at) return 1
        return 0
    })

    return prompts
}

const parseIntSafe = (s: any): number => {
    const n = parseInt(s)
    if (isNaN(n)) return 0
    return n
}

