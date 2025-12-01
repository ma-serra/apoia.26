import knex from '../knex'
import * as mysqlTypes from '../mysql-types'

export class TestDao {
    static async retrieveRanking(kind: string, testset_id?: number, prompt_id?: number, model_id?: number): Promise<mysqlTypes.IARankingType[]> {
        if (!knex) return []
        const sql = knex('ia_test as s')
            .select<Array<mysqlTypes.IARankingType>>(
                's.testset_id',
                't.name as testset_name',
                't.slug as testset_slug',
                's.prompt_id',
                'p.name as prompt_name',
                'p.slug as prompt_slug',
                's.model_id',
                'm.name as model_name',
                's.score'
            )
            .innerJoin('ia_model as m', 's.model_id', 'm.id')
            .innerJoin('ia_prompt as p', 's.prompt_id', 'p.id')
            .innerJoin('ia_testset as t', function () {
                this.on('s.testset_id', '=', 't.id')
            })
            .where(function () {
                this.where('t.kind', '=', kind)
                if (testset_id)
                    this.where('s.testset_id', '=', testset_id)
                if (prompt_id)
                    this.where('s.prompt_id', '=', prompt_id)
                if (model_id)
                    this.where('s.model_id', '=', model_id)
            })
            .orderBy('s.score', 'desc')
        const result = await sql
        return result
    }

    static async insertIATest(test: mysqlTypes.IATest) {
        if (!knex) return
        await knex('ia_test').insert({
            testset_id: test.testset_id,
            prompt_id: test.prompt_id,
            model_id: test.model_id,
            score: test.score,
            content: JSON.stringify(test.content)
        })
    }

    static async retrieveTestByTestsetIdPromptIdAndModelId(testset_id: number, prompt_id: number, model_id: number): Promise<mysqlTypes.IATest | undefined> {
        if (!knex) return
        const result = await knex('ia_test').select<mysqlTypes.IATest>('*').where({
            testset_id, prompt_id, model_id
        }).first()
        return result
    }
}
