/**
 * Rate-Limited Request Queue for Gemini API
 * Handles the 15 RPM limit of free tier gracefully
 */

interface QueuedRequest<T> {
    id: string
    execute: () => Promise<T>
    resolve: (value: T) => void
    reject: (error: Error) => void
    priority: number
    addedAt: number
}

class RateLimitedQueue {
    private queue: QueuedRequest<any>[] = []
    private processing = false
    private requestTimestamps: number[] = []
    private readonly maxRequestsPerMinute: number
    private readonly minIntervalMs: number

    constructor(maxRequestsPerMinute: number = 15) {
        this.maxRequestsPerMinute = maxRequestsPerMinute
        this.minIntervalMs = (60 * 1000) / maxRequestsPerMinute // ~4000ms between requests
    }

    /**
     * Add a request to the queue with priority
     * Lower priority number = higher priority
     */
    async enqueue<T>(
        execute: () => Promise<T>,
        priority: number = 5
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            const request: QueuedRequest<T> = {
                id: crypto.randomUUID(),
                execute,
                resolve,
                reject,
                priority,
                addedAt: Date.now(),
            }

            // Insert in priority order
            const insertIndex = this.queue.findIndex(r => r.priority > priority)
            if (insertIndex === -1) {
                this.queue.push(request)
            } else {
                this.queue.splice(insertIndex, 0, request)
            }

            this.processQueue()
        })
    }

    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) return

        this.processing = true

        while (this.queue.length > 0) {
            // Wait if rate limited
            const waitTime = this.getWaitTime()
            if (waitTime > 0) {
                await this.sleep(waitTime)
            }

            const request = this.queue.shift()
            if (!request) break

            try {
                this.requestTimestamps.push(Date.now())
                this.cleanOldTimestamps()

                const result = await request.execute()
                request.resolve(result)
            } catch (error) {
                request.reject(error instanceof Error ? error : new Error(String(error)))
            }

            // Minimum delay between requests
            await this.sleep(this.minIntervalMs)
        }

        this.processing = false
    }

    private getWaitTime(): number {
        this.cleanOldTimestamps()

        if (this.requestTimestamps.length < this.maxRequestsPerMinute) {
            return 0
        }

        const oldestInWindow = this.requestTimestamps[0]
        const windowEnd = oldestInWindow + 60 * 1000
        return Math.max(0, windowEnd - Date.now())
    }

    private cleanOldTimestamps(): void {
        const oneMinuteAgo = Date.now() - 60 * 1000
        this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneMinuteAgo)
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    /**
     * Get queue status for debugging
     */
    getStatus() {
        return {
            queueLength: this.queue.length,
            requestsInLastMinute: this.requestTimestamps.length,
            isProcessing: this.processing,
        }
    }
}

// Singleton instance
export const llmQueue = new RateLimitedQueue(15)

export { RateLimitedQueue }
