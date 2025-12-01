import knex from '../knex'
import * as mysqlTypes from '../mysql-types'
import { getId } from './utils'
import { envString } from '../../utils/env'

export class DocumentDao {
    static async assertIADocumentId(dossier_id: number, code: string, assigned_category: string | null): Promise<number> {
        if (!knex) return 0
        let document = await knex('ia_document').select<mysqlTypes.IADocument[]>('id', 'assigned_category').where({ code }).first()
        if (document) {
            if (assigned_category && document.assigned_category !== assigned_category) {
                await knex('ia_document').update({ assigned_category }).where({ id: document.id })
            }
            return document.id
        }
        const [result] = await knex('ia_document').insert<mysqlTypes.IADocument>({
            code,
            dossier_id,
            assigned_category
        }).returning('id')
        return getId(result)
    }

    static async updateDocumentContent(document_id: number, content_source_id: number, content: string) {
        if (!knex) return
        if (envString('DISABLE_DOCUMENT_CACHE') === '1') return
        await knex('ia_document').update({
            content_source_id,
            content: content?.replace(/\u0000/g, ''), // Remove null characters
        }).where({ id: document_id })
    }

    static async updateDocumentCategory(document_id: number, assigned_category: string | null, predicted_category: string | null) {
        if (!knex) return
        await knex('ia_document').update({
            assigned_category,
            predicted_category,
        }).where({ id: document_id })
    }

    static async verifyIfDossierHasDocumentsWithPredictedCategories(dossierCode: string): Promise<boolean> {
        if (!knex) return false
        const result = await knex('ia_dossier as p')
            .join('ia_document as d', 'p.id', '=', 'd.dossier_id')
            .where({ 'p.code': dossierCode })
            .whereNotNull('d.predicted_category')
            .count('* as count').first()
        const total = result?.count as number ?? 0
        return total > 0
    }

    static async retrieveDocument(document_id: number): Promise<mysqlTypes.IADocument | undefined> {
        if (!knex) return
        const result = await knex('ia_document').select<mysqlTypes.IADocument>('*').where('id', document_id).first()
        return result
    }
}
