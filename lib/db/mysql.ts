import { UserDao } from './dao/user.dao'
import { LibraryDao } from './dao/library.dao'
import { BatchDao } from './dao/batch.dao'
import { TestsetDao } from './dao/testset.dao'
import { PromptDao } from './dao/prompt.dao'
import { ModelDao } from './dao/model.dao'
import { TestDao } from './dao/test.dao'
import { RatingDao } from './dao/rating.dao'
import { GenerationDao } from './dao/generation.dao'
import { DocumentDao } from './dao/document.dao'
import { DossierDao } from './dao/dossier.dao'
import { SystemDao } from './dao/system.dao'
import { EnumDao } from './dao/enum.dao'
import * as mysqlTypes from './mysql-types'

export * from './dao/index'

export class Dao {
    // --- User DAO ---
    static getCurrentUserId = UserDao.getCurrentUserId
    static assertIAUserId = UserDao.assertIAUserId
    static addToIAUserDailyUsage = UserDao.addToIAUserDailyUsage
    static retrieveCourtMonthlyUsage = UserDao.retrieveCourtMonthlyUsage
    static retrieveUserMonthlyUsageByCourt = UserDao.retrieveUserMonthlyUsageByCourt
    static retrieveUserDailyUsage = UserDao.retrieveUserDailyUsage
    static assertIAUserDailyUsageId = UserDao.assertIAUserDailyUsageId
    static async retrieveIAUsageReport(params: { processes?: string[], cpfs?: string[], startDate?: string, endDate?: string, groupBy: 'process' | 'user' }): Promise<mysqlTypes.IAUsageReportRow[]> {
        return UserDao.retrieveIAUsageReport(params)
    }

    static async retrieveIAUsageDetail(params: { dossier_code: string, user_cpf?: string, startDate?: string, endDate?: string, isModerator: boolean, currentUserCpf?: string }): Promise<mysqlTypes.IAUsageDetailRow[]> {
        return UserDao.retrieveIAUsageDetail(params)
    }

    // --- Library DAO ---
    static listLibrary = LibraryDao.listLibrary
    static getLibraryById = LibraryDao.getLibraryById
    static getLibrariesByIds = LibraryDao.getLibrariesByIds
    static insertLibrary = LibraryDao.insertLibrary
    static updateLibrary = LibraryDao.updateLibrary
    static deleteLibrary = LibraryDao.deleteLibrary
    static listLibraryExamples = LibraryDao.listLibraryExamples
    static upsertLibraryExample = LibraryDao.upsertLibraryExample
    static deleteLibraryExample = LibraryDao.deleteLibraryExample
    static listLibraryAttachments = LibraryDao.listLibraryAttachments
    static getLibraryAttachmentById = LibraryDao.getLibraryAttachmentById
    static insertLibraryAttachment = LibraryDao.insertLibraryAttachment
    static deleteLibraryAttachment = LibraryDao.deleteLibraryAttachment
    static countLibraryAttachments = LibraryDao.countLibraryAttachments
    static async listLibraryHeaders(): Promise<Omit<mysqlTypes.IALibrary, 'content_markdown' | 'content_binary'>[]> {
        return LibraryDao.listLibraryHeaders()
    }

    static async listLibraryForPrompt(ids?: number[]): Promise<Omit<mysqlTypes.IALibrary, 'content_binary'>[]> {
        return LibraryDao.listLibraryForPrompt(ids)
    }

    static getLibraryAttachmentsText = LibraryDao.getLibraryAttachmentsText

    // --- Batch DAO ---
    static rewriteBatchFixIndexMap = BatchDao.rewriteBatchFixIndexMap
    static listBatchFixIndexMap = BatchDao.listBatchFixIndexMap
    static retrieveByBatchIdAndEnumId = BatchDao.retrieveByBatchIdAndEnumId
    static retrieveCountByBatchIdAndEnumId = BatchDao.retrieveCountByBatchIdAndEnumId
    static retrieveGenerationByBatchDossierId = BatchDao.retrieveGenerationByBatchDossierId
    static assertIABatchId = BatchDao.assertIABatchId
    static assertIABatchDossierId = BatchDao.assertIABatchDossierId
    static deleteIABatchDossierId = BatchDao.deleteIABatchDossierId
    static insertIABatchDossierItem = BatchDao.insertIABatchDossierItem
    static assertIABatchDossierEnumItemId = BatchDao.assertIABatchDossierEnumItemId
    static async createBatchWithJobs(params: { name: string, tipo_de_sintese?: string | null, prompt_base_id?: number | null, complete: boolean, numbers: string[] }): Promise<mysqlTypes.IABatch> {
        return BatchDao.createBatchWithJobs(params)
    }

    static async getErrorsCsv(batch_id: number): Promise<string> {
        return BatchDao.getErrorsCsv(batch_id)
    }

    static async deleteJobs(batch_id: number, numbers: string[]): Promise<number> {
        return BatchDao.deleteJobs(batch_id, numbers)
    }

    static async assertBatchOwnership(batch_id: number): Promise<boolean> {
        return BatchDao.assertBatchOwnership(batch_id)
    }

    static async listBatchesForUser(): Promise<mysqlTypes.IABatchSummary[]> {
        return BatchDao.listBatchesForUser()
    }

    static async getBatchSummary(batch_id: number): Promise<mysqlTypes.IABatchSummary | undefined> {
        return BatchDao.getBatchSummary(batch_id)
    }

    static async listBatchJobs(batch_id: number, status?: mysqlTypes.IABatchJob['status'] | 'all', page?: number, pageSize: number = 10000): Promise<mysqlTypes.IABatchJob[]> {
        return BatchDao.listBatchJobs(batch_id, status, page, pageSize)
    }

    static async addJobs(batch_id: number, numbers: string[]): Promise<number> {
        return BatchDao.addJobs(batch_id, numbers)
    }

    static async retryJob(batch_id: number, job_id: number): Promise<void> {
        return BatchDao.retryJob(batch_id, job_id)
    }

    static async retryAllErrors(batch_id: number): Promise<number> {
        return BatchDao.retryAllErrors(batch_id)
    }

    static async stopJob(batch_id: number, job_id: number): Promise<void> {
        return BatchDao.stopJob(batch_id, job_id)
    }

    static async backfillJobCost(batch_id: number, job_id: number, dossier_code: string): Promise<number | null> {
        return BatchDao.backfillJobCost(batch_id, job_id, dossier_code)
    }

    static async deleteBatch(batch_id: number): Promise<boolean> {
        return BatchDao.deleteBatch(batch_id)
    }

    static async setBatchPaused(batch_id: number, paused: boolean): Promise<void> {
        return BatchDao.setBatchPaused(batch_id, paused)
    }

    static stepBatch = BatchDao.stepBatch

    // --- Testset DAO ---
    static insertIATestset = TestsetDao.insertIATestset
    static setOfficialTestset = TestsetDao.setOfficialTestset
    static removeOfficialTestset = TestsetDao.removeOfficialTestset
    static retrieveTestsetById = TestsetDao.retrieveTestsetById
    static retrieveTestsetsByKind = TestsetDao.retrieveTestsetsByKind
    static retrieveOfficialTestsetsIdsAndNamesByKind = TestsetDao.retrieveOfficialTestsetsIdsAndNamesByKind
    static retrieveTestsetsByKindAndSlug = TestsetDao.retrieveTestsetsByKindAndSlug

    // --- Prompt DAO ---
    static addInternalPrompt = PromptDao.addInternalPrompt
    static removeInternalPrompt = PromptDao.removeInternalPrompt
    static retrieveLatestSeededPrompts = PromptDao.retrieveLatestSeededPrompts
    static insertIAPrompt = PromptDao.insertIAPrompt
    static setOfficialPrompt = PromptDao.setOfficialPrompt
    static removeOfficialPrompt = PromptDao.removeOfficialPrompt
    static removeLatestPrompt = PromptDao.removeLatestPrompt
    static retrievePromptById = PromptDao.retrievePromptById
    static retrieveLatestPromptByBaseId = PromptDao.retrieveLatestPromptByBaseId
    static retrieveFavoriteLatestPromptsForCurrentUser = PromptDao.retrieveFavoriteLatestPromptsForCurrentUser
    static retrieveCountersByPromptKinds = PromptDao.retrieveCountersByPromptKinds
    static retrievePromptsByKind = PromptDao.retrievePromptsByKind
    static retrievePromptsIdsAndNamesByKind = PromptDao.retrievePromptsIdsAndNamesByKind
    static retrieveOfficialPromptsIdsAndNamesByKind = PromptDao.retrieveOfficialPromptsIdsAndNamesByKind
    static setFavorite = PromptDao.setFavorite
    static resetFavorite = PromptDao.resetFavorite
    static setPrivate = PromptDao.setPrivate
    static setUnlisted = PromptDao.setUnlisted
    static setPublic = PromptDao.setPublic
    static setStandard = PromptDao.setStandard
    static retrieveOfficialPrompts = PromptDao.retrieveOfficialPrompts
    static retrieveLatestPrompts = PromptDao.retrieveLatestPrompts
    static retrievePromptsByKindAndSlug = PromptDao.retrievePromptsByKindAndSlug
    static dehydratatePromptContent = PromptDao.dehydratatePromptContent
    static hydratatePromptContent = PromptDao.hydratatePromptContent
    static async retrievePromptUsageReport(params: { court_id?: number, startDate?: string, endDate?: string }): Promise<mysqlTypes.PromptUsageReportRow[]> {
        return PromptDao.retrievePromptUsageReport(params)
    }

    static async retrievePromptUsageDetail(params: { prompt_key: string, month: number, year: number, court_id?: number }): Promise<mysqlTypes.PromptUsageDetailRow[]> {
        return PromptDao.retrievePromptUsageDetail(params)
    }

    // --- Model DAO ---
    static retrieveModels = ModelDao.retrieveModels
    static retrieveModelById = ModelDao.retrieveModelById

    // --- Test DAO ---
    static retrieveRanking = TestDao.retrieveRanking
    static insertIATest = TestDao.insertIATest
    static retrieveTestByTestsetIdPromptIdAndModelId = TestDao.retrieveTestByTestsetIdPromptIdAndModelId

    // --- Rating DAO ---
    static upsertPromptRating = RatingDao.upsertPromptRating
    static getUserPromptRating = RatingDao.getUserPromptRating
    static deletePromptRating = RatingDao.deletePromptRating
    static getPromptRatings = RatingDao.getPromptRatings
    static getPromptRatingStats = RatingDao.getPromptRatingStats
    static getAllPromptRatingStats = RatingDao.getAllPromptRatingStats
    static getPromptRatingDistribution = RatingDao.getPromptRatingDistribution

    // --- Generation DAO ---
    static retrieveIAGeneration = GenerationDao.retrieveIAGeneration
    static insertIAGeneration = GenerationDao.insertIAGeneration
    static evaluateIAGeneration = GenerationDao.evaluateIAGeneration
    static async retrieveAIGenerationsReport(params: { court_id?: number, startDate?: string, endDate?: string, limit?: number }): Promise<mysqlTypes.AIGenerationReportRow[]> {
        return GenerationDao.retrieveAIGenerationsReport(params)
    }

    // --- Document DAO ---
    static assertIADocumentId = DocumentDao.assertIADocumentId
    static updateDocumentContent = DocumentDao.updateDocumentContent
    static updateDocumentCategory = DocumentDao.updateDocumentCategory
    static verifyIfDossierHasDocumentsWithPredictedCategories = DocumentDao.verifyIfDossierHasDocumentsWithPredictedCategories
    static retrieveDocument = DocumentDao.retrieveDocument

    // --- Dossier DAO ---
    static assertIADossierId = DossierDao.assertIADossierId

    // --- System DAO ---
    static assertSystemId = SystemDao.assertSystemId

    // --- Enum DAO ---
    static assertIAEnumId = EnumDao.assertIAEnumId
    static assertIAEnumItemId = EnumDao.assertIAEnumItemId
    static retrieveEnumItems = EnumDao.retrieveEnumItems
    static updateIAEnumItemDescrMain = EnumDao.updateIAEnumItemDescrMain
}
