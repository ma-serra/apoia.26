/**
 * Extração de áudio de vídeos e conversão para MP3
 * Usa Web Audio API e lamejs para processar e encoding
 * 
 * Conforme documentação oficial do lamejs:
 * https://github.com/zhuker/lamejs#quick-start
 * 
 * O lamejs deve ser carregado via <script> tag no browser
 * O arquivo lame.all.js é copiado do node_modules para public/ via npm script
 */

// Declaração de tipos para o lamejs global
declare global {
    interface Window {
        lamejs?: {
            Mp3Encoder: new (channels: number, sampleRate: number, kbps: number) => {
                encodeBuffer(left: Int16Array, right?: Int16Array): Int8Array
                flush(): Int8Array
            }
        }
    }
}

// Cache do carregamento do script
let lamejsLoadPromise: Promise<void> | null = null

/**
 * Carrega o script lamejs dinamicamente (apenas uma vez)
 * Conforme exemplo da documentação oficial
 */
async function loadLamejs(): Promise<void> {
    // Se já carregou, retorna
    if (typeof window !== 'undefined' && window.lamejs) {
        return
    }
    
    // Se já está carregando, espera
    if (lamejsLoadPromise) {
        return lamejsLoadPromise
    }
    
    // Carrega o script
    lamejsLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = '/lame.min.js' // Versão minificada (70% menor que lame.all.js)
        script.async = true
        
        script.onload = () => {
            if (window.lamejs) {
                resolve()
            } else {
                reject(new Error('lamejs não foi carregado corretamente'))
            }
        }
        
        script.onerror = () => {
            reject(new Error('Falha ao carregar lamejs. Verifique se o arquivo /lame.all.js está acessível.'))
        }
        
        document.head.appendChild(script)
    })
    
    return lamejsLoadPromise
}

export interface AudioExtractionProgress {
    stage: 'loading' | 'decoding' | 'resampling' | 'encoding' | 'complete' | 'error'
    progress: number // 0-100
    message: string
}

export interface AudioExtractionResult {
    mp3Blob: Blob
    mp3DataUrl: string
    sizeBytes: number
    durationSeconds: number
}

/**
 * Extrai áudio de um arquivo de vídeo e converte para MP3
 * @param file Arquivo de vídeo
 * @param onProgress Callback para reportar progresso
 * @param signal AbortSignal para cancelamento
 * @returns Resultado com Blob MP3 e informações
 */
export async function extractAudioToMp3(
    file: File,
    onProgress: (progress: AudioExtractionProgress) => void,
    signal?: AbortSignal
): Promise<AudioExtractionResult> {
    const TARGET_SAMPLE_RATE = 16000
    const CHANNELS = 1 // Mono
    const KBPS = 64

    try {
        // Verificar cancelamento
        if (signal?.aborted) {
            throw new Error('Operação cancelada')
        }

        // Carregar lamejs (apenas na primeira vez)
        await loadLamejs()

        onProgress({ stage: 'loading', progress: 1, message: 'Carregando arquivo...' })

        // Ler arquivo como ArrayBuffer
        let arrayBuffer: ArrayBuffer
        try {
            arrayBuffer = await file.arrayBuffer()
        } catch (err) {
            throw new Error('Erro ao ler o arquivo. O arquivo pode estar corrompido ou inacessível.')
        }

        if (signal?.aborted) {
            throw new Error('Operação cancelada')
        }

        onProgress({ stage: 'decoding', progress: 11, message: 'Decodificando áudio...' })

        // Criar contexto de áudio para decodificar
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        
        // Decodificar o arquivo de vídeo/áudio
        let decodedAudioData: AudioBuffer
        try {
            decodedAudioData = await audioContext.decodeAudioData(arrayBuffer)
        } catch (err) {
            throw new Error(`Não foi possível decodificar o áudio do vídeo. Verifique se o arquivo está corrompido ou se o formato é suportado pelo navegador. Formatos recomendados: MP4, WAV.`)
        }
        
        const duration = decodedAudioData.duration

        if (signal?.aborted) {
            throw new Error('Operação cancelada')
        }

        onProgress({ stage: 'resampling', progress: 21, message: 'Convertendo para mono 16kHz...' })

        // Usar OfflineAudioContext para processar rapidamente
        let offlineContext: OfflineAudioContext
        try {
            offlineContext = new OfflineAudioContext(
                CHANNELS,
                TARGET_SAMPLE_RATE * duration,
                TARGET_SAMPLE_RATE
            )
        } catch (err) {
            throw new Error('Erro ao criar contexto de processamento offline. O arquivo pode ser muito longo ou o navegador não suporta.')
        }

        const source = offlineContext.createBufferSource()
        source.buffer = decodedAudioData
        source.connect(offlineContext.destination)
        source.start()

        // Renderizar (muito rápido, não é em tempo real)
        let renderedBuffer: AudioBuffer
        try {
            renderedBuffer = await offlineContext.startRendering()
        } catch (err) {
            throw new Error('Erro ao processar o áudio. O arquivo pode ser muito grande ou complexo.')
        }

        if (signal?.aborted) {
            throw new Error('Operação cancelada')
        }

        onProgress({ stage: 'encoding', progress: 31, message: 'Gerando MP3...' })

        // Obter dados do canal (já está em mono)
        const channelData = renderedBuffer.getChannelData(0)

        // Converter para Int16Array para lamejs
        const samples = new Int16Array(channelData.length)
        for (let i = 0; i < channelData.length; i++) {
            samples[i] = Math.max(-1, Math.min(1, channelData[i])) * 0x7fff
        }

        // Encoding MP3 com lamejs
        let mp3encoder: any
        try {
            // Obter lamejs do escopo global (já carregado via script)
            if (!window.lamejs) {
                throw new Error('lamejs não está disponível. Tente recarregar a página.')
            }
            
            const lamejs = window.lamejs
            const Mp3Encoder = lamejs.Mp3Encoder
            
            if (!Mp3Encoder) {
                throw new Error('Mp3Encoder não encontrado no lamejs')
            }
            
            // Criar encoder conforme documentação oficial
            mp3encoder = new Mp3Encoder(CHANNELS, TARGET_SAMPLE_RATE, KBPS)
        } catch (err) {
            console.error('Erro detalhado ao inicializar encoder MP3:', {
                error: err,
                errorMessage: err instanceof Error ? err.message : String(err),
                errorStack: err instanceof Error ? err.stack : undefined,
                lamejsAvailable: typeof window !== 'undefined' && !!window.lamejs
            })
            const errorMsg = err instanceof Error ? err.message : String(err)
            throw new Error(`Erro ao inicializar o encoder MP3: ${errorMsg}. Abra o console (F12) para mais detalhes.`)
        }
        
        const mp3Data: Int8Array[] = []
        const sampleBlockSize = 1152 // Tamanho do bloco MP3
        const totalBlocks = Math.ceil(samples.length / sampleBlockSize)
        let processedBlocks = 0

        for (let i = 0; i < samples.length; i += sampleBlockSize) {
            const sampleChunk = samples.subarray(i, i + sampleBlockSize)
            const mp3buf = mp3encoder.encodeBuffer(sampleChunk)
            if (mp3buf.length > 0) {
                mp3Data.push(mp3buf)
            }

            processedBlocks++
            
            // Atualizar progresso a cada 10 blocos para manter a UI responsiva
            if (processedBlocks % 10 === 0 || processedBlocks === totalBlocks) {
                const blockProgress = processedBlocks / totalBlocks
                const encodeProgress = 31 + blockProgress * 68 // 31% a 99% (68% do total)
                
                onProgress({
                    stage: 'encoding',
                    progress: Math.min(encodeProgress, 99),
                    message: `Gerando MP3... ${Math.floor(blockProgress * 100)}%`,
                })
                
                // Pequeno delay a cada 100 blocos para permitir renderização da UI
                if (processedBlocks % 100 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0))
                }
            }

            if (signal?.aborted) {
                throw new Error('Operação cancelada')
            }
        }

        // Flush final
        const mp3buf = mp3encoder.flush()
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf)
        }

        // Criar Blob MP3 - converter arrays para buffer
        const mp3Buffer = new Int8Array(mp3Data.reduce((acc, arr) => acc + arr.length, 0))
        let offset = 0
        for (const arr of mp3Data) {
            mp3Buffer.set(arr, offset)
            offset += arr.length
        }
        const mp3Blob = new Blob([mp3Buffer], { type: 'audio/mpeg' })

        // Converter para Data URL
        const mp3DataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(mp3Blob)
        })

        // Limpar recursos
        audioContext.close()

        onProgress({ stage: 'complete', progress: 100, message: 'Conversão concluída!' })

        return {
            mp3Blob,
            mp3DataUrl,
            sizeBytes: mp3Blob.size,
            durationSeconds: duration,
        }
    } catch (error) {
        // Log detalhado para debugging
        console.error('Erro na conversão de áudio:', {
            error,
            errorName: error instanceof Error ? error.name : 'Unknown',
            errorMessage: error instanceof Error ? error.message : String(error),
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            timestamp: new Date().toISOString()
        })
        
        let errorMessage = 'Erro desconhecido'
        
        if (error instanceof Error) {
            // Mapear erros comuns para mensagens amigáveis
            if (error.name === 'ReferenceError' && error.message.includes('MPEGMode')) {
                errorMessage = 'Erro ao carregar a biblioteca de conversão MP3. Por favor, recarregue a página e tente novamente.'
            } else if (error.name === 'EncodingError' || error.message.includes('decodeAudioData')) {
                errorMessage = 'Arquivo de vídeo corrompido ou formato não suportado. Tente converter o vídeo para MP4 primeiro.'
            } else if (error.message.includes('cancelada')) {
                errorMessage = ''
            } else if (error.message.includes('memory') || error.message.includes('allocation')) {
                errorMessage = 'Arquivo muito grande para processar. Tente um vídeo menor ou com qualidade reduzida.'
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = 'Erro de rede ao carregar o arquivo. Verifique sua conexão.'
            } else if (error.message.includes('encoder MP3')) {
                errorMessage = error.message
            } else {
                // Usar mensagem original do erro se for descritiva
                errorMessage = `${error.name}: ${error.message}`
            }
        }
        
        onProgress({
            stage: 'error',
            progress: 0,
            message: errorMessage,
        })
        
        // Re-throw com mensagem melhorada
        const enhancedError = new Error(errorMessage)
        enhancedError.name = error instanceof Error ? error.name : 'ConversionError'
        throw enhancedError
    }
}
