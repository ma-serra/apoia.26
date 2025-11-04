import devLog from '../utils/log'
import { Model, FileTypeEnum } from './model-types'

export function checkModelSupportsAudioVideoSync(modelName: string): boolean {
    const details = Object.values(Model).find(m => m.name === modelName)
    devLog('Model details for', modelName, ':', details)
    
    const audioVideoTypes = [
        FileTypeEnum.MP3, FileTypeEnum.MP4, FileTypeEnum.WAV, 
        FileTypeEnum.WMA, FileTypeEnum.WMV, FileTypeEnum.AIFF, 
        FileTypeEnum.AAC, FileTypeEnum.OGG, FileTypeEnum.FLAC
    ]
    
    if (!details) {
        devLog('Model not found:', modelName)
        return false
    }
    
    if (!details.supportedFileTypes) {
        devLog('Model has no supportedFileTypes:', modelName)
        return false
    }
    
    const supports = audioVideoTypes.some(type => details.supportedFileTypes?.includes(type))
    devLog('Model supports audio/video:', supports)
    
    return supports
}

export function checkModelSupportsPdfSync(modelName: string): boolean {
    const details = Object.values(Model).find(m => m.name === modelName)
    return !!details?.supportedFileTypes?.includes(FileTypeEnum.PDF)
}