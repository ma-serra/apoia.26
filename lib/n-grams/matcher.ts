// ============================================================================
// MATCHER: Algoritmo de N-Gram Matching
// ============================================================================

import { Token, IndexedToken, MatchResult } from './types';

// ============================================================================
// PREPARAÇÃO DE TOKENS
// ============================================================================

/**
 * Filtra apenas tokens significativos (WORD e PUNCTUATION) e adiciona índice original.
 * Tokens significativos são aqueles que têm valor normalizado (usados na comparação).
 */
export function getSignificantTokens(tokens: Token[]): IndexedToken[] {
    return tokens
        .map((t, i) => ({ ...t, originalIndex: i }))
        .filter(t => t.normalized !== undefined);
}

// ============================================================================
// INDEXAÇÃO DE N-GRAMS
// ============================================================================

/**
 * Constrói índice de n-grams do source.
 * 
 * O índice mapeia cada sequência de N tokens (chave) para todas as posições
 * onde essa sequência aparece no source.
 * 
 * @param tokens - Tokens significativos do source
 * @param nGramSize - Tamanho do n-gram
 * @returns Map de chave do n-gram → array de posições
 */
export function buildNGramIndex(tokens: IndexedToken[], nGramSize: number): Map<string, number[]> {
    const index = new Map<string, number[]>();
    
    if (tokens.length < nGramSize) return index;
    
    for (let i = 0; i <= tokens.length - nGramSize; i++) {
        const key = createNGramKey(tokens, i, nGramSize);
        
        if (!index.has(key)) {
            index.set(key, []);
        }
        index.get(key)!.push(i);
    }
    
    return index;
}

/**
 * Cria a chave de um n-gram (tokens normalizados concatenados)
 */
export function createNGramKey(tokens: IndexedToken[], start: number, size: number): string {
    return tokens.slice(start, start + size)
        .map(t => t.normalized)
        .join(' ');
}

// ============================================================================
// MEDIÇÃO E BUSCA DE MATCHES
// ============================================================================

/**
 * Mede quantos tokens consecutivos coincidem a partir das posições dadas.
 * Compara token a token enquanto forem iguais.
 */
export function measureMatchLength(
    genList: IndexedToken[],
    sourceList: IndexedToken[],
    genStart: number,
    sourceStart: number
): number {
    let length = 0;
    
    while (
        genStart + length < genList.length &&
        sourceStart + length < sourceList.length &&
        genList[genStart + length].normalized === sourceList[sourceStart + length].normalized
    ) {
        length++;
    }
    
    return length;
}

/**
 * Encontra o melhor match (mais longo) entre os candidatos.
 * Usa a estratégia "greedy longest match" para escolher.
 * 
 * @param genSig - Tokens significativos do texto gerado
 * @param sourceSig - Tokens significativos do source
 * @param genIndex - Posição atual no texto gerado
 * @param candidates - Posições candidatas no source
 * @returns O melhor match encontrado ou null
 */
export function findBestMatch(
    genSig: IndexedToken[],
    sourceSig: IndexedToken[],
    genIndex: number,
    candidates: number[]
): MatchResult | null {
    let bestSourceStart = -1;
    let maxLength = -1;
    
    for (const sourceStart of candidates) {
        const length = measureMatchLength(genSig, sourceSig, genIndex, sourceStart);
        if (length > maxLength) {
            maxLength = length;
            bestSourceStart = sourceStart;
        }
    }
    
    return bestSourceStart !== -1 
        ? { sourceStart: bestSourceStart, length: maxLength }
        : null;
}

// ============================================================================
// APLICAÇÃO DE MATCHES
// ============================================================================

/**
 * Aplica um match: marca tokens do generated com contexto do source.
 * 
 * Para cada token no range do match:
 * 1. Marca como isMatch = true
 * 2. Copia o contexto do token correspondente do source
 * 3. Propaga flag de block boundary se existir
 * 
 * @param genTokens - Array original de tokens do texto gerado
 * @param genSig - Tokens significativos do texto gerado
 * @param sourceSig - Tokens significativos do source
 * @param genIndex - Posição inicial no texto gerado
 * @param sourceStart - Posição inicial no source
 * @param matchLength - Tamanho do match
 */
export function applyMatch(
    genTokens: Token[],
    genSig: IndexedToken[],
    sourceSig: IndexedToken[],
    genIndex: number,
    sourceStart: number,
    matchLength: number
): void {
    for (let offset = 0; offset < matchLength; offset++) {
        const genSigRef = genSig[genIndex + offset];
        const genTokenActual = genTokens[genSigRef.originalIndex];
        const sourceSigRef = sourceSig[sourceStart + offset];
        
        if (sourceSigRef) {
            genTokenActual.isMatch = true;
            // Copia contexto token a token (permite mudança de página no meio)
            genTokenActual.context = sourceSigRef.context;
            
            // Propaga flag de block boundary
            if (sourceSigRef.startsAfterBlockTag) {
                genTokenActual.startsAfterBlockTag = true;
            }
        }
    }
}
