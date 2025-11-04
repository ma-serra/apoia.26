# Conversão de Áudio/Vídeo para MP3 Otimizado

## Visão Geral

Sistema de conversão **automática** de qualquer arquivo de áudio ou vídeo para MP3 otimizado (16kHz, mono, 64kbps) antes do envio para modelos de IA.

**Por quê?**
- Modelos de IA têm requisitos específicos de formato
- Padronizar taxa de amostragem (16kHz) e canais (mono) reduz tamanho
- MP3 64kbps mantém qualidade suficiente para transcrição
- Conversão pode reduzir arquivo em até 90% do tamanho original

## Funcionalidades

- **Conversão Universal**: Funciona com vídeos (MP4, MOV, AVI, etc.) e áudios (MP3, WAV, M4A, etc.)
- **Normalização Automática**: Todos os arquivos são convertidos para o mesmo formato padrão
- **Conversão Rápida**: Processa usando OfflineAudioContext (não é em tempo real)
- **Otimização**: MP3 mono 16kHz @ 64kbps para reduzir tamanho
- **Progress Bar**: Interface visual com 5 estágios de progresso
- **Cache em Memória**: Evita reconversão do mesmo arquivo
- **Cancelamento**: Permite interromper a conversão em andamento
- **Download**: Permite baixar o MP3 gerado

## Arquivos Criados

```
lib/audio/
  ├── audio-utils.ts         # Utilidades (detecção de tipo, formatação)
  └── audio-extractor.ts     # Lógica de extração e conversão
components/
  └── audio-conversion-progress.tsx  # UI do progresso
```

## Fluxo de Conversão

1. Usuário seleciona arquivo de áudio ou vídeo
2. Sistema verifica cache (chave: nome+tamanho+data)
3. Se não no cache:
   - Lê arquivo como ArrayBuffer
   - Decodifica áudio com AudioContext.decodeAudioData()
   - **Usa OfflineAudioContext para processar rapidamente**
   - Converte para mono (1 canal) e 16kHz simultaneamente
   - Codifica em MP3 @ 64kbps usando lamejs
   - Salva no cache
4. Exibe progresso e resultado
5. Permite download do MP3
6. Envia MP3 otimizado para IA ao clicar "Transcrever"

## Especificações Técnicas

- **Sample Rate**: 16kHz (ideal para voz)
- **Canais**: 1 (mono)
- **Bitrate**: 64kbps
- **Formato**: MP3
- **Limite Sugerido**: 20MB (aviso visual)
- **Performance**: OfflineAudioContext processa muito mais rápido que tempo real

## Por que é Rápido?

A chave da performance é usar `OfflineAudioContext` em vez de processar o vídeo em tempo real:

- **Antes**: MediaRecorder capturava áudio enquanto o vídeo tocava (tempo real)
- **Agora**: OfflineAudioContext processa tudo de uma vez sem reprodução

Exemplo: Um vídeo de 5 minutos pode ser convertido em 5-10 segundos!

## Dependências

- `lamejs`: Encoder MP3 em JavaScript (versão minificada: 152 KB)
- Web Audio API (nativa do navegador)
- OfflineAudioContext (nativa do navegador)

## Progresso da Conversão

A barra de progresso é atualizada em 5 estágios:

1. **Carregando lamejs** (0-1%): Carrega biblioteca dinamicamente
2. **Leitura do arquivo** (1-11%): Carrega arquivo em memória - 10%
3. **Decodificando áudio** (11-21%): Extrai áudio do arquivo - 10%
4. **Reamostragem** (21-31%): Converte para 16kHz mono - 10%
5. **Gerando MP3** (31-99%): Encoding com lamejs - **68% do tempo total**
   - Atualiza a cada 10 blocos processados (1152 samples/bloco)
   - Garante feedback visual contínuo
6. **Concluído** (99-100%): Conversão finalizada - 1%

O encoding MP3 representa 68% do progresso total porque é a etapa mais demorada do processo.

## Cache

O sistema mantém um cache em memória durante a sessão:
```typescript
audioConversionCache: Map<string, AudioExtractionResult>
```
Chave: `${filename}-${size}-${lastModified}`

Qualquer arquivo (áudio ou vídeo) com mesmo nome, tamanho e data de modificação usa o cache.

## Tratamento de Erros

- Validação de tipo de arquivo
- Validação de tamanho (100MB max)
- Cancelamento via AbortController
- Mensagens de erro amigáveis
- Limpeza de recursos ao desmontar

## Solução do lamejs

### Problema Encontrado
O lamejs usa módulos CommonJS com `require()` dinâmico, o que não funciona com webpack/Turbopack:
```
ReferenceError: MPEGMode is not defined
```

### Solução Implementada
Seguimos a [documentação oficial do lamejs](https://github.com/zhuker/lamejs#quick-start) que recomenda carregar via `<script>`:

#### 1. npm script copia o arquivo compilado
```json
"copy-lamejs": "node -e \"require('fs').copyFileSync('node_modules/lamejs/lame.min.js', 'public/lame.min.js')\""
```

#### 2. Build automatizado
```json
"build": "npm run copy-lamejs && next build"
```

#### 3. Carregamento dinâmico no browser
```typescript
const script = document.createElement('script')
script.src = '/lame.min.js' // Versão minificada (70% menor)
document.head.appendChild(script)
```

#### 4. Acesso via global window
```typescript
const lamejs = window.lamejs
const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps)
```

#### 5. Declaração de tipos TypeScript
```typescript
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
```

### Por que essa solução?
- ✅ Sem manipulação de node_modules
- ✅ Build automatizado via npm scripts
- ✅ Segue documentação oficial do lamejs
- ✅ TypeScript type-safe
- ✅ Zero dependências em runtime (script carregado sob demanda)

