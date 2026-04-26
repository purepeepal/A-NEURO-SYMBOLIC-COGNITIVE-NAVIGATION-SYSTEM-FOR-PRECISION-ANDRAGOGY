import { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger'

interface BrutalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode
    variant?: ButtonVariant
}

const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-black text-white hover:bg-white hover:text-black hover:shadow-brutal-sm',
    secondary: 'bg-white text-black hover:bg-black hover:text-white hover:shadow-brutal-sm',
    danger: 'bg-accent-red text-white hover:bg-red-700 hover:shadow-brutal-sm',
}

export function BrutalButton({
    children,
    variant = 'primary',
    className = '',
    ...props
}: BrutalButtonProps) {
    return (
        <button
            className={`border-2 border-black uppercase font-bold tracking-wider px-6 py-3 transition-all ${variantClasses[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    )
}
