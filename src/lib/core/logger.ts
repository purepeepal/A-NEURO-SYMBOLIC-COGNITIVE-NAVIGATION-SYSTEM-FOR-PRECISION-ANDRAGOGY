/**
 * Structured Logger
 * 
 * All production logging goes through this module.
 * Outputs JSON-structured logs with request context.
 * Sentry integration is optional ΓÇö if installed, errors are captured automatically.
 */

type LogLevel = 'info' | 'warn' | 'error'

interface LogContext {
    requestId?: string
    assessmentId?: string
    userId?: string
    [key: string]: unknown
}

interface LogEntry {
    timestamp: string
    level: LogLevel
    message: string
    context?: LogContext
    data?: Record<string, unknown>
    error?: {
        name: string
        message: string
        stack?: string
    }
}

// Sentry integration placeholder — set to null since @sentry/nextjs is not installed.
// To enable: install @sentry/nextjs, then assign: Sentry = await import('@sentry/nextjs')
const Sentry: {
    captureException: (error: unknown, context?: Record<string, unknown>) => void
    addBreadcrumb: (breadcrumb: Record<string, unknown>) => void
} | null = null

function formatLogEntry(entry: LogEntry): string {
    return JSON.stringify(entry)
}

function generateRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export interface Logger {
    info(message: string, data?: Record<string, unknown>): void
    warn(message: string, data?: Record<string, unknown>): void
    error(message: string, error?: unknown, data?: Record<string, unknown>): void
}

/**
 * Create a contextual logger instance.
 * 
 * Usage:
 * ```ts
 * const logger = createLogger({ requestId: 'req_123', assessmentId: 'abc-def' })
 * logger.info('Processing started', { step: 'init' })
 * logger.error('Something failed', error, { questionId: 'q1' })
 * ```
 */
export function createLogger(context: LogContext = {}): Logger {
    const ctx = {
        requestId: context.requestId || generateRequestId(),
        ...context,
    }

    return {
        info(message: string, data?: Record<string, unknown>) {
            const entry: LogEntry = {
                timestamp: new Date().toISOString(),
                level: 'info',
                message,
                context: ctx,
                ...(data && { data }),
            }
            console.log(formatLogEntry(entry))
        },

        warn(message: string, data?: Record<string, unknown>) {
            const entry: LogEntry = {
                timestamp: new Date().toISOString(),
                level: 'warn',
                message,
                context: ctx,
                ...(data && { data }),
            }
            console.log(formatLogEntry(entry))

            // Sentry breadcrumb for warns
            if (Sentry) {
                Sentry.addBreadcrumb({
                    category: 'warning',
                    message,
                    level: 'warning',
                    data: { ...ctx, ...data },
                })
            }
        },

        error(message: string, error?: unknown, data?: Record<string, unknown>) {
            const errObj = error instanceof Error
                ? { name: error.name, message: error.message, stack: error.stack }
                : error
                    ? { name: 'UnknownError', message: String(error) }
                    : undefined

            const entry: LogEntry = {
                timestamp: new Date().toISOString(),
                level: 'error',
                message,
                context: ctx,
                ...(data && { data }),
                ...(errObj && { error: errObj }),
            }
            console.log(formatLogEntry(entry))

            // Sentry capture for errors
            if (Sentry && error) {
                Sentry.captureException(error, {
                    extra: { ...ctx, ...data },
                    tags: {
                        ...(ctx.assessmentId && { assessmentId: ctx.assessmentId as string }),
                    },
                })
            }
        },
    }
}

/**
 * Module-level logger for use in non-request contexts (e.g., utility modules).
 */
export const rootLogger = createLogger({ requestId: 'system' })
