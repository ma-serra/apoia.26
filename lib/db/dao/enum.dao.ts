import knex from '../knex'
import * as mysqlTypes from '../mysql-types'
import { getId } from './utils'

export class EnumDao {
    static async assertIAEnumId(descr: string): Promise<number> {
        if (!knex) return 0
        const iaEnum = await knex('ia_enum').select('id').where({ descr, }).first()
        if (iaEnum) return iaEnum.id
        const [result] = await knex('ia_enum').insert({
            descr,
        }).returning("id")
        return getId(result)
    }

    static async assertIAEnumItemId(descr: string, enum_id: number): Promise<number> {
        if (!knex) return 0
        const iaEnum = await knex('ia_enum_item').select('id').where({ descr, enum_id }).first()
        if (iaEnum) return iaEnum.id
        const [result] = await knex('ia_enum_item').insert({
            descr, enum_id
        }).returning("id")
        return getId(result)
    }

    static async retrieveEnumItems(): Promise<mysqlTypes.IAEnumItem[]> {
        if (!knex) return []
        const result = await knex('ia_enum as e')
            .select<mysqlTypes.IAEnumItem[]>(
                'e.id as enum_id',
                'e.descr as enum_descr',
                'ei.descr as enum_item_descr',
                'ei.hidden as enum_item_hidden',
                'ei2.descr as enum_item_descr_main'
            )
            .innerJoin('ia_enum_item as ei', 'ei.enum_id', 'e.id') // INNER JOIN
            .leftJoin('ia_enum_item as ei2', 'ei2.id', 'ei.enum_item_id_main') // LEFT JOIN
            .orderBy('e.id')
            .orderBy('ei.descr')
        return result
    }

    static async updateIAEnumItemDescrMain(enum_item_id: number, enum_item_descr_main: string | null): Promise<void> {
        if (!knex) return
        await knex('ia_enum_item').update({ enum_item_descr_main }).where({ id: enum_item_id })
    }
}
