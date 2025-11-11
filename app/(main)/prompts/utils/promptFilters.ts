import { IAPromptList } from "@/lib/db/mysql-types"
import { Instance, Matter, Scope } from "@/lib/proc/process-types"
import { slugify } from "@/lib/utils/utils"
import { enumSorted } from "@/lib/ai/model-types"

export interface PromptFilters {
    scope?: string
    instance?: string
    matter?: string
}

export function filterPrompts(
    prompts: IAPromptList[],
    filters: PromptFilters
): IAPromptList[] {
    return prompts.filter((p) => {
        if (filters.scope && !p.content.scope?.includes(filters.scope)) return false
        if (filters.instance && !p.content.instance?.includes(filters.instance)) return false
        if (filters.matter && !p.content.matter?.includes(filters.matter)) return false
        return true
    })
}

export function getPromptsPrincipais(prompts: IAPromptList[]): IAPromptList[] {
    return prompts.filter((p) => p.share === 'PADRAO' || p.is_mine)
}

export function getPromptsComunidade(prompts: IAPromptList[]): IAPromptList[] {
    return prompts.filter((p) => p.share !== 'PADRAO' && !p.is_mine)
}

export function getPromptsSidekick(
    prompts: IAPromptList[],
    selectedPrompt: IAPromptList | null,
    numeroDoProcesso: string | null
): IAPromptList[] {
    const chatIsCurrentPrompt = selectedPrompt?.kind === '^CHAT'
    let list = prompts.filter(
        (p) =>
            p.is_favorite ||
            (p.kind === '^CHAT' && !chatIsCurrentPrompt) ||
            (p.kind === '^CHAT_STANDALONE' && !numeroDoProcesso)
    )
    
    if (!prompts.find((p) => p.is_favorite)) {
        list = prompts.filter(
            (p) =>
                p.share === 'PADRAO' ||
                p.is_favorite ||
                (p.kind === '^CHAT' && !chatIsCurrentPrompt)
        )
    }
    
    const chat = list.find((p) => p.kind === '^CHAT')
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
}

export function decodeEnumParam(param: string | null, enumObj: any): string | undefined {
    if (!param) return undefined
    const list = enumSorted(enumObj)
    const direct = list.find((s: any) => s.value?.name === param)?.value?.name
    if (direct) return direct
    const bySlug = list.find((s: any) => slugify(s.value?.name) === param)?.value?.name
    return bySlug
}

export function findPromptFromParam(prompts: IAPromptList[], param: string): IAPromptList | null {
    if (/^\d+$/.test(param)) {
        const n = parseInt(param)
        return prompts.find(pr => pr.base_id === n) || null
    } else {
        return prompts.find(pr => pr.kind?.startsWith('^') && slugify(pr.kind.substring(1)) === param) || null
    }
}
