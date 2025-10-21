// app/lib/serviceMonitor.ts
// In-memory service monitor singleton (shared by routes).
// Simple semantics:
//  - recordFailure(userId): marca timestamp da última falha do user
//  - recordSuccess(): limpa tudo -> desativa aviso imediatamente
//  - isDown(): true se #distinct failed users in window >= threshold
//

import devLog from "../utils/log";

// Config via env (defaults sensible):
const WINDOW_MS = Number(process.env.MONITOR_WINDOW_MS || 120 * 60 * 1000); // 2 hours
const THRESHOLD_USERS = Number(process.env.MONITOR_THRESHOLD_USERS || 10);

type FailMap = Map<string, number>; // userId -> lastFailureTsMs

class ServiceMonitor {
    private failures: FailMap = new Map();
    // optional explicit flag but not strictly necessary; derive from failures
    // keep lastSuccessTs to allow logic if needed
    private lastSuccessTs = 0;

    private cleanup() {
        const now = Date.now();
        for (const [u, ts] of this.failures) {
            if (ts + WINDOW_MS < now) {
                this.failures.delete(u);
                devLog('ServiceMonitor', `cleanup: process=${u} removed`);
            }
        }
    }

    recordFailure(userId: string) {
        if (!userId) userId = 'unknown';
        this.failures.set(userId, Date.now());
        this.cleanup();
        devLog('ServiceMonitor', `recordFailure: user=${userId}, totalFailures=${this.failures.size}, isDown=${this.isDown()}`);
    }

    recordSuccess() {
        // first success disables the aviso immediately
        this.failures.clear();
        this.lastSuccessTs = Date.now();
        devLog('ServiceMonitor', `recordSuccess: cleared failures, isDown=${this.isDown()}`);
    }

    isDown(): boolean {
        devLog('ServiceMonitor', `isDown check: totalFailures=${this.failures.size}`);
        this.cleanup();
        return this.failures.size >= THRESHOLD_USERS;
    }

    // debug helper
    snapshot() {
        this.cleanup();
        return {
            windowMs: WINDOW_MS,
            thresholdUsers: THRESHOLD_USERS,
            failuresCount: this.failures.size,
            failedUsers: Array.from(this.failures.keys()).slice(0, 200),
            lastSuccessTs: this.lastSuccessTs || null,
            now: Date.now(),
            isDown: this.isDown(),
        };
    }
}

export const serviceMonitor = new ServiceMonitor();
