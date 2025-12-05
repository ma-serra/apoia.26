import knex from '../knex'
import * as mysqlTypes from '../mysql-types'

const CORPORATIVO_PROXY_URL = 'https://gateway.cloud.pje.jus.br/corporativo-proxy/api/v1'

interface OrgaoGenericoResponse {
    code: number
    status: string
    result: OrgaoGenericoItem[]
}

interface OrgaoGenericoItem {
    codigoOrgao: string
    nomeOrgao: string
    codigoOrgaoPai: string | null
    segmentoJustica: string
    codigoTipoOrgao: string
    sigUf: string | null
    tribunal?: {
        codigoTribunal: string
        nomeTribunal: string
        segmentoJustica: string
        jtr: string
    }
}

export class CourtDao {
    /**
     * Busca um tribunal pelo ID (court_id)
     */
    static async getCourtById(courtId: number): Promise<mysqlTypes.IACourt | null> {
        if (!knex) return null
        const court = await knex('ia_court').where({ id: courtId }).first()
        return court || null
    }

    /**
     * Busca um tribunal pela sigla
     */
    static async getCourtBySigla(sigla: string): Promise<mysqlTypes.IACourt | null> {
        if (!knex) return null
        const court = await knex('ia_court').where({ sigla }).first()
        return court || null
    }

    /**
     * Lista todos os tribunais cadastrados
     */
    static async getAllCourts(): Promise<mysqlTypes.IACourt[]> {
        if (!knex) return []
        return await knex('ia_court').orderBy('sigla')
    }

    /**
     * Insere ou atualiza um tribunal
     */
    static async upsertCourt(court: mysqlTypes.IACourtToInsert): Promise<void> {
        if (!knex) return

        const existing = await knex('ia_court').where({ id: court.id }).first()
        if (existing) {
            await knex('ia_court').where({ id: court.id }).update({
                sigla: court.sigla,
                nome: court.nome,
                tipo: court.tipo,
                seq_tribunal_pai: court.seq_tribunal_pai,
                uf: court.uf,
                updated_at: new Date()
            })
        } else {
            await knex('ia_court').insert({
                id: court.id,
                sigla: court.sigla,
                nome: court.nome,
                tipo: court.tipo,
                seq_tribunal_pai: court.seq_tribunal_pai,
                uf: court.uf
            })
        }
    }

    /**
     * Busca tribunal do cache local ou do webservice
     * Se não existir no cache, busca do webservice e salva
     */
    static async getOrFetchCourt(courtId: number): Promise<mysqlTypes.IACourt | null> {
        // Tenta buscar do cache local
        try {
            const cached = await this.getCourtById(courtId)
            if (cached) return cached
        } catch (error) {
            // Tabela ia_court pode não existir ainda, continua para buscar do webservice
            console.warn(`Cache de tribunais indisponível, buscando do webservice: ${error}`)
        }

        // Busca do webservice
        const fetched = await this.fetchCourtFromWebservice(courtId)
        if (fetched) {
            // Tenta salvar no cache (pode falhar se tabela não existir)
            try {
                await this.upsertCourt(fetched)
            } catch (error) {
                console.warn(`Não foi possível salvar tribunal no cache: ${error}`)
            }
            
            // Retorna os dados buscados como IACourt
            return {
                id: fetched.id,
                sigla: fetched.sigla,
                nome: fetched.nome,
                tipo: fetched.tipo,
                seq_tribunal_pai: fetched.seq_tribunal_pai,
                uf: fetched.uf,
                created_at: new Date(),
                updated_at: null
            }
        }

        return null
    }

    /**
     * Busca informações do tribunal do webservice corporativo-proxy
     */
    static async fetchCourtFromWebservice(courtId: number): Promise<mysqlTypes.IACourtToInsert | null> {
        try {
            const response = await fetch(
                `${CORPORATIVO_PROXY_URL}/orgaos-genericos/${courtId}/especificos/estrutura-completa`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Apoia Client'
                    }
                }
            )

            if (!response.ok) {
                console.error(`Erro ao buscar tribunal ${courtId}: ${response.status} ${response.statusText}`)
                return null
            }

            const data: OrgaoGenericoResponse = await response.json()
            
            if (!data.result || data.result.length === 0) {
                console.error(`Tribunal ${courtId} não encontrado no webservice`)
                return null
            }

            const orgao = data.result[0]
            
            return {
                id: parseInt(orgao.codigoOrgao),
                sigla: `T-${courtId}`,
                nome: orgao.tribunal?.nomeTribunal || orgao.nomeOrgao,
                tipo: orgao.codigoTipoOrgao || null,
                seq_tribunal_pai: orgao.codigoOrgaoPai ? parseInt(orgao.codigoOrgaoPai) : null,
                uf: orgao.sigUf || null
            }
        } catch (error) {
            console.error(`Erro ao buscar tribunal ${courtId} do webservice:`, error)
            return null
        }
    }

    /**
     * Busca múltiplos tribunais e cacheia
     * Útil para popular o cache inicial
     */
    static async fetchAndCacheMultipleCourts(courtIds: number[]): Promise<void> {
        for (const courtId of courtIds) {
            await this.getOrFetchCourt(courtId)
        }
    }

    /**
     * Retorna tribunais com estatísticas de uso
     * Agrupa execuções por tribunal
     */
    static async getCourtsWithUsageStats(): Promise<{ court: mysqlTypes.IACourt, totalExecutions: number }[]> {
        if (!knex) return []

        // Busca estatísticas de uso agrupadas por court_id
        const stats = await knex('ia_generation as g')
            .join('ia_user as u', 'u.id', 'g.created_by')
            .whereNotNull('u.court_id')
            .where('g.prompt', 'like', 'prompt-%')
            .groupBy('u.court_id')
            .select(
                'u.court_id',
                knex.raw('COUNT(g.id) as total_executions')
            )

        // Busca informações dos tribunais
        const result: { court: mysqlTypes.IACourt, totalExecutions: number }[] = []
        
        for (const stat of stats) {
            const court = await this.getOrFetchCourt(stat.court_id)
            if (court) {
                result.push({
                    court,
                    totalExecutions: Number(stat.total_executions)
                })
            }
        }

        return result.sort((a, b) => b.totalExecutions - a.totalExecutions)
    }
}
