// ============================================================================
// N-GRAMS: Detecção de Citações usando N-Grams com Contexto
// ============================================================================
//
// Este módulo implementa um algoritmo que compara um texto gerado (por IA)
// com textos fonte para identificar citações literais, preservando informações
// de contexto (documento, página, etc.) para exibição em tooltips.
//
// ARQUITETURA:
// ┌─────────────────────────────────────────────────────────────┐
// │  1. TOKENIZAÇÃO (tokenizer.ts)                              │
// │     - Transforma HTML em tokens (palavras, pontuação, etc)  │
// │     - Extrai contexto de metadados (página, documento, etc) │
// └─────────────────────────────────────────────────────────────┘
//                             ▼
// ┌─────────────────────────────────────────────────────────────┐
// │  2. INDEXAÇÃO (matcher.ts)                                  │
// │     - Cria um Map de n-grams → posições                     │
// └─────────────────────────────────────────────────────────────┘
//                             ▼
// ┌─────────────────────────────────────────────────────────────┐
// │  3. MATCHING (matcher.ts)                                   │
// │     - Percorre o texto gerado                               │
// │     - Busca n-grams no índice do source                     │
// │     - Escolhe sempre o match mais longo (greedy)            │
// │     - Copia contexto do source para o generated             │
// └─────────────────────────────────────────────────────────────┘
//                             ▼
// ┌─────────────────────────────────────────────────────────────┐
// │  4. RECONSTRUÇÃO (html-builder.ts)                          │
// │     - Reconstrói HTML com <span class="citacao">            │
// │     - Agrupa tokens consecutivos com mesmo contexto         │
// │     - Adiciona tooltips com origem da citação               │
// └─────────────────────────────────────────────────────────────┘
//
// ============================================================================

import { Token, IndexedToken } from './types';
import { DEFAULTS } from './config';
import { tokenizeWithContext } from './tokenizer';
import { 
    getSignificantTokens, 
    buildNGramIndex, 
    createNGramKey,
    findBestMatch, 
    applyMatch 
} from './matcher';
import { rebuildHtmlWithTooltips } from './html-builder';

// Re-exporta tipos e funções úteis para consumidores externos
export * from './types';
export { formatContextToString } from './formatter';
export { tokenizeWithContext } from './tokenizer';

/**
 * Destaca citações no texto gerado baseado em correspondências com o texto fonte.
 * 
 * O algoritmo usa n-grams para encontrar sequências de tokens idênticas entre
 * o source e o generated, marcando-as como citações e preservando o contexto
 * de origem (documento, página, etc.) para exibição em tooltips.
 * 
 * @param sourceHtml - HTML do texto fonte (com metadados de documento/página)
 * @param generatedHtml - HTML do texto gerado pela IA
 * @param nGramSize - Tamanho mínimo do n-gram para considerar match (default: 8)
 * @param maxNonCitationHighlight - Máximo de tokens não-citados entre citações para marcar (default: 8)
 * @returns HTML com spans de citação e tooltips de contexto
 * 
 * @example
 * const source = '<library-document title="Manual"><page number="1">Texto importante aqui.</page></library-document>';
 * const generated = 'O documento diz: Texto importante aqui.';
 * const result = highlightCitationsLongestMatch(source, generated);
 * // result contém: 'O documento diz: <span class="citacao" title="...">Texto importante aqui.</span>'
 */
export function highlightCitationsLongestMatch(
    sourceHtml: string,
    generatedHtml: string,
    nGramSize: number = DEFAULTS.N_GRAM_SIZE,
    maxNonCitationHighlight: number = DEFAULTS.MAX_NON_CITATION_HIGHLIGHT
): string {
    // 1. Tokenização
    const sourceTokens = tokenizeWithContext(sourceHtml);
    const genTokens = tokenizeWithContext(generatedHtml, false);
    
    // 2. Filtragem de tokens significativos
    const sourceSig = getSignificantTokens(sourceTokens);
    const genSig = getSignificantTokens(genTokens);
    
    // 3. Indexação do source
    const sourceIndex = buildNGramIndex(sourceSig, nGramSize);
    
    // 4. Processamento principal (Greedy Longest Match)
    let genIndex = processMainMatching(
        genTokens, genSig, sourceSig, sourceIndex, nGramSize
    );
    
    // 5. Tail processing: tokens restantes menores que nGramSize
    processTailMatching(
        genTokens, genSig, sourceSig, sourceIndex, genIndex, nGramSize
    );
    
    // 6. Reconstrução do HTML
    return rebuildHtmlWithTooltips(genTokens, maxNonCitationHighlight);
}

/**
 * Processamento principal: percorre tokens que formam n-grams completos
 */
function processMainMatching(
    genTokens: Token[],
    genSig: IndexedToken[],
    sourceSig: IndexedToken[],
    sourceIndex: Map<string, number[]>,
    nGramSize: number
): number {
    let genIndex = 0;
    
    while (genIndex <= genSig.length - nGramSize) {
        const key = createNGramKey(genSig, genIndex, nGramSize);
        const candidates = sourceIndex.get(key);
        
        if (candidates) {
            const match = findBestMatch(genSig, sourceSig, genIndex, candidates);
            
            if (match) {
                applyMatch(genTokens, genSig, sourceSig, genIndex, match.sourceStart, match.length);
                genIndex += match.length;
                continue;
            }
        }
        
        genIndex++;
    }
    
    return genIndex;
}

/**
 * Tail processing: processa tokens restantes que não formam n-gram completo
 */
function processTailMatching(
    genTokens: Token[],
    genSig: IndexedToken[],
    sourceSig: IndexedToken[],
    sourceIndex: Map<string, number[]>,
    startIndex: number,
    nGramSize: number
): void {
    let genIndex = startIndex;
    
    while (genIndex < genSig.length) {
        const remainingSize = genSig.length - genIndex;
        let foundMatch = false;
        
        // Tenta tamanhos decrescentes até o mínimo
        for (let size = remainingSize; size >= Math.min(DEFAULTS.MIN_TAIL_SIZE, nGramSize); size--) {
            const key = createNGramKey(genSig, genIndex, size);
            const candidates = sourceIndex.get(key);
            
            if (candidates) {
                const match = findBestMatch(genSig, sourceSig, genIndex, candidates);
                
                if (match) {
                    applyMatch(genTokens, genSig, sourceSig, genIndex, match.sourceStart, match.length);
                    genIndex += match.length;
                    foundMatch = true;
                    break;
                }
            }
        }
        
        // Se não encontrou match, avança um token
        if (!foundMatch && genIndex < genSig.length && !genTokens[genSig[genIndex].originalIndex].isMatch) {
            genIndex++;
        }
    }
}
