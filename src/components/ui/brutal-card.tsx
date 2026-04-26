import { ReactNode } from 'react'

interface BrutalCardProps {
    children: ReactNode
    className?: string
    hover?: boolean
}

export function BrutalCard({ children, className = '', hover = true }: BrutalCardProps) {
    return (
        <div
            className={`border-2 border-black bg-white shadow-brutal p-6 ${
                hover ? 'transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-hover' : ''
            } ${className}`}
        >
            {children}
        </div>
    )
}
