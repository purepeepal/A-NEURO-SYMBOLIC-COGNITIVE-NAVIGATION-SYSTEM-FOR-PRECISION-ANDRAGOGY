'use client'
import React, { Component, ReactNode } from 'react'

interface ErrorBoundaryProps {
    children: ReactNode
    fallback?: ReactNode
    onReset?: () => void
    context?: string
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Sentry integration placeholder — @sentry/nextjs is not installed.
        // To enable: install @sentry/nextjs, uncomment the import, and call captureException here.

        console.error(`[ErrorBoundary${this.props.context ? `:${this.props.context}` : ''}]`, error, errorInfo)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
        this.props.onReset?.()
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className="border-2 border-black bg-white p-8 shadow-brutal text-center">
                    <div className="text-4xl mb-4">ΓÜá∩╕Å</div>
                    <h2 className="text-xl font-black uppercase tracking-tight mb-2">
                        Something went wrong
                    </h2>
                    <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                        {this.state.error?.message || 'An unexpected error occurred while rendering this section.'}
                    </p>
                    <button
                        onClick={this.handleReset}
                        className="border-2 border-black px-6 py-3 font-black uppercase tracking-wider text-sm hover:bg-black hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                    >
                        Try Again
                    </button>
                    {this.props.context && (
                        <p className="text-xs text-gray-400 mt-4 font-mono">
                            Section: {this.props.context}
                        </p>
                    )}
                </div>
            )
        }

        return this.props.children
    }
}
