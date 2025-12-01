import knex from '../knex'
import * as mysqlTypes from '../mysql-types'
import { CourtDao } from './court.dao'

// Constantes de configuração
export const STATS_CONFIG = {
    /** Tempo médio economizado por execução em minutos */
    TEMPO_MEDIO_ECONOMIA_POR_EXECUCAO_MINUTOS: 15,
    /** Período para considerar usuários ativos (dias) */
    PERIODO_USUARIOS_ATIVOS_DIAS: 30,
    /** Período para prompts em alta (dias) */
    PERIODO_TRENDING_DIAS: 30,
    /** Mínimo de execuções por terceiros para badge Influenciador */
    MIN_EXECUCOES_INFLUENCIADOR: 50,
    /** Mínimo de favoritos para badge Popular */
    MIN_FAVORITOS_POPULAR: 10,
    /** Mínimo de execuções para badge Power User */
    MIN_EXECUCOES_POWER_USER: 100,
    /** Mínimo de avaliações para badge Curador */
    MIN_AVALIACOES_CURADOR: 20,
}

export class StatsDao {
    // ==================== ESTATÍSTICAS GLOBAIS ====================

    /**
     * Retorna o total de execuções de prompts do banco
     * Usa ia_user_daily_usage para consistência com estatísticas individuais
     */
    static async getTotalExecutions(): Promise<number> {
        if (!knex) return 0
        const result = await knex('ia_user_daily_usage')
            .sum('usage_count as total')
            .first()
        return Number(result?.total) || 0
    }

    /**
     * Retorna o total de usuários ativos nos últimos N dias
     */
    static async getTotalActiveUsers(days: number = STATS_CONFIG.PERIODO_USUARIOS_ATIVOS_DIAS): Promise<number> {
        if (!knex) return 0
        const dateLimit = new Date()
        dateLimit.setDate(dateLimit.getDate() - days)

        const result = await knex('ia_user_daily_usage')
            .whereNotNull('user_id')
            .andWhere('usage_date', '>=', dateLimit.toISOString().split('T')[0])
            .countDistinct('user_id as count')
            .first()
        return Number(result?.count) || 0
    }

    /**
     * Retorna o total de tribunais únicos com usuários
     */
    static async getTotalCourts(): Promise<number> {
        if (!knex) return 0
        const result = await knex('ia_user')
            .whereNotNull('court_id')
            .countDistinct('court_id as count')
            .first()
        return Number(result?.count) || 0
    }

    /**
     * Retorna o ranking de tribunais por execuções
     */
    static async getCourtRanking(limit: number = 5): Promise<mysqlTypes.CourtRankingItem[]> {
        if (!knex) return []

        const stats = await knex('ia_generation as g')
            .join('ia_user as u', 'u.id', 'g.created_by')
            .whereNotNull('u.court_id')
            .andWhere('g.prompt', 'like', 'prompt-%')
            .groupBy('u.court_id')
            .select(
                'u.court_id as courtId',
                knex.raw('COUNT(g.id) as "totalExecutions"')
            )
            .orderByRaw('COUNT(g.id) DESC')
            .limit(limit)

        const result: mysqlTypes.CourtRankingItem[] = []
        for (const stat of stats) {
            const court = await CourtDao.getOrFetchCourt(stat.courtId)
            result.push({
                courtId: stat.courtId,
                sigla: court?.sigla || `Court ${stat.courtId}`,
                nome: court?.nome || `Tribunal ${stat.courtId}`,
                totalExecutions: Number(stat.totalExecutions)
            })
        }

        return result
    }

    /**
     * Retorna os top contribuidores (autores de prompts)
     */
    static async getTopContributors(limit: number = 5): Promise<mysqlTypes.TopContributorItem[]> {
        if (!knex) return []

        const dateLimit = new Date()
        dateLimit.setDate(dateLimit.getDate() - STATS_CONFIG.PERIODO_TRENDING_DIAS)

        // Busca autores de prompts públicos/padrão com suas estatísticas
        const contributors = await knex('ia_prompt as p')
            .join('ia_user as u', 'u.id', 'p.created_by')
            .leftJoin('ia_court as c', 'c.id', 'u.court_id')
            .where('p.is_latest', 1)
            .whereIn('p.share', ['PUBLICO', 'PADRAO'])
            .whereNotNull('p.created_by')
            .groupBy('u.id', 'u.name', 'u.username', 'c.sigla')
            .select(
                'u.id as userId',
                'u.name',
                'u.username',
                'c.sigla as courtSigla'
            )

        // Para cada contribuidor, buscar execuções e ratings dos últimos 30 dias
        const result: mysqlTypes.TopContributorItem[] = []

        for (const contrib of contributors) {
            // Buscar prompts do autor (todas as versões, não apenas is_latest)
            const authorPrompts = await knex('ia_prompt')
                .where('created_by', contrib.userId)
                .whereIn('share', ['PUBLICO', 'PADRAO'])
                .select('id', 'base_id')

            if (authorPrompts.length === 0) continue

            const promptIds = authorPrompts.map(p => p.id)
            const baseIds = [...new Set(authorPrompts.map(p => p.base_id).filter(Boolean))]

            // Contar execuções dos prompts deste autor nos últimos 30 dias
            // Usar whereIn com array de valores para melhor performance
            const promptPatterns = promptIds.map(id => `prompt-${id}`)
            
            let totalExecutions = 0
            if (promptPatterns.length > 0) {
                const execCount = await knex('ia_generation')
                    .whereIn('prompt', promptPatterns)
                    .where('created_at', '>=', dateLimit)
                    .count('id as count')
                    .first()
                totalExecutions = Number(execCount?.count) || 0
            }

            // Buscar ratings dos prompts deste autor nos últimos 30 dias
            let totalStars = 0
            let totalRatings = 0
            if (baseIds.length > 0) {
                const ratings = await knex('ia_prompt_rating')
                    .whereIn('prompt_base_id', baseIds)
                    .where('created_at', '>=', dateLimit)
                    .select(
                        knex.raw('SUM(stars) as totalStars'),
                        knex.raw('COUNT(*) as totalRatings')
                    )
                    .first() as any
                totalStars = Number(ratings?.totalStars) || 0
                totalRatings = Number(ratings?.totalRatings) || 0
            }

            const avgStars = totalRatings > 0 ? totalStars / totalRatings : 0
            const score = totalExecutions + (avgStars * 10)

            result.push({
                userId: contrib.userId,
                name: contrib.name || contrib.username,
                username: contrib.username,
                courtSigla: contrib.courtSigla,
                totalExecutions,
                avgStars: Number(avgStars.toFixed(1)),
                totalRatings,
                score: Number(score.toFixed(1))
            })
        }

        // Ordenar por score e limitar
        return result
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
    }

    /**
     * Retorna os prompts em alta (trending)
     */
    static async getTrendingPrompts(limit: number = 5): Promise<mysqlTypes.TrendingPromptItem[]> {
        if (!knex) return []

        const dateLimit = new Date()
        dateLimit.setDate(dateLimit.getDate() - STATS_CONFIG.PERIODO_TRENDING_DIAS)

        // Buscar prompts com mais execuções nos últimos 30 dias
        // Join com TODAS as versões do prompt (não apenas is_latest)
        const trending = await knex('ia_generation as g')
            .join('ia_prompt as p', knex.raw("g.prompt = 'prompt-' || CAST(p.id AS TEXT)"))
            .whereIn('p.share', ['PUBLICO', 'PADRAO'])
            .where('g.created_at', '>=', dateLimit)
            .groupBy('p.base_id')
            .select(
                'p.base_id as promptBaseId',
                knex.raw('COUNT(g.id) as "executionsLast30Days"')
            )
            .orderByRaw('COUNT(g.id) DESC')
            .limit(limit)

        // Buscar informações adicionais para cada prompt (nome, autor, ratings)
        const result: mysqlTypes.TrendingPromptItem[] = []
        for (const item of trending) {
            // Buscar a versão mais recente do prompt para obter nome e autor
            const latestPrompt = await knex('ia_prompt as p')
                .leftJoin('ia_user as u', 'u.id', 'p.created_by')
                .where('p.base_id', item.promptBaseId)
                .where('p.is_latest', 1)
                .select('p.name as promptName', 'u.name as authorName')
                .first()

            if (!latestPrompt) continue

            const ratingStats = await knex('ia_prompt_rating')
                .where('prompt_base_id', item.promptBaseId)
                .select(
                    knex.raw('AVG(stars) as avgStars'),
                    knex.raw('COUNT(*) as totalRatings')
                )
                .first() as any

            result.push({
                promptBaseId: item.promptBaseId,
                promptName: latestPrompt.promptName,
                authorName: latestPrompt.authorName,
                executionsLast30Days: Number(item.executionsLast30Days),
                avgStars: ratingStats?.avgStars ? Number(Number(ratingStats.avgStars).toFixed(1)) : null,
                totalRatings: Number(ratingStats?.totalRatings) || 0
            })
        }

        return result
    }

    /**
     * Retorna os top usuários por execuções nos últimos 30 dias
     */
    static async getTopUsers(limit: number = 5): Promise<mysqlTypes.TopUserItem[]> {
        if (!knex) return []

        const dateLimit = new Date()
        dateLimit.setDate(dateLimit.getDate() - STATS_CONFIG.PERIODO_TRENDING_DIAS)

        const users = await knex('ia_user_daily_usage as d')
            .join('ia_user as u', 'u.id', 'd.user_id')
            .leftJoin('ia_court as c', 'c.id', 'u.court_id')
            .where('d.usage_date', '>=', dateLimit.toISOString().split('T')[0])
            .groupBy('u.id', 'u.name', 'u.username', 'c.sigla')
            .select(
                'u.id as userId',
                'u.name',
                'u.username',
                'c.sigla as courtSigla',
                knex.raw('SUM(d.usage_count) as "totalExecutions"')
            )
            .orderByRaw('SUM(d.usage_count) DESC')
            .limit(limit)

        return users.map((u: any) => ({
            userId: u.userId,
            name: u.name || u.username,
            username: u.username,
            courtSigla: u.courtSigla,
            totalExecutions: Number(u.totalExecutions)
        }))
    }

    /**
     * Retorna todas as estatísticas globais
     */
    static async getGlobalStats(): Promise<mysqlTypes.GlobalStats> {
        const [totalExecutions, totalActiveUsers, totalCourts, courtRanking, topContributors, topUsers, trendingPrompts] = await Promise.all([
            this.getTotalExecutions(),
            this.getTotalActiveUsers(),
            this.getTotalCourts(),
            this.getCourtRanking(),
            this.getTopContributors(),
            this.getTopUsers(),
            this.getTrendingPrompts()
        ])

        const totalHoursSaved = (totalExecutions * STATS_CONFIG.TEMPO_MEDIO_ECONOMIA_POR_EXECUCAO_MINUTOS) / 60

        return {
            totalExecutions,
            totalHoursSaved: Number(totalHoursSaved.toFixed(1)),
            totalActiveUsers,
            totalCourts,
            courtRanking,
            topContributors,
            topUsers,
            trendingPrompts
        }
    }

    // ==================== ESTATÍSTICAS DO USUÁRIO ====================

    /**
     * Retorna o total de execuções do usuário
     */
    static async getUserTotalExecutions(userId: number): Promise<number> {
        if (!knex) return 0
        const result = await knex('ia_user_daily_usage')
            .where('user_id', userId)
            .sum('usage_count as total')
            .first()
        return Number(result?.total) || 0
    }

    /**
     * Retorna o número de prompts criados pelo usuário (públicos/padrão)
     */
    static async getUserPromptsCreatedCount(userId: number): Promise<number> {
        if (!knex) return 0
        const result = await knex('ia_prompt')
            .where('created_by', userId)
            .where('is_latest', 1)
            .whereIn('share', ['PUBLICO', 'PADRAO'])
            .count('id as count')
            .first()
        return Number(result?.count) || 0
    }

    /**
     * Retorna quantas vezes os prompts do usuário foram executados por terceiros
     */
    static async getUserCommunityUsageCount(userId: number): Promise<number> {
        if (!knex) return 0

        // Buscar IDs dos prompts do usuário
        const userPrompts = await knex('ia_prompt')
            .where('created_by', userId)
            .where('is_latest', 1)
            .select('id')

        if (userPrompts.length === 0) return 0

        // Contar execuções por outros usuários
        let total = 0
        for (const prompt of userPrompts) {
            const count = await knex('ia_generation')
                .where('prompt', `prompt-${prompt.id}`)
                .whereNot('created_by', userId)
                .count('id as count')
                .first()
            total += Number(count?.count) || 0
        }

        return total
    }

    /**
     * Retorna execuções do usuário por mês (últimos 6 meses)
     */
    static async getUserExecutionsByMonth(userId: number, months: number = 6): Promise<mysqlTypes.MonthlyExecutionItem[]> {
        if (!knex) return []

        const dateLimit = new Date()
        dateLimit.setMonth(dateLimit.getMonth() - months)

        const results = await knex('ia_user_daily_usage')
            .where('user_id', userId)
            .andWhere('usage_date', '>=', dateLimit.toISOString().split('T')[0])
            .select(
                knex.raw('EXTRACT(YEAR FROM usage_date) as "year"'),
                knex.raw('EXTRACT(MONTH FROM usage_date) as "month"'),
                knex.raw('SUM(usage_count) as "count"')
            )
            .groupByRaw('EXTRACT(YEAR FROM usage_date), EXTRACT(MONTH FROM usage_date)')
            .orderByRaw('EXTRACT(YEAR FROM usage_date) ASC, EXTRACT(MONTH FROM usage_date) ASC') as any[]

        return results.map(r => ({
            year: Number(r.year),
            month: Number(r.month),
            count: Number(r.count)
        }))
    }

    /**
     * Verifica os badges do usuário
     */
    static async getUserBadges(userId: number): Promise<mysqlTypes.UserBadges> {
        if (!knex) {
            return {
                inicipiante: false,
                powerUser: false,
                criador: false,
                influenciador: false,
                cincoEstrelas: false,
                curador: false,
                popular: false
            }
        }

        // Badge: Iniciante - Executou pelo menos 1 prompt
        const hasExecution = await knex('ia_user_daily_usage')
            .where('user_id', userId)
            .first()
        const inicipiante = !!hasExecution

        // Badge: Power User - 100+ execuções
        const totalExec = await this.getUserTotalExecutions(userId)
        const powerUser = totalExec >= STATS_CONFIG.MIN_EXECUCOES_POWER_USER

        // Badge: Criador - Criou pelo menos 1 prompt público
        const hasPublicPrompt = await knex('ia_prompt')
            .where('created_by', userId)
            .where('is_latest', 1)
            .whereIn('share', ['PUBLICO', 'PADRAO'])
            .first()
        const criador = !!hasPublicPrompt

        // Badge: Influenciador - Prompts executados 50+ vezes por terceiros
        const communityUsage = await this.getUserCommunityUsageCount(userId)
        const influenciador = communityUsage >= STATS_CONFIG.MIN_EXECUCOES_INFLUENCIADOR

        // Badge: Cinco Estrelas - Recebeu avaliação 5 estrelas
        const hasFiveStars = await knex('ia_prompt_rating as r')
            .join('ia_prompt as p', 'p.base_id', 'r.prompt_base_id')
            .where('p.created_by', userId)
            .where('r.stars', 5)
            .first()
        const cincoEstrelas = !!hasFiveStars

        // Badge: Curador - Avaliou 20+ prompts da comunidade
        const ratingsGiven = await knex('ia_prompt_rating')
            .where('user_id', userId)
            .count('id as count')
            .first()
        const curador = Number(ratingsGiven?.count) >= STATS_CONFIG.MIN_AVALIACOES_CURADOR

        // Badge: Popular - Prompt favoritado por 10+ pessoas
        const userPromptBaseIds = await knex('ia_prompt')
            .where('created_by', userId)
            .where('is_latest', 1)
            .select('base_id')

        let popular = false
        if (userPromptBaseIds.length > 0) {
            const baseIds = userPromptBaseIds.map(p => p.base_id).filter(Boolean)
            if (baseIds.length > 0) {
                const favoriteCount = await knex('ia_favorite')
                    .whereIn('prompt_id', baseIds)
                    .select('prompt_id')
                    .groupBy('prompt_id')
                    .havingRaw('COUNT(*) >= ?', [STATS_CONFIG.MIN_FAVORITOS_POPULAR])
                    .first()
                popular = !!favoriteCount
            }
        }

        return {
            inicipiante,
            powerUser,
            criador,
            influenciador,
            cincoEstrelas,
            curador,
            popular
        }
    }

    /**
     * Retorna estatísticas dos prompts criados pelo usuário
     */
    static async getMyPromptsStats(userId: number): Promise<mysqlTypes.MyPromptStatsItem[]> {
        if (!knex) return []

        // Buscar prompts do usuário
        const userPrompts = await knex('ia_prompt')
            .where('created_by', userId)
            .where('is_latest', 1)
            .whereIn('share', ['PUBLICO', 'PADRAO'])
            .select('id', 'base_id', 'name')

        const result: mysqlTypes.MyPromptStatsItem[] = []

        for (const prompt of userPrompts) {
            // Contar execuções por outros
            const execCount = await knex('ia_generation')
                .where('prompt', `prompt-${prompt.id}`)
                .whereNot('created_by', userId)
                .count('id as count')
                .first()

            // Buscar ratings
            const ratingStats = await knex('ia_prompt_rating')
                .where('prompt_base_id', prompt.base_id)
                .select(
                    knex.raw('AVG(stars) as avgStars'),
                    knex.raw('COUNT(*) as totalRatings')
                )
                .first() as any

            result.push({
                promptBaseId: prompt.base_id,
                promptName: prompt.name,
                executionsByOthers: Number(execCount?.count) || 0,
                avgStars: ratingStats?.avgStars ? Number(Number(ratingStats.avgStars).toFixed(1)) : null,
                totalRatings: Number(ratingStats?.totalRatings) || 0
            })
        }

        return result.sort((a, b) => b.executionsByOthers - a.executionsByOthers)
    }

    /**
     * Retorna todas as estatísticas do usuário
     */
    static async getUserStats(userId: number): Promise<mysqlTypes.UserStats> {
        const [totalExecutions, promptsCreatedCount, communityUsageCount, executionsByMonth, badges, myPromptsStats] = await Promise.all([
            this.getUserTotalExecutions(userId),
            this.getUserPromptsCreatedCount(userId),
            this.getUserCommunityUsageCount(userId),
            this.getUserExecutionsByMonth(userId),
            this.getUserBadges(userId),
            this.getMyPromptsStats(userId)
        ])

        const hoursSaved = (totalExecutions * STATS_CONFIG.TEMPO_MEDIO_ECONOMIA_POR_EXECUCAO_MINUTOS) / 60

        return {
            userId,
            totalExecutions,
            hoursSaved: Number(hoursSaved.toFixed(1)),
            promptsCreatedCount,
            communityUsageCount,
            executionsByMonth,
            badges,
            myPromptsStats
        }
    }
}
