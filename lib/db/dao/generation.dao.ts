import knex from '../knex'
import * as mysqlTypes from '../mysql-types'
import { UserDao } from './user.dao'
import { getId } from './utils'

export class GenerationDao {
    static async retrieveIAGeneration(data: mysqlTypes.IAGeneration): Promise<mysqlTypes.IAGenerated | undefined> {
        if (!knex) return
        const { model, prompt, sha256, attempt } = data
        const sql = knex('ia_generation').select<mysqlTypes.IAGenerated>('*').whereNull('evaluation_id').where({
            model,
            prompt,
            sha256,
        })
        sql.whereNot('generation', '')
        sql.whereNotNull('generation')
        if (attempt) {
            sql.where({ attempt })
        } else {
            sql.whereNull('attempt')
        }
        const result = await sql.first()
        return result
    }

    static async insertIAGeneration(data: mysqlTypes.IAGeneration): Promise<mysqlTypes.IAGenerated | undefined> {
        if (!knex) return
        if (!data?.generation) throw new Error('Não é possível armazenar um resultado de IA vazio')
        const created_by = await UserDao.getCurrentUserId()
        const prompt_payload = null
        const {
            // prompt_payload, 
            model, prompt, sha256, generation, attempt,
            dossier_id, document_id,
            cached_input_tokens, input_tokens, output_tokens, reasoning_tokens, approximate_cost } = data
        
        // Extract prompt_id from prompt field if it's in format 'prompt-X'
        let prompt_id: number | null = null
        const promptMatch = /^prompt-(\d+)$/.exec(prompt)
        if (promptMatch) {
            const extractedId = parseInt(promptMatch[1], 10)
            // Verify that the prompt_id exists in ia_prompt table
            const promptExists = await knex('ia_prompt').where('id', extractedId).first()
            if (promptExists) {
                prompt_id = extractedId
            }
        }
        
        const [inserted] = await knex('ia_generation').insert({
            model, prompt, sha256, prompt_payload, generation, attempt,
            dossier_id, document_id,
            cached_input_tokens, input_tokens, output_tokens, reasoning_tokens, approximate_cost, created_by,
            prompt_id
        }).returning('id')
        const result = await knex('ia_generation').select<mysqlTypes.IAGenerated>('*').where('id', getId(inserted)).first()
        return result
    }

    static async evaluateIAGeneration(user_id: number, generation_id: number, evaluation_id: number, evaluation_descr: string | null): Promise<boolean | undefined> {
        if (!knex) return
        await knex('ia_generation').update({
            evaluation_user_id: user_id,
            evaluation_id,
            evaluation_descr
        }).where({ id: generation_id })
        return true
    }

    static async retrieveAIGenerationsReport(params: { court_id?: number, startDate?: string, endDate?: string, limit?: number }): Promise<mysqlTypes.AIGenerationReportRow[]> {
        if (!knex) return []
        const { court_id, startDate, endDate, limit = 5000 } = params

        // Load all prompts to map prompt-[id] to name
        const prompts = await knex('ia_prompt').select('id', 'name')
        const promptMap = new Map<number, string>()
        prompts.forEach(p => promptMap.set(p.id, p.name))

        const query = knex('ia_generation as g')
            .leftJoin('ia_user as u', 'u.id', 'g.created_by')
            .leftJoin('ia_dossier as d', 'd.id', 'g.dossier_id')
            .select(
                knex.raw('g.id as id'),
                knex.raw('g.created_at as created_at'),
                knex.raw('u.id as user_id'),
                knex.raw('u.name as user_name'),
                knex.raw('u.username as username'),
                knex.raw('u.court_id as court_id'),
                knex.raw('g.prompt as prompt_key'),
                knex.raw('g.model as model'),
                knex.raw('d.code as dossier_code'),
                knex.raw('COALESCE(g.cached_input_tokens, 0) as cached_input_tokens'),
                knex.raw('COALESCE(g.input_tokens, 0) as input_tokens'),
                knex.raw('COALESCE(g.output_tokens, 0) as output_tokens'),
                knex.raw('COALESCE(g.reasoning_tokens, 0) as reasoning_tokens'),
                knex.raw('COALESCE(g.approximate_cost, 0) as approximate_cost')
            )

        if (court_id) {
            query.where('u.court_id', court_id)
        }
        if (startDate) {
            query.andWhere('g.created_at', '>=', startDate + ' 00:00:00')
        }
        if (endDate) {
            query.andWhere('g.created_at', '<=', endDate + ' 23:59:59')
        }

        query.orderBy('g.created_at', 'desc')
        query.limit(limit)

        const rows: any[] = await query

        return rows.map(r => {
            let promptName = r.prompt_key
            // Check if it's in format prompt-[number]
            const match = /^prompt-(\d+)$/.exec(r.prompt_key)
            if (match) {
                const promptId = parseInt(match[1], 10)
                promptName = promptMap.get(promptId) || r.prompt_key
            }

            const cachedTokens = Number(r.cached_input_tokens) || 0
            const inputTokens = Number(r.input_tokens) || 0
            const outputTokens = Number(r.output_tokens) || 0
            const reasoningTokens = Number(r.reasoning_tokens) || 0

            return {
                id: Number(r.id),
                created_at: new Date(r.created_at),
                user_id: r.user_id ? Number(r.user_id) : null,
                user_name: r.user_name ?? null,
                username: r.username ?? null,
                court_id: r.court_id ? Number(r.court_id) : null,
                prompt_key: r.prompt_key,
                prompt_name: promptName,
                model: r.model,
                dossier_code: r.dossier_code ?? null,
                cached_input_tokens: cachedTokens || null,
                input_tokens: inputTokens || null,
                output_tokens: outputTokens || null,
                reasoning_tokens: reasoningTokens || null,
                total_tokens: cachedTokens + inputTokens + outputTokens + reasoningTokens,
                approximate_cost: r.approximate_cost ? Number(r.approximate_cost) : null,
            }
        })
    }
}
