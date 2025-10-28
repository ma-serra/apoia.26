'use client'

import { useState, useRef, useEffect } from 'react'
import AiContent from '@/components/ai-content'
import { Button, Alert } from 'react-bootstrap'
import { getInternalPrompt } from '@/lib/ai/prompt'
import { VisualizationEnum } from '@/lib/ui/preprocess'
import { FileTypeEnum } from '@/lib/ai/model-types'
import { checkModelSupportsAudioVideoSync } from '@/lib/ai/model-validation'

// Formatos de áudio e vídeo suportados
const SUPPORTED_AUDIO_VIDEO_TYPES = [
    FileTypeEnum.MP3,
    FileTypeEnum.MP4,
    FileTypeEnum.WMA,
    FileTypeEnum.WMV,
    FileTypeEnum.WAV,
    FileTypeEnum.AIFF,
    FileTypeEnum.AAC,
    FileTypeEnum.OGG,
    FileTypeEnum.FLAC,
]

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export default function TranscriptionPage({ model }: { model: string }) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [fileDataUrl, setFileDataUrl] = useState<string | null>(null)
    const [fileError, setFileError] = useState<string | null>(null)
    const [hidden, setHidden] = useState(true)
    const [modelSupportsFiles, setModelSupportsFiles] = useState<boolean>(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const convertFileToDataUrl = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(file)
        })
    }

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) {
            setSelectedFile(null)
            setFileDataUrl(null)
            setFileError(null)
            return
        }

        // Validar tipo de arquivo
        if (!SUPPORTED_AUDIO_VIDEO_TYPES.includes(file.type as FileTypeEnum)) {
            setFileError(`Tipo de arquivo não suportado: ${file.type}. Formatos aceitos: MP3, MP4, WAV, WMA, WMV, AIFF, AAC, OGG, FLAC`)
            setSelectedFile(null)
            setFileDataUrl(null)
            return
        }

        // Validar tamanho do arquivo
        if (file.size > MAX_FILE_SIZE) {
            setFileError(`Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(1)}MB. Máximo permitido: 100MB`)
            setSelectedFile(null)
            setFileDataUrl(null)
            return
        }

        try {
            const dataUrl = await convertFileToDataUrl(file)
            setFileError(null)
            setSelectedFile(file)
            setFileDataUrl(dataUrl)
            setHidden(true)
        } catch (error) {
            setFileError('Erro ao processar o arquivo. Tente novamente.')
            setSelectedFile(null)
            setFileDataUrl(null)
        }
    }

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        const file = event.dataTransfer.files[0]
        if (file && fileInputRef.current) {
            // Simular a seleção do arquivo
            const dt = new DataTransfer()
            dt.items.add(file)
            fileInputRef.current.files = dt.files
            handleFileSelect({ target: { files: dt.files } } as any)
        }
    }

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
    }

    // Verificar se o modelo selecionado suporta áudio/vídeo
    useEffect(() => {
        if (model) {
            console.log('Checking model support for:', model)
            const supportsFiles = checkModelSupportsAudioVideoSync(model)
            console.log('Model supports files:', supportsFiles)
            setModelSupportsFiles(supportsFiles)
        } else {
            console.log('No model provided')
            setModelSupportsFiles(false)
        }
    }, [model])

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return (
        <>
            <h2 className="mt-3">Degravação de Áudio/Vídeo</h2>
            
            {/* Verificação de suporte do modelo */}
            {model && !modelSupportsFiles && (
                <Alert variant="warning" className="mb-3">
                    <strong>Modelo não suporta áudio/vídeo</strong><br />
                    O modelo selecionado ({model}) não suporta transcrição de áudio/vídeo. 
                    Por favor, configure uma chave de API para um modelo Gemini para utilizar esta funcionalidade.
                </Alert>
            )}

            {!model && (
                <Alert variant="warning" className="mb-3">
                    <strong>Configuração de modelo necessária</strong><br />
                    Por favor, configure uma chave de API válida para utilizar esta funcionalidade.
                </Alert>
            )}

            {/* Área de upload */}
            <div 
                className="alert alert-secondary mb-3 p-4 text-center"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                style={{ 
                    border: '2px dashed #ccc', 
                    cursor: 'pointer',
                    minHeight: '120px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".mp3,.mp4,.wav,.wma,.wmv,.aiff,.aac,.ogg,.flac"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />
                
                {selectedFile ? (
                    <div>
                        <div className="mb-2">
                            <strong>📁 {selectedFile.name}</strong>
                        </div>
                        <div className="text-muted">
                            {formatFileSize(selectedFile.size)} • {selectedFile.type}
                        </div>
                        <Button variant="outline-secondary" size="sm" className="mt-2">
                            Trocar arquivo
                        </Button>
                    </div>
                ) : (
                    <div>
                        <div className="mb-2">
                            <strong>Selecione um arquivo de áudio ou vídeo</strong>
                        </div>
                        <div className="text-muted mb-2">
                            Arraste e solte ou clique para selecionar
                        </div>
                        <div className="text-muted small">
                            Formatos: MP3, MP4, WAV, WMA, WMV, AIFF, AAC, OGG, FLAC<br />
                            Tamanho máximo: 100MB
                        </div>
                    </div>
                )}
            </div>

            {/* Erro de arquivo */}
            {fileError && (
                <Alert variant="danger" className="mb-3">
                    <strong>Erro no arquivo:</strong> {fileError}
                </Alert>
            )}

            {/* Botão de transcrever */}
            {hidden && (
                <>
                    <div className="text-body-tertiary mb-3">
                        Selecione um arquivo de áudio ou vídeo acima e clique em &quot;Transcrever&quot; para gerar a transcrição com timestamps e sumário.
                    </div>
                    
                    {/* Alertas informativos sobre o estado do botão */}
                    {!selectedFile && (
                        <Alert variant="warning" className="mb-3">
                            <strong>Arquivo necessário</strong><br />
                            Por favor, selecione um arquivo de áudio ou vídeo para continuar.
                        </Alert>
                    )}
                    
                    {selectedFile && fileError && (
                        <Alert variant="danger" className="mb-3">
                            <strong>Erro no arquivo</strong><br />
                            {fileError}
                        </Alert>
                    )}
                    
                    {selectedFile && !fileError && !model && (
                        <Alert variant="warning" className="mb-3">
                            <strong>Modelo necessário</strong><br />
                            Por favor, configure uma chave de API válida para um modelo de IA.
                        </Alert>
                    )}
                    
                    {selectedFile && !fileError && model && !modelSupportsFiles && (
                        <Alert variant="warning" className="mb-3">
                            <strong>Modelo incompatível</strong><br />
                            O modelo selecionado ({model}) não suporta transcrição de áudio/vídeo.<br />
                            Por favor, configure uma chave de API para um modelo Gemini (2.5 Flash, 2.5 Pro, etc.).
                        </Alert>
                    )}
                    
                    {console.log('Button state debug:', { 
                        selectedFile: !!selectedFile, 
                        fileError: !!fileError, 
                        model: model,
                        modelSupportsFiles,
                        buttonDisabled: !selectedFile || !!fileError || !modelSupportsFiles
                    })}
                    
                    <Button 
                        disabled={!selectedFile || !!fileError || !modelSupportsFiles} 
                        className="mt-2" 
                        onClick={() => setHidden(false)}
                    >
                        Transcrever
                    </Button>
                </>
            )}

            {/* Resultado da transcrição */}
            {!hidden && selectedFile && fileDataUrl && !fileError && modelSupportsFiles && (
                <>
                    <h2 className="mt-3">Transcrição</h2>
                    <AiContent 
                        definition={getInternalPrompt('degravacao')} 
                        data={{ 
                            textos: [{ 
                                numeroDoProcesso: '', 
                                descr: `Arquivo de áudio/vídeo: ${selectedFile.name}`, 
                                slug: 'arquivo', 
                                texto: fileDataUrl, // Data URL do arquivo
                                sigilo: '0'
                            }] 
                        }} 
                        dossierCode={undefined} 
                    />
                </>
            )}
        </>
    )
}