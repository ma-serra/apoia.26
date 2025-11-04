/**
 * Utilitários para processamento de áudio
 */

import { FileTypeEnum } from '../ai/model-types'

/**
 * Verifica se o tipo de arquivo é um vídeo
 */
export function isVideoFile(fileType: string): boolean {
    const videoTypes = [
        FileTypeEnum.MP4,
        FileTypeEnum.WMV,
    ]
    return videoTypes.includes(fileType as FileTypeEnum)
}

/**
 * Verifica se o tipo de arquivo é áudio
 */
export function isAudioFile(fileType: string): boolean {
    const audioTypes = [
        FileTypeEnum.MP3,
        FileTypeEnum.WMA,
        FileTypeEnum.WAV,
        FileTypeEnum.AIFF,
        FileTypeEnum.AAC,
        FileTypeEnum.OGG,
        FileTypeEnum.FLAC,
    ]
    return audioTypes.includes(fileType as FileTypeEnum)
}

/**
 * Formata bytes para formato legível
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Converte Blob para Data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}

/**
 * Cria um nome de arquivo MP3 baseado no nome original
 */
export function createMp3FileName(originalName: string): string {
    const baseName = originalName.replace(/\.[^/.]+$/, '')
    return `${baseName}.mp3`
}

/**
 * Formata duração em segundos para formato hh:mm:ss
 */
export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    } else {
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
}
