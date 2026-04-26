export const REBALANCE_THRESHOLD = 0.000001

export function getPositionBetween(prev: number | null, next: number | null): number{
    if(prev === null && next === null){
        return 1000
    }
    if (prev === null && next !== null){
        return next! - 1000
    }
    if (prev !== null && next === null){
        return prev + 1000
    }
    else{
        return (prev! + next!) / 2
    }
}

export function needsRebalance(prev: number, next: number): boolean {
    return Math.abs(next-prev) < REBALANCE_THRESHOLD
}