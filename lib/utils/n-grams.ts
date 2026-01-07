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
    const regex = /(<[^>]+>)|([\w\u00C0-\u00FF]+)|([.,;?!§%]+)|(\s+)|([^<>\w\s.,;?!§%]+)/g;

    const tokens: Token[] = [];
    let currentCtx: SourceContext = {};

    // Para lidar com fechamento de tags dinâmicas corretamente
    // Armazenamos quais tags estão abertas e foram consideradas metadados
    const openMetadataTags = new Set<string>();

    let match;
    while ((match = regex.exec(html)) !== null) {
        const [fullMatch, tagGroup, wordGroup, punctGroup, spaceGroup] = match;

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

                        // Atualização do Contexto
                        if (tagName === 'page') {
                            // <page> apenas atualiza o número da página, mantém o resto
                            currentCtx = { ...currentCtx, pageNumber: attrs['number'] || attrs['page'] };
                        } else {
                            // Outras tags (fixas ou dinâmicas) definem um novo "Documento/Origem"
                            // Removemos pageNumber antigo pois mudamos de documento
                            const { pageNumber, ...rest } = currentCtx;

                            currentCtx = {
                                ...rest, // Mantém contextos superiores (ex: library-document pai) se desejado
                                sourceType: tagName,
                                pageNumber: undefined, // Reseta página
                                ...attrs // Espalha event, label, title, id, etc.
                            };
                        }
                        continue; // Não gera token visual
                    }
                } else {
                    // --- TAG DE FECHAMENTO ---
                    // Se estamos fechando uma tag que foi registrada como metadado
                    if (openMetadataTags.has(tagName)) {
                        openMetadataTags.delete(tagName);

                        // Lógica simples de "Desempilhar" contexto
                        if (tagName === 'page') {
                            const { pageNumber, ...rest } = currentCtx;
                            currentCtx = rest;
                        } else if (tagName === currentCtx.sourceType) {
                            // Se fechou o documento atual (ex: </acordao>), limpamos os dados específicos dele
                            // Numa implementação ideal com Stack, voltaríamos para o pai.
                            // Aqui, limpamos o sourceType e atributos específicos.
                            const { sourceType, event, label, id, ...rest } = currentCtx;
                            currentCtx = rest;
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
        parts.push(`[${ctx.event.toUpperCase()}: ${ctx.label}]`);
    }
    // Caso contrário, mostra o tipo da tag (ex: library-document)
    else if (ctx.sourceType) {
        parts.push(`[${ctx.sourceType.toUpperCase()}]`);
    }

    if (ctx.title) parts.push(`Título: ${ctx.title}`);
    if (ctx.filename) parts.push(`Arq: ${ctx.filename}`);
    if (ctx.pageNumber) parts.push(`Pág: ${ctx.pageNumber}`);

    return parts.join(' | ');
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
    nGramSize: number = 12
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

    // 5. Reconstrução do HTML (Mesma lógica da resposta anterior)
    return rebuildHtmlWithTooltips(genTokens);
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
function rebuildHtmlWithTooltips(genTokens: any[]): string {
    let outputHtml = '';
    let insideCitation = false;
    let currentContextString = '';

    for (let i = 0; i < genTokens.length; i++) {
        const token = genTokens[i];

        if (token.isMatch) {
            const tokenContextStr = formatContextToString(token.context);

            if (!insideCitation) {
                outputHtml += `<span class="citacao" title="${tokenContextStr}">`;
                insideCitation = true;
                currentContextString = tokenContextStr;
            } else if (tokenContextStr !== currentContextString) {
                // Contexto mudou no meio da sequência (ex: virou a página)
                outputHtml += `</span><span class="citacao" title="${tokenContextStr}">`;
                currentContextString = tokenContextStr;
            }
        } else {
            if (insideCitation) {
                outputHtml += '</span>';
                insideCitation = false;
                currentContextString = '';
            }
        }

        if (insideCitation && token.type === 'TAG') {
            outputHtml += `</span>${token.content}<span class="citacao" title="${currentContextString}">`;
        } else {
            outputHtml += token.content;
        }
    }

    if (insideCitation) outputHtml += '</span>';
    // Remove spans vazios
    return outputHtml.replace(/<span class="citacao"[^>]*><\/span>/g, '');
}

