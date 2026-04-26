'use client'
import { useState } from 'react'

interface ConfirmDialogProps {
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'default' | 'warning' | 'danger'
    onConfirm: () => void
    onCancel: () => void
}

const variantStyles = {
    default: {
        icon: '?',
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        button: 'bg-blue-600 hover:bg-blue-700',
    },
    warning: {
        icon: '!',
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        button: 'bg-amber-600 hover:bg-amber-700',
    },
    danger: {
        icon: '!!',
        bg: 'bg-red-100',
        text: 'text-red-700',
        button: 'bg-red-600 hover:bg-red-700',
    },
}

export function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    if (!open) return null

    const style = variantStyles[variant]

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
                onClick={onCancel}
            />

            {/* Dialog */}
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 animate-fade-in">
                <div className="flex items-start gap-4 mb-4">
                    <div className={`w-10 h-10 rounded-full ${style.bg} ${style.text} flex items-center justify-center font-bold text-lg flex-shrink-0`}>
                        {style.icon}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                        <p className="mt-1 text-sm text-gray-600 leading-relaxed">{message}</p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${style.button} transition-colors`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
