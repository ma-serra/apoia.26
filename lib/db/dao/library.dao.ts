import knex from '../knex'
import * as mysqlTypes from '../mysql-types'
import { UserDao } from './user.dao'
import { getId } from './utils'

export class LibraryDao {
    static async listLibrary(): Promise<mysqlTypes.IALibrary[]> {
        const userId = await UserDao.getCurrentUserId()
        const rows = await knex('ia_library').select('*').where({ user_id: userId }).orderBy('created_at', 'desc')
        return rows
    }

    static async listLibraryHeaders(): Promise<Omit<mysqlTypes.IALibrary, 'content_markdown' | 'content_binary'>[]> {
        const userId = await UserDao.getCurrentUserId()
        const rows = await knex('ia_library')
            .select('id', 'user_id', 'kind', 'model_subtype', 'title', 'content_type', 'inclusion', 'context', 'created_at', 'created_by')
            .where({ user_id: userId })
            .orderBy('created_at', 'desc')
        return rows
    }

    static async listLibraryForPrompt(ids?: number[]): Promise<Omit<mysqlTypes.IALibrary, 'content_binary'>[]> {
        const userId = await UserDao.getCurrentUserId()
        const query = knex('ia_library')
            .select('id', 'user_id', 'kind', 'model_subtype', 'title', 'content_type', 'content_markdown', 'inclusion', 'context', 'created_at', 'created_by')
            .where({ user_id: userId })
            .whereNotNull('content_markdown')
            .where('content_markdown', '!=', '')

        if (ids !== undefined) {
            query.where(builder => {
                if (ids.length > 0) {
                    builder.whereIn('id', ids)
                }
                builder.orWhere('inclusion', mysqlTypes.IALibraryInclusion.CONTEXTUAL)
            })
        } else {
            query.whereIn('inclusion', [mysqlTypes.IALibraryInclusion.SIM, mysqlTypes.IALibraryInclusion.CONTEXTUAL])
        }

        query.orderBy('created_at', 'desc')
        return await query
    }

    static async getLibraryById(id: number): Promise<mysqlTypes.IALibrary | undefined> {
        const userId = await UserDao.getCurrentUserId()
        const row = await knex('ia_library').select('*').where({ id, user_id: userId }).first()
        return row
    }

    static async getLibrariesByIds(ids: number[]): Promise<mysqlTypes.IALibrary[]> {
        const userId = await UserDao.getCurrentUserId()
        const rows = await knex('ia_library').select('*').where({ user_id: userId }).whereIn('id', ids)
        return rows
    }

    static async insertLibrary(data: mysqlTypes.IALibraryToInsert): Promise<number> {
        const userId = await UserDao.getCurrentUserId()
        const [ret] = await knex('ia_library').insert({
            user_id: userId,
            kind: data.kind,
            title: data.title,
            content_type: data.content_type ?? null,
            content_markdown: data.content_markdown ?? null,
            content_binary: data.content_binary ?? null,
            model_subtype: data.model_subtype ?? null,
            inclusion: data.inclusion ?? mysqlTypes.IALibraryInclusion.NAO,
            context: data.context ?? null,
            created_by: userId,
        }).returning('id')
        return getId(ret)
    }

    static async updateLibrary(id: number, patch: Partial<mysqlTypes.IALibraryToInsert>): Promise<boolean> {
        const userId = await UserDao.getCurrentUserId()
        const upd = await knex('ia_library').update({
            ...(patch.kind ? { kind: patch.kind } : {}),
            ...(patch.title !== undefined ? { title: patch.title } : {}),
            ...(patch.content_type !== undefined ? { content_type: patch.content_type } : {}),
            ...(patch.content_markdown !== undefined ? { content_markdown: patch.content_markdown } : {}),
            ...(patch.content_binary !== undefined ? { content_binary: patch.content_binary } : {}),
            ...(patch.model_subtype !== undefined ? { model_subtype: patch.model_subtype } : {}),
            ...(patch.inclusion !== undefined ? { inclusion: patch.inclusion } : {}),
            ...(patch.context !== undefined ? { context: patch.context } : {}),
        }).where({ id, user_id: userId })
        return upd > 0
    }

    static async deleteLibrary(id: number): Promise<boolean> {
        const userId = await UserDao.getCurrentUserId()
        const del = await knex('ia_library').delete().where({ id, user_id: userId })
        return del > 0
    }

    static async listLibraryExamples(library_id: number): Promise<mysqlTypes.IALibraryExample[]> {
        const userId = await UserDao.getCurrentUserId()
        // validate ownership
        const lib = await knex('ia_library').select('id').where({ id: library_id, user_id: userId }).first()
        if (!lib) return []
        const rows = await knex('ia_library_example').select('*').where({ library_id }).orderBy('created_at', 'desc')
        return rows
    }

    static async upsertLibraryExample(library_id: number, example: Omit<mysqlTypes.IALibraryExample, 'id' | 'created_at' | 'created_by' | 'library_id'>): Promise<void> {
        const userId = await UserDao.getCurrentUserId()
        const insertData: any = {
            library_id,
            process_number: example.process_number,
            event_number: ('event_number' in (example as any)) ? (example as any).event_number ?? null : null,
            piece_type: example.piece_type,
            piece_id: example.piece_id,
            piece_title: example.piece_title,
            piece_date: example.piece_date,
            content_markdown: example.content_markdown,
            created_by: userId,
        }
        const mergeData: any = {
            piece_type: example.piece_type,
            piece_id: example.piece_id,
            piece_title: example.piece_title,
            piece_date: example.piece_date,
            content_markdown: example.content_markdown,
        }
        if ('event_number' in (example as any)) mergeData.event_number = (example as any).event_number ?? null
        await knex('ia_library_example').insert(insertData).onConflict(['library_id', 'process_number']).merge(mergeData)
    }

    static async deleteLibraryExample(library_id: number, process_number: string): Promise<boolean> {
        const userId = await UserDao.getCurrentUserId()
        const lib = await knex('ia_library').select('id').where({ id: library_id, user_id: userId }).first()
        if (!lib) return false
        const del = await knex('ia_library_example').delete().where({ library_id, process_number })
        return del > 0
    }

    // --- Library Attachments DAO ---
    static async listLibraryAttachments(library_id: number): Promise<Omit<mysqlTypes.IALibraryAttachment, 'content_binary'>[]> {
        const userId = await UserDao.getCurrentUserId()
        // validate ownership
        const lib = await knex('ia_library').select('id').where({ id: library_id, user_id: userId }).first()
        if (!lib) return []
        const rows = await knex('ia_library_attachment')
            .select('id', 'library_id', 'filename', 'content_type', 'file_size', 'word_count', 'created_at', 'created_by')
            .where({ library_id })
            .orderBy('created_at', 'desc')
        return rows
    }

    static async getLibraryAttachmentById(id: number, library_id: number): Promise<mysqlTypes.IALibraryAttachment | undefined> {
        const userId = await UserDao.getCurrentUserId()
        // validate ownership
        const lib = await knex('ia_library').select('id').where({ id: library_id, user_id: userId }).first()
        if (!lib) return undefined
        const row = await knex('ia_library_attachment').select('*').where({ id, library_id }).first()
        return row
    }

    static async insertLibraryAttachment(data: mysqlTypes.IALibraryAttachmentToInsert): Promise<number> {
        const userId = await UserDao.getCurrentUserId()
        // validate ownership
        const lib = await knex('ia_library').select('id').where({ id: data.library_id, user_id: userId }).first()
        if (!lib) throw new Error('Library not found or access denied')
        const [ret] = await knex('ia_library_attachment').insert({
            library_id: data.library_id,
            filename: data.filename,
            content_type: data.content_type,
            file_size: data.file_size,
            word_count: data.word_count ?? null,
            content_text: data.content_text ?? null,
            content_binary: data.content_binary,
            created_by: userId,
        }).returning('id')
        return getId(ret)
    }

    static async deleteLibraryAttachment(id: number, library_id: number): Promise<boolean> {
        const userId = await UserDao.getCurrentUserId()
        // validate ownership
        const lib = await knex('ia_library').select('id').where({ id: library_id, user_id: userId }).first()
        if (!lib) return false
        const del = await knex('ia_library_attachment').delete().where({ id, library_id })
        return del > 0
    }

    static async countLibraryAttachments(library_id: number): Promise<number> {
        const userId = await UserDao.getCurrentUserId()
        // validate ownership
        const lib = await knex('ia_library').select('id').where({ id: library_id, user_id: userId }).first()
        if (!lib) return 0
        const result = await knex('ia_library_attachment').count('* as count').where({ library_id }).first()
        return result?.count as number ?? 0
    }

    static async getLibraryAttachmentsText(library_id: number): Promise<Pick<mysqlTypes.IALibraryAttachment, 'filename' | 'content_text'>[]> {
        const userId = await UserDao.getCurrentUserId()
        // validate ownership
        const lib = await knex('ia_library').select('id').where({ id: library_id, user_id: userId }).first()
        if (!lib) return []
        const rows = await knex('ia_library_attachment')
            .select('filename', 'content_text')
            .where({ library_id })
            .whereNotNull('content_text')
        return rows
    }
}
