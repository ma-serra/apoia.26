import knex from '../knex'
import * as mysqlTypes from '../mysql-types'

export class ModelDao {
    static async retrieveModels(): Promise<{ id: string, name: string }[]> {
        if (!knex) return []
        const result = await knex('ia_model').select<Array<mysqlTypes.IAModel>>('id', 'name')
        if (!result || result.length === 0) return []
        const records = result.map((record: any) => ({ ...record }))
        return records
    }

    static async retrieveModelById(id: number): Promise<mysqlTypes.IAModel | undefined> {
        if (!knex) return
        const result = await knex('ia_model').select<Array<mysqlTypes.IAModel>>('*').where({ id }).first()
        return result
    }
}
