import knex from '../knex'
import * as mysqlTypes from '../mysql-types'
import { getId } from './utils'

export class SystemDao {
    static async assertSystemId(code?: string): Promise<number> {
        if (!knex) return 0
        if (!code) {
            return 0
        }
        const item = await knex('ia_system').select<mysqlTypes.IASystem>('id').where('code', code).first()
        if (item) {
            return item.id
        } else {
            const [result] = await knex('ia_system').insert({ code }).returning('id')
            return getId(result)
        }
    }
}
