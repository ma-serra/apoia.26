// --- Interfaces (Mantidas) ---

interface SourceContext {
    sourceType?: string; // Ex: 'acordao', 'depoimento', 'page'
    title?: string;
    filename?: string;
    pageNumber?: string;
    event?: string;
    label?: string;
    id?: string;
    [key: string]: string | undefined; // Permite outros atributos dinâmicos
}

interface Token {
    type: 'TAG' | 'WORD' | 'PUNCTUATION' | 'WHITESPACE';
    content: string;
    normalized?: string;
    isMatch?: boolean;
    context?: SourceContext;
}

// --- Configuração das Tags Fixas ---
// Estas são consideradas metadados INDEPENDENTE dos atributos
const FIXED_METADATA_TAGS = new Set([
    'library-document',
    'library-attachment',
    'page'
]);

// --- Tokenizer com Lógica Dinâmica ---

function tokenizeWithContext(html: string, extractMetadata: boolean = true): Token[] {
    // Regex: Tags, Palavras, Pontuação, Espaços
    const regex = /(?<tag><[^>]+>)|(?<word>[\w\u00C0-\u00FF-]+)|(?<punct>[.,;?!§%\/\(\)"']+)|(?<space>\s+)|(?<other>[^<>\w\s.,;?!§%-]+)/g;

    const tokens: Token[] = [];
    let currentCtx: SourceContext = {};

    // Pilha de contextos para gerenciar tags aninhadas corretamente
    const contextStack: SourceContext[] = [];
    
    // Para lidar com fechamento de tags dinâmicas corretamente
    // Armazenamos quais tags estão abertas e foram consideradas metadados
    const openMetadataTags = new Set<string>();

    let match;
    while ((match = regex.exec(html)) !== null) {
        const fullMatch = match[0];
        const { tag: tagGroup, word: wordGroup, punct: punctGroup, space: spaceGroup } = match.groups!;

        if (tagGroup) {
            if (extractMetadata) {
                const tagName = getTagName(tagGroup);
                const isClosing = tagGroup.startsWith('</');

                if (!isClosing) {
                    // --- TAG DE ABERTURA ---
                    const attrs = parseAttributes(tagGroup);

                    // A REGRA SOLICITADA:
                    // 1. É tag fixa (page, library...)?
                    // 2. OU tem atributos 'event' E 'label'?
                    const isFixed = FIXED_METADATA_TAGS.has(tagName);
                    const isDynamic = Boolean(attrs['event'] && attrs['label']);

                    if (isFixed || isDynamic) {
                        // É Metadado!
                        openMetadataTags.add(tagName);

                        // Salva o contexto atual na pilha antes de criar um novo
                        contextStack.push({ ...currentCtx });

                        // Atualização do Contexto
                        if (tagName === 'page') {
                            // <page> apenas atualiza o número da página, mantém o resto
                            currentCtx = { ...currentCtx, pageNumber: attrs['pageNumber'] };
                        } else {
                            // Outras tags (fixas ou dinâmicas) definem um novo "Documento/Origem"
                            // Para library-attachment, queremos herdar title do pai, mas criar novo contexto
                            const newCtx: SourceContext = {
                                sourceType: tagName,
                                ...attrs
                            };
                            
                            // Se for library-attachment, herda title do contexto pai se não tiver próprio
                            if (tagName === 'library-attachment' && !newCtx.title && currentCtx.title) {
                                newCtx.title = currentCtx.title;
                            }
                            
                            currentCtx = newCtx;
                        }
                        continue; // Não gera token visual
                    }
                } else {
                    // --- TAG DE FECHAMENTO ---
                    // Se estamos fechando uma tag que foi registrada como metadado
                    if (openMetadataTags.has(tagName)) {
                        openMetadataTags.delete(tagName);

                        // Restaura o contexto da pilha
                        if (contextStack.length > 0) {
                            currentCtx = contextStack.pop()!;
                        } else {
                            // Se a pilha está vazia, limpa o contexto
                            currentCtx = {};
                        }
                        continue; // Não gera token visual
                    }
                }
            }

            // Se chegou aqui, é uma tag HTML comum (<b>, <div>, etc) ou metadata desativado
            tokens.push({ type: 'TAG', content: fullMatch });

        } else if (wordGroup) {
            tokens.push({
                type: 'WORD',
                content: fullMatch,
                normalized: fullMatch.toLowerCase(),
                context: { ...currentCtx } // Clona o contexto atual
            });
        } else if (punctGroup) {
            tokens.push({
                type: 'PUNCTUATION',
                content: fullMatch,
                normalized: fullMatch,
                context: { ...currentCtx }
            });
        } else if (spaceGroup) {
            tokens.push({ type: 'WHITESPACE', content: fullMatch });
        } else {
            tokens.push({ type: 'TAG', content: fullMatch }); // Lixo/Símbolos
        }
    }

    return tokens;
}

// --- Helpers Auxiliares ---

function getTagName(tagStr: string): string {
    // Captura o nome da tag ignorando a barra de fechamento
    const match = tagStr.match(/<\/?([a-zA-Z0-9-]+)/);
    return match ? match[1].toLowerCase() : '';
}

function parseAttributes(tagStr: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    // Captura key="value" ou key='value'
    const attrRegex = /([a-zA-Z0-9-]+)=["']([^"']*)["']/g;

    let match;
    while ((match = attrRegex.exec(tagStr)) !== null) {
        let key = match[1].toLowerCase();
        const value = match[2];

        // Normalização específica solicitada
        if (key === 'number') key = 'pageNumber';

        attrs[key] = value;
    }
    return attrs;
}

/**
 * Formata o contexto para o Tooltip (Title do HTML)
 * Atualizado para lidar com tags dinâmicas
 */
function formatContextToString(ctx?: SourceContext): string {
    if (!ctx) return 'Origem desconhecida';

    const parts = [];

    // Se tiver Label e Evento, prioriza mostrar isso de forma clara
    if (ctx.label && ctx.event) {
        parts.push(`${ctx.label} (e. ${ctx.event.toUpperCase()})`);
    }
    // Caso contrário, mostra o tipo da tag (ex: library-document)
    else if (ctx.sourceType) {
        switch (ctx.sourceType) {
            case 'library-document':
                parts.push('Documento da Biblioteca');
                break;
            case 'library-attachment':
                parts.push('Anexo da Biblioteca');
                break;
            default:
                parts.push(`[${ctx.sourceType.toUpperCase()}]`);
        }
    } else {
        parts.push('Trecho encontrado no prompt');
    }

    if (ctx.title) parts.push(`Título: ${ctx.title}`);
    if (ctx.filename) parts.push(`Arq: ${ctx.filename}`);
    if (ctx.pageNumber) parts.push(`Pág: ${ctx.pageNumber}`);

    return parts.join(', ');
}

interface MatchRange {
    genStartIndex: number;
    sourceStartIndex: number;
    length: number;
}

// --- Configurações ---

const METADATA_TAGS = new Set([
    'library-document', 'library-attachment', 'acordao', 'page', 'peticao', 'sentenca'
    // Adicione outras tags de documentos aqui se necessário
]);

export function highlightCitationsLongestMatch(
    sourceHtml: string,
    generatedHtml: string,
    nGramSize: number = 8,
    maxNonCitationHighlight: number = 8
): string {

    // 1. Tokenização
    const sourceTokens = tokenizeWithContext(sourceHtml);
    const genTokens = tokenizeWithContext(generatedHtml, false);

    // Filtrar tokens significativos (Words + Punctuation)
    // Precisamos manter a referência ao índice original para "pintar" o HTML depois
    const sourceSig = sourceTokens
        .map((t, i) => ({ ...t, originalIndex: i }))
        .filter(t => t.normalized !== undefined);

    const genSig = genTokens
        .map((t, i) => ({ ...t, originalIndex: i }))
        .filter(t => t.normalized !== undefined);

    // 2. Indexação do Source (Map<NGramKey, Indices[]>)
    const sourceMap = new Map<string, number[]>();

    if (sourceSig.length >= nGramSize) {
        for (let i = 0; i <= sourceSig.length - nGramSize; i++) {
            const key = sourceSig.slice(i, i + nGramSize).map(t => t.normalized).join(' ');

            if (!sourceMap.has(key)) {
                sourceMap.set(key, []);
            }
            sourceMap.get(key)!.push(i);
        }
    }

    // 3. Processamento com Look Ahead (Greedy Longest Match)
    let genIndex = 0;

    // Percorremos os tokens significativos do texto gerado
    while (genIndex <= genSig.length - nGramSize) {

        // Pegamos o N-Gram atual
        const currentChunk = genSig.slice(genIndex, genIndex + nGramSize);
        const key = currentChunk.map(t => t.normalized).join(' ');

        // Verificamos se esse N-Gram existe em algum lugar da fonte
        if (sourceMap.has(key)) {
            const candidates = sourceMap.get(key)!;

            // LOOK AHEAD: Vamos ver qual candidato gera a maior sequência
            let bestCandidateStartIndex = -1;
            let maxMatchLength = -1;

            for (const sourceStartIndex of candidates) {
                // Calcula quão longe esse match vai
                const currentLength = measureMatchLength(genSig, sourceSig, genIndex, sourceStartIndex);

                if (currentLength > maxMatchLength) {
                    maxMatchLength = currentLength;
                    bestCandidateStartIndex = sourceStartIndex;
                }
            }

            // 4. Aplicação do Melhor Match
            // Se encontramos um match válido, marcamos todos os tokens envolvidos
            if (bestCandidateStartIndex !== -1) {

                // Atribuímos o contexto da fonte vencedora para os tokens gerados
                for (let offset = 0; offset < maxMatchLength; offset++) {

                    // Tokens do gerado que vamos marcar
                    const genSigRef = genSig[genIndex + offset];
                    const genTokenActual = genTokens[genSigRef.originalIndex];

                    // Tokens da fonte de onde estamos copiando o contexto
                    const sourceSigRef = sourceSig[bestCandidateStartIndex + offset];
                    // Nota: sourceSigRef pode ser undefined se o gerado for maior que o source (improvável aqui pelo while)

                    if (sourceSigRef) {
                        genTokenActual.isMatch = true;
                        // Aqui está a mágica: O contexto é copiado token a token.
                        // Se a sequência cruzar de uma página para outra no original,
                        // o contexto vai mudar corretamente no meio da frase gerada também.
                        genTokenActual.context = sourceSigRef.context;
                    }
                }

                // SALTO (Optimization):
                // Como já resolvemos essa sequência inteira, pulamos o índice
                // para o final dela. Isso evita reprocessar partes internas da frase.
                genIndex += maxMatchLength;
                continue; // Vai para a próxima iteração do while
            }
        }

        // Se não houve match, avança apenas 1 token
        genIndex++;
    }

    // 3.5. Processar tokens restantes (tail processing)
    // Tokens que não formam n-gram completo mas podem ter match menor
    while (genIndex < genSig.length) {
        // Tenta encontrar match com os tokens restantes
        const remainingSize = genSig.length - genIndex;
        
        for (let size = remainingSize; size >= Math.min(3, nGramSize); size--) {
            const chunk = genSig.slice(genIndex, genIndex + size);
            const key = chunk.map(t => t.normalized).join(' ');
            
            if (sourceMap.has(key)) {
                const candidates = sourceMap.get(key)!;
                let bestMatch = -1;
                let maxLen = -1;
                
                for (const sourceStart of candidates) {
                    const len = measureMatchLength(genSig, sourceSig, genIndex, sourceStart);
                    if (len > maxLen) {
                        maxLen = len;
                        bestMatch = sourceStart;
                    }
                }
                
                if (bestMatch !== -1) {
                    for (let offset = 0; offset < maxLen; offset++) {
                        const genSigRef = genSig[genIndex + offset];
                        const genTokenActual = genTokens[genSigRef.originalIndex];
                        const sourceSigRef = sourceSig[bestMatch + offset];
                        
                        if (sourceSigRef) {
                            genTokenActual.isMatch = true;
                            genTokenActual.context = sourceSigRef.context;
                        }
                    }
                    genIndex += maxLen;
                    break;
                }
            }
        }
        
        if (genIndex < genSig.length && !genTokens[genSig[genIndex].originalIndex].isMatch) {
            genIndex++;
        }
    }

    // 5. Reconstrução do HTML (Mesma lógica da resposta anterior)
    return rebuildHtmlWithTooltips(genTokens, maxNonCitationHighlight);
}

/**
 * Helper: Mede o tamanho da sequência de match token a token
 * Retorna o número de tokens que coincidem a partir dos índices fornecidos.
 */
function measureMatchLength(
    genList: any[],
    sourceList: any[],
    genStart: number,
    sourceStart: number
): number {
    let length = 0;

    // Enquanto houver tokens em ambas as listas e eles forem iguais
    while (
        (genStart + length < genList.length) &&
        (sourceStart + length < sourceList.length)
    ) {
        const tGen = genList[genStart + length];
        const tSource = sourceList[sourceStart + length];

        if (tGen.normalized === tSource.normalized) {
            length++;
        } else {
            break; // Parou de bater
        }
    }

    return length;
}

/**
 * Helper: Reconstrução do HTML (Extraído para clareza)
 */
function rebuildHtmlWithTooltips(genTokens: any[], maxNonCitationHighlight: number = 0): string {
    let outputHtml = '';
    let insideCitation = false;
    let currentContextString = '';
    let hadAnyCitation = false; // Flag para saber se já houve alguma citação

    // Tags que forçam o fechamento do span (block-level que quebram contexto)
    const BLOCK_TAGS = new Set([
        'p', '/p', 'div', '/div', 'section', '/section', 'article', '/article',
        'h1', '/h1', 'h2', '/h2', 'h3', '/h3', 'h4', '/h4', 'h5', '/h5', 'h6', '/h6',
        'table', '/table', 'thead', '/thead', 'tbody', '/tbody', 'tr', '/tr', 'li', '/li',
        'ul', '/ul', 'ol', '/ol', 'br', '/br', 'hr', '/hr', 'blockquote', '/blockquote'
    ]);

    // Helper para verificar se uma tag deve fechar o span
    const shouldBreakSpan = (tagContent: string): boolean => {
        const tagName = getTagName(tagContent);
        return BLOCK_TAGS.has(tagName);
    };

    // Helper para verificar se há próximo token com match
    const hasNextMatchWithSameContext = (startIndex: number, contextStr: string): boolean => {
        for (let j = startIndex + 1; j < genTokens.length; j++) {
            const nextToken = genTokens[j];
            
            // Ignora apenas whitespace
            if (nextToken.type === 'WHITESPACE') {
                continue;
            }
            
            // Se for uma tag inline (não block), continua procurando
            if (nextToken.type === 'TAG' && !shouldBreakSpan(nextToken.content)) {
                continue;
            }
            
            // Se for uma tag block, não há continuidade
            if (nextToken.type === 'TAG' && shouldBreakSpan(nextToken.content)) {
                return false;
            }
            
            // Se encontrou um token significativo
            if (nextToken.isMatch) {
                const nextContextStr = formatContextToString(nextToken.context);
                return nextContextStr === contextStr;
            }
            
            // Se encontrou token sem match, retorna false
            return false;
        }
        return false;
    };

    // Buffer para acumular tokens não-citados
    let nonCitationBuffer: any[] = [];
    
    // Helper para processar o buffer de não-citação
    const flushNonCitationBuffer = (isBeforeCitation: boolean = false) => {
        if (nonCitationBuffer.length === 0) return;
        
        // Conta tokens significativos no buffer
        const significantTokens = nonCitationBuffer.filter(t => 
            t.type === 'WORD' || t.type === 'PUNCTUATION'
        ).length;
        
        // Só marca como não-citação se:
        // 1. Já houve uma citação antes E
        // 2. Vai ter uma citação depois (isBeforeCitation) E
        // 3. Está dentro do threshold
        if (hadAnyCitation && isBeforeCitation && maxNonCitationHighlight > 0 && significantTokens > 0 && significantTokens <= maxNonCitationHighlight) {
            outputHtml += '<span class="nao-citacao">';
            nonCitationBuffer.forEach(t => outputHtml += t.content);
            outputHtml += '</span>';
        } else {
            // Caso contrário, adiciona sem marcação
            nonCitationBuffer.forEach(t => outputHtml += t.content);
        }
        
        nonCitationBuffer = [];
    };

    for (let i = 0; i < genTokens.length; i++) {
        const token = genTokens[i];

        if (token.isMatch) {
            // Processa buffer acumulado antes de iniciar citação
            flushNonCitationBuffer(true); // true = vai ter citação depois
            hadAnyCitation = true;
            const tokenContextStr = formatContextToString(token.context);

            if (!insideCitation) {
                // Abre novo span
                outputHtml += `<span class="citacao" title="${tokenContextStr}">`;
                insideCitation = true;
                currentContextString = tokenContextStr;
            } else if (tokenContextStr !== currentContextString) {
                // Contexto mudou - mas só reabre span se o próximo token também tiver match
                // Isso evita spans microscópicos de 1 palavra quando há matches overlapping
                // Mantém o contexto anterior por continuidade
            }

            outputHtml += token.content;
        } else if (token.type === 'WHITESPACE') {
            // Whitespace: adiciona dentro do span se estiver em citação e houver próximo match com mesmo contexto
            if (insideCitation && hasNextMatchWithSameContext(i, currentContextString)) {
                outputHtml += token.content;
            } else if (insideCitation) {
                // Fecha o span antes do whitespace (evita spans vazios)
                outputHtml += '</span>';
                insideCitation = false;
                currentContextString = '';
                // Adiciona ao buffer de não-citação
                nonCitationBuffer.push(token);
            } else {
                // Adiciona ao buffer de não-citação
                nonCitationBuffer.push(token);
            }
        } else if (token.type === 'TAG') {
            // Tag HTML: verifica se é uma tag que deve quebrar o span
            if (shouldBreakSpan(token.content)) {
                // Tags block-level fecham o span
                if (insideCitation) {
                    outputHtml += `</span>${token.content}`;
                    insideCitation = false;
                    currentContextString = '';
                    // Não adiciona ao buffer - tags block quebram contexto
                    flushNonCitationBuffer();
                    // Verifica se deve reabrir o span
                    if (hasNextMatchWithSameContext(i, currentContextString)) {
                        outputHtml += `<span class="citacao" title="${currentContextString}">`;
                        insideCitation = true;
                    }
                } else {
                    // Processa buffer antes de tag block
                    flushNonCitationBuffer();
                    outputHtml += token.content;
                }
            } else {
                // Tags inline
                if (insideCitation) {
                    outputHtml += token.content;
                } else {
                    nonCitationBuffer.push(token);
                }
            }
        } else {
            // PUNCTUATION ou outros: trata como token normal
            if (insideCitation) {
                outputHtml += token.content;
            } else {
                nonCitationBuffer.push(token);
            }
        }
    }

    if (insideCitation) outputHtml += '</span>';
    
    // Processa qualquer buffer restante (false = não vai ter citação depois)
    flushNonCitationBuffer(false);
    
    // Remove spans vazios
    return outputHtml.replace(/<span class="(citacao|nao-citacao)"[^>]*><\/span>/g, '');
}

