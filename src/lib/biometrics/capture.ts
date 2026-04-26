/**
 * Behavioral Biometrics Capture Module
 * Captures implicit cognitive signals during question answering.
 * Only derived metrics are stored ΓÇö no raw coordinates for privacy.
 */

export interface BiometricsSummary {
    mouseJitterScore: number       // Direction changes per second (0 = still, high = agitated)
    scrollHesitationCount: number  // Scroll-stop-scroll cycles
    dwellTimeMs: number            // Total time with question visible
    focusLossCount: number         // Tab/window blur events
    keystrokeVarianceMs: number    // Variance in inter-key intervals (text answers)
    timeToFirstInteractionMs: number // Time from render to first mouse/key/scroll
    revisionCount: number          // Answer changes before submit
}

type EventRecord = { ts: number; type: string; value?: number }

export class BiometricsCapture {
    private startTime = 0
    private events: EventRecord[] = []
    private mouseDirectionChanges = 0
    private lastMouseAngle: number | null = null
    private scrollStops = 0
    private isScrolling = false
    private scrollTimer: ReturnType<typeof setTimeout> | null = null
    private focusLossCount = 0
    private keyIntervals: number[] = []
    private lastKeyTime = 0
    private revisionCount = 0
    private firstInteractionTime: number | null = null
    private isCapturing = false

    // Bound handlers for cleanup
    private onMouseMove: ((e: MouseEvent) => void) | null = null
    private onScroll: (() => void) | null = null
    private onBlur: (() => void) | null = null
    private onKeyDown: ((e: KeyboardEvent) => void) | null = null

    startCapture(): void {
        this.reset()
        this.startTime = performance.now()
        this.isCapturing = true

        // Mouse jitter tracking
        this.onMouseMove = (e: MouseEvent) => {
            if (!this.isCapturing) return
            if (this.firstInteractionTime === null) {
                this.firstInteractionTime = performance.now()
            }

            const angle = Math.atan2(e.movementY, e.movementX)
            if (this.lastMouseAngle !== null) {
                const delta = Math.abs(angle - this.lastMouseAngle)
                // Direction change threshold: >45 degrees
                if (delta > Math.PI / 4) {
                    this.mouseDirectionChanges++
                }
            }
            this.lastMouseAngle = angle
        }

        // Scroll hesitation tracking
        this.onScroll = () => {
            if (!this.isCapturing) return
            if (this.firstInteractionTime === null) {
                this.firstInteractionTime = performance.now()
            }

            if (!this.isScrolling) {
                this.isScrolling = true
            }
            if (this.scrollTimer) clearTimeout(this.scrollTimer)
            this.scrollTimer = setTimeout(() => {
                if (this.isScrolling) {
                    this.scrollStops++
                    this.isScrolling = false
                }
            }, 300)
        }

        // Focus loss tracking
        this.onBlur = () => {
            if (!this.isCapturing) return
            this.focusLossCount++
        }

        // Keystroke dynamics tracking
        this.onKeyDown = (e: KeyboardEvent) => {
            if (!this.isCapturing) return
            if (this.firstInteractionTime === null) {
                this.firstInteractionTime = performance.now()
            }

            const now = performance.now()
            if (this.lastKeyTime > 0 && !e.repeat) {
                this.keyIntervals.push(now - this.lastKeyTime)
            }
            this.lastKeyTime = now
        }

        document.addEventListener('mousemove', this.onMouseMove, { passive: true })
        document.addEventListener('scroll', this.onScroll, { passive: true })
        window.addEventListener('blur', this.onBlur)
        document.addEventListener('keydown', this.onKeyDown, { passive: true })
    }

    /** Record an answer revision (user changed their selection) */
    recordRevision(): void {
        if (this.isCapturing) {
            this.revisionCount++
        }
    }

    stopCapture(): BiometricsSummary {
        this.isCapturing = false
        const endTime = performance.now()
        const dwellTimeMs = Math.round(endTime - this.startTime)
        const durationSeconds = dwellTimeMs / 1000

        // Cleanup listeners
        if (this.onMouseMove) document.removeEventListener('mousemove', this.onMouseMove)
        if (this.onScroll) document.removeEventListener('scroll', this.onScroll)
        if (this.onBlur) window.removeEventListener('blur', this.onBlur)
        if (this.onKeyDown) document.removeEventListener('keydown', this.onKeyDown)
        if (this.scrollTimer) clearTimeout(this.scrollTimer)

        // Calculate keystroke variance
        let keystrokeVarianceMs = 0
        if (this.keyIntervals.length > 1) {
            const mean = this.keyIntervals.reduce((a, b) => a + b, 0) / this.keyIntervals.length
            const variance = this.keyIntervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (this.keyIntervals.length - 1)
            keystrokeVarianceMs = Math.round(Math.sqrt(variance))
        }

        return {
            mouseJitterScore: durationSeconds > 0 ? Math.round((this.mouseDirectionChanges / durationSeconds) * 100) / 100 : 0,
            scrollHesitationCount: this.scrollStops,
            dwellTimeMs,
            focusLossCount: this.focusLossCount,
            keystrokeVarianceMs,
            timeToFirstInteractionMs: this.firstInteractionTime !== null
                ? Math.round(this.firstInteractionTime - this.startTime)
                : dwellTimeMs, // No interaction = full dwell
            revisionCount: this.revisionCount,
        }
    }

    private reset(): void {
        this.events = []
        this.mouseDirectionChanges = 0
        this.lastMouseAngle = null
        this.scrollStops = 0
        this.isScrolling = false
        this.scrollTimer = null
        this.focusLossCount = 0
        this.keyIntervals = []
        this.lastKeyTime = 0
        this.revisionCount = 0
        this.firstInteractionTime = null
    }
}
