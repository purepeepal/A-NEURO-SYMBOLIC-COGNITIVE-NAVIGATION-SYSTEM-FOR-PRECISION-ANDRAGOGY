import { ReactNode } from 'react'

type BadgeColor = 'green' | 'red' | 'yellow' | 'blue' | 'gray'

interface BrutalBadgeProps {
    children: ReactNode
    color?: BadgeColor
    className?: string
}

const colorClasses: Record<BadgeColor, string> = {
    green: 'bg-accent-green/20 text-green-800 border-accent-green',
    red: 'bg-accent-red/20 text-red-800 border-accent-red',
    yellow: 'bg-accent-yellow/20 text-yellow-800 border-accent-yellow',
    blue: 'bg-accent-blue/20 text-blue-800 border-accent-blue',
    gray: 'bg-gray-100 text-gray-700 border-gray-400',
}

export function BrutalBadge({ children, color = 'gray', className = '' }: BrutalBadgeProps) {
    return (
        <span
            className={`inline-block border px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${colorClasses[color]} ${className}`}
        >
            {children}
        </span>
    )
}
