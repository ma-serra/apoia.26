import knex from '../knex'
import { getId } from './utils'

export class DossierDao {
    static async assertIADossierId(code: string, system_id: number, class_code: number, filing_at: Date): Promise<number> {
        if (!knex) return 0
        const result = await knex('ia_dossier').select('id').where({
            code,
            system_id
        }).first()
        if (result) {
            if ((class_code && result.class_code !== class_code) || (filing_at && result.filing_at !== filing_at)) {
                await knex('ia_dossier').update({
                    class_code,
                    filing_at
                }).where({ id: result.id })
            }
            return result.id
        }
        const [dossierResult] = await knex('ia_dossier').insert({
            system_id,
            code,
            class_code,
            filing_at
        }).returning('id')
        return getId(dossierResult)
    }
}
