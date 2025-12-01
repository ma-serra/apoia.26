import knex from '../lib/db/knex'

async function test() {
    if (!knex) {
        console.log('No knex connection')
        process.exit(1)
    }

    // Check prompts
    const prompts = await knex('ia_prompt')
        .where('is_latest', 1)
        .whereIn('share', ['PUBLICO', 'PADRAO'])
        .select('id', 'base_id', 'name', 'created_by')
        .limit(5)
    console.log('Prompts públicos:', prompts)

    // Check generations format
    const gens = await knex('ia_generation')
        .select('prompt')
        .distinct()
        .where('prompt', 'like', 'prompt-%')
        .limit(10)
    console.log('Generations prompt format:', gens)

    // Check specific prompt execution
    if (prompts.length > 0) {
        const promptId = prompts[0].id
        console.log(`\nChecking executions for prompt-${promptId}:`)
        const execCount = await knex('ia_generation')
            .where('prompt', `prompt-${promptId}`)
            .count('id as count')
            .first()
        console.log('Count:', execCount)

        // Check all executions in last 30 days
        const dateLimit = new Date()
        dateLimit.setDate(dateLimit.getDate() - 30)
        const recentExecs = await knex('ia_generation')
            .where('prompt', 'like', 'prompt-%')
            .where('created_at', '>=', dateLimit)
            .count('id as count')
            .first()
        console.log('Total executions last 30 days:', recentExecs)
    }

    process.exit(0)
}

test().catch(err => {
    console.error(err)
    process.exit(1)
})
