'use server'

import { PromptDao, ModelDao } from "../db/dao";
import { SelectableItem, SelectableItemWithLatestAndOfficial } from "../db/mysql-types";

export async function loadPrompts(kind: string): Promise<SelectableItemWithLatestAndOfficial[]> {
    return PromptDao.retrievePromptsIdsAndNamesByKind(kind)
}

export async function loadModels(kind: string): Promise<SelectableItem[]> {
    return await ModelDao.retrieveModels()
}