import knex from '../knex'
import * as mysqlTypes from '../mysql-types'
import { UserDao } from './user.dao'
import { PublicError } from '../../utils/public-error'
import { envString } from '../../utils/env'

export class RatingDao {
    /**
     * Insere ou atualiza o rating de um prompt pelo usuário atual
     */
    static async upsertPromptRating(prompt_base_id: number, stars: number): Promise<void> {
        const userId = await UserDao.getCurrentUserId()
        
        if (stars < 1 || stars > 5) {
            throw new PublicError('Rating deve estar entre 1 e 5 estrelas')
        }

        // Verifica o tipo de banco de dados
        const dbClient = envString('DB_CLIENT')
        
        if (dbClient === 'pg') {
            // PostgreSQL: usa ON CONFLICT
            await knex.raw(`
                INSERT INTO ia_prompt_rating (prompt_base_id, user_id, stars)
                VALUES (?, ?, ?)
                ON CONFLICT (prompt_base_id, user_id)
                DO UPDATE SET stars = EXCLUDED.stars, updated_at = CURRENT_TIMESTAMP
            `, [prompt_base_id, userId, stars])
        } else {
            // MySQL: usa ON DUPLICATE KEY UPDATE
            await knex.raw(`
                INSERT INTO ia_prompt_rating (prompt_base_id, user_id, stars)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE stars = VALUES(stars), updated_at = CURRENT_TIMESTAMP
            `, [prompt_base_id, userId, stars])
        }
    }

    /**
     * Retorna o rating do usuário atual para um prompt
     */
    static async getUserPromptRating(prompt_base_id: number): Promise<mysqlTypes.IAPromptRating | undefined> {
        const userId = await UserDao.getCurrentUserId()
        const result = await knex('ia_prompt_rating')
            .select('*')
            .where({ prompt_base_id, user_id: userId })
            .first()
        return result
    }

    /**
     * Remove o rating do usuário atual para um prompt
     */
    static async deletePromptRating(prompt_base_id: number): Promise<boolean> {
        const userId = await UserDao.getCurrentUserId()
        const deleted = await knex('ia_prompt_rating')
            .where({ prompt_base_id, user_id: userId })
            .delete()
        return deleted > 0
    }

    /**
     * Retorna todos os ratings de um prompt
     */
    static async getPromptRatings(prompt_base_id: number): Promise<mysqlTypes.IAPromptRating[]> {
        const results = await knex('ia_prompt_rating')
            .select('*')
            .where({ prompt_base_id })
            .orderBy('created_at', 'desc')
        return results
    }

    /**
     * Calcula as estatísticas de rating de um prompt
     * 
     * Fórmulas:
     * - avg_laplace: Laplace smoothing = (sum + 2.5) / (count + 1)
     * - wilson_score: Lower bound of Wilson score confidence interval for rating
     */
    static async getPromptRatingStats(prompt_base_id: number): Promise<mysqlTypes.IAPromptRatingStats | null> {
        const result = await knex('ia_prompt_rating')
            .where({ prompt_base_id })
            .select(
                knex.raw('COUNT(*) as voter_count'),
                knex.raw('AVG(stars) as avg_rating'),
                knex.raw('SUM(stars) as sum_stars')
            )
            .first() as any

        if (!result || result.voter_count === 0) {
            return null
        }

        const voterCount = Number(result.voter_count)
        const avgRating = Number(result.avg_rating)
        const sumStars = Number(result.sum_stars)

        // Laplace smoothing: adiciona uma pseudo-contagem para estabilizar ratings com poucos votos
        // Assume que um voto "neutro" seria 2.5 (meio de 1-5)
        const avgLaplace = (sumStars + 2.5) / (voterCount + 1)

        // Wilson score: intervalo de confiança inferior para proporção binomial
        // Convertemos rating 1-5 para proporção 0-1: (rating - 1) / 4
        // Então calculamos o lower bound do intervalo de confiança de 95%
        const wilsonScore = RatingDao.calculateWilsonScore(avgRating, voterCount)

        return {
            prompt_base_id,
            voter_count: voterCount,
            avg_laplace: Number(avgLaplace.toFixed(2)),
            wilson_score: Number(wilsonScore.toFixed(2))
        }
    }

    /**
     * Calcula as estatísticas de rating para todos os prompts que têm ratings
     */
    static async getAllPromptRatingStats(): Promise<mysqlTypes.IAPromptRatingStats[]> {
        const results = await knex('ia_prompt_rating')
            .groupBy('prompt_base_id')
            .select(
                'prompt_base_id',
                knex.raw('COUNT(*) as voter_count'),
                knex.raw('AVG(stars) as avg_rating'),
                knex.raw('SUM(stars) as sum_stars')
            ) as any[]

        return results.map(result => {
            const voterCount = Number(result.voter_count)
            const avgRating = Number(result.avg_rating)
            const sumStars = Number(result.sum_stars)

            const avgLaplace = (sumStars + 2.5) / (voterCount + 1)
            const wilsonScore = RatingDao.calculateWilsonScore(avgRating, voterCount)

            return {
                prompt_base_id: result.prompt_base_id,
                voter_count: voterCount,
                avg_laplace: Number(avgLaplace.toFixed(2)),
                wilson_score: Number(wilsonScore.toFixed(2))
            }
        })
    }

    /**
     * Calcula o Wilson score para um rating
     * Referência: https://www.evanmiller.org/how-not-to-sort-by-average-rating.html
     * 
     * @param avgRating média de 1 a 5
     * @param n número de votos
     */
    private static calculateWilsonScore(avgRating: number, n: number): number {
        if (n === 0) return 0

        // Converte rating 1-5 para proporção 0-1
        const p = (avgRating - 1) / 4
        
        // z = 1.96 para 95% de confiança
        const z = 1.96
        const z2 = z * z
        
        // Fórmula do Wilson score
        const denominator = 1 + z2 / n
        const centerAdjusted = p + z2 / (2 * n)
        const adjustedStdDev = Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)
        
        const lowerBound = (centerAdjusted - z * adjustedStdDev) / denominator
        
        // Converte de volta para escala 1-5
        return lowerBound * 4 + 1
    }

    /**
     * Retorna a distribuição de votos por estrelas para um prompt
     */
    static async getPromptRatingDistribution(prompt_base_id: number): Promise<{ [key: number]: number }> {
        const results = await knex('ia_prompt_rating')
            .where({ prompt_base_id })
            .select('stars', knex.raw('COUNT(*) as count'))
            .groupBy('stars') as any[]

        const distribution: { [key: number]: number } = {
            5: 0, 4: 0, 3: 0, 2: 0, 1: 0
        }

        results.forEach(row => {
            distribution[row.stars] = Number(row.count)
        })

        return distribution
    }
}
