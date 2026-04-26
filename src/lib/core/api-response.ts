/**
 * Standardized API Response Utilities
 * 
 * All API routes return a consistent envelope:
 *   Success: { data: T }
 *   Error:   { error: { code: string, message: string, requestId?: string, details?: unknown } }
 */
import { NextResponse } from 'next/server'

interface ErrorEnvelope {
    error: {
        code: string
        message: string
        requestId?: string
        details?: unknown
    }
}

interface SuccessEnvelope<T> {
    data: T
}

/**
 * Generate a short request ID for tracing.
 */
function generateRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Create a standardized error response.
 * 
 * @param code - Machine-readable error code (e.g., 'ASSESSMENT_NOT_FOUND')
 * @param message - Human-readable error message
 * @param status - HTTP status code (default: 500)
 * @param details - Optional additional context
 */
export function errorResponse(
    code: string,
    message: string,
    status: number = 500,
    details?: unknown
): NextResponse<ErrorEnvelope> {
    return NextResponse.json(
        {
            error: {
                code,
                message,
                requestId: generateRequestId(),
                ...(details !== undefined && { details }),
            },
        },
        { status }
    )
}

/**
 * Create a standardized success response.
 * 
 * @param data - The response payload
 * @param status - HTTP status code (default: 200)
 */
export function successResponse<T>(
    data: T,
    status: number = 200
): NextResponse<SuccessEnvelope<T>> {
    return NextResponse.json({ data }, { status })
}
