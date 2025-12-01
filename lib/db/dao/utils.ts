export function getId(returning: number | { id: number }): number {
    return typeof returning === 'number' ? returning : returning.id
}
